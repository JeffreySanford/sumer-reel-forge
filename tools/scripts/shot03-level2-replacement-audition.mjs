import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { analyzeTransparentEyeLayerAppearance } from '../animation/src/level2-eye-artifact-leak-proof.mjs';

const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const TARGET_LAYER_ID = 'shot03-enki-eyes-v1';
const RIGGING_LAYER_ID = 'shot03-rigging-v1';
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const replacement = await newestPassingReplacement();
  if (!replacement) {
    throw new Error(
      'No QA-passed Shot 3 closed-eye replacement candidate exists. Generate one before auditioning it.',
    );
  }

  const { runDirectory, run, candidate } = replacement;
  const actualChecksum = prefixedSha(await readFile(candidate.candidatePath));
  if (
    candidate.candidateChecksum &&
    normalizeSha(candidate.candidateChecksum) !== normalizeSha(actualChecksum)
  ) {
    throw new Error(
      `Selected eye candidate checksum changed before audition: expected ${candidate.candidateChecksum}, got ${actualChecksum}.`,
    );
  }

  console.log('Shot 3 Level 2 replacement audition');
  console.log(`[trace] selected eye asset source path: ${candidate.candidatePath}`);
  console.log(`[trace] selected eye asset checksum: ${actualChecksum}`);
  console.log(`[trace] selected variant: ${candidate.variant?.id ?? run.selectedVariant ?? 'unknown'}`);
  if (candidate.groundingReportPath) {
    console.log(`[trace] grounding report: ${candidate.groundingReportPath}`);
    console.log(`[trace] grounding checksum: ${candidate.groundingReportChecksum ?? 'missing'}`);
  }

  const inspection = await inspectCandidateBeforeRender({ runDirectory, candidate });
  console.log(
    `[${inspection.appearance.pass ? 'ok' : 'BLOCKED'}] pre-render RGB proof: cyan ${(inspection.appearance.metrics.cyanLikeRatio * 100).toFixed(1)}% · dominant ${(inspection.appearance.metrics.dominantQuantizedRatio * 100).toFixed(1)}% · texture Δ ${inspection.appearance.metrics.meanNeighborDelta.toFixed(1)}`,
  );
  console.log(`[info] pre-render eye inspection sheet: ${inspection.contactSheetPath}`);
  console.log(`[info] pre-render eye inspection report: ${inspection.reportPath}`);
  if (!inspection.appearance.pass) {
    for (const failure of inspection.appearance.failures) console.log(`[BLOCKED] ${failure}`);
    throw new Error(
      'Selected eye candidate looks like a flat/debug-colored mask before Remotion. Renderer was not started.',
    );
  }

  const compatibleRun = {
    ...run,
    candidates: (run.candidates ?? []).map((item) =>
      item === candidate ? { ...item, layerId: TARGET_LAYER_ID } : item,
    ),
  };
  await writeFile(
    join(runDirectory, 'candidate-run.json'),
    `${JSON.stringify(compatibleRun, null, 2)}\n`,
    'utf8',
  );

  const qaPath = join(runDirectory, `${TARGET_LAYER_ID}-replacement-eye-state-qa.json`);
  const metrics = candidate.eyeStateProof.metrics;
  await writeFile(
    qaPath,
    `${JSON.stringify(
      {
        schemaVersion: 2,
        type: 'character-state-replacement-eye-state-proof',
        layerId: TARGET_LAYER_ID,
        candidatePath: candidate.candidatePath,
        candidateChecksum: actualChecksum,
        pass: true,
        qaStatus: 'PASS',
        coverageAdvisory: `eye-band ${(metrics.eyeBandFillRatio * 100).toFixed(2)}% alpha / ${(metrics.opaqueEyeBandFillRatio * 100).toFixed(2)}% opaque`,
        metrics,
        preRenderAppearanceProof: {
          pass: inspection.appearance.pass,
          reportPath: inspection.reportPath,
          contactSheetPath: inspection.contactSheetPath,
        },
        sourceManifestChecksum: candidate.sourceManifestChecksum,
        currentCanonicalChecksum: candidate.currentCanonicalChecksum,
        automaticPromotionAllowed: false,
        humanReviewRequired: true,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  console.log(`[ok] replacement run: ${runDirectory}`);
  console.log(`[ok] candidate: ${candidate.candidatePath}`);
  console.log('[ok] eye-state proof: PASS');
  console.log('[info] staging candidate metadata under tmp only; canonical assets remain untouched.');
  console.log('[info] rendering normal-speed approved rigging + replacement blink audition...');

  await runInherited('pnpm', [
    'exec',
    'tsx',
    'tools/scripts/render-shot03-level2-candidate-preview.ts',
    `--layer=${RIGGING_LAYER_ID}`,
    `--layer=${TARGET_LAYER_ID}`,
  ]);
}

async function inspectCandidateBeforeRender({ runDirectory, candidate }) {
  const candidateBytes = await readFile(candidate.candidatePath);
  const dimensions = readPngDimensions(candidateBytes, 'selected eye candidate');
  const rgba = decodeRgba(candidate.candidatePath, dimensions);
  const appearance = analyzeTransparentEyeLayerAppearance({ stateRgba: rgba, dimensions });
  const directory = join(runDirectory, 'pre-render-eye-inspection');
  await mkdir(directory, { recursive: true });
  const whitePath = join(directory, 'candidate-on-white.png');
  const alphaPath = join(directory, 'candidate-alpha.png');
  const contactSheetPath = join(directory, 'candidate-pre-render-contact-sheet.png');
  const reportPath = join(directory, 'candidate-pre-render-appearance.json');

  runFfmpeg([
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'lavfi', '-i', `color=c=white:s=${dimensions.width}x${dimensions.height}`,
    '-i', candidate.candidatePath,
    '-filter_complex', '[0:v][1:v]overlay=0:0:format=auto,format=rgb24[out]',
    '-map', '[out]', '-frames:v', '1', '-update', '1', whitePath,
  ]);
  runFfmpeg([
    '-y', '-hide_banner', '-loglevel', 'error', '-i', candidate.candidatePath,
    '-vf', 'alphaextract', '-frames:v', '1', '-update', '1', alphaPath,
  ]);

  const visualInputs = [
    candidate.reviewArtifacts?.compositePath,
    whitePath,
    alphaPath,
  ].filter(Boolean);
  for (const path of visualInputs) await access(path);
  const inputs = visualInputs.flatMap((path) => ['-i', path]);
  const filters = visualInputs
    .map((_path, index) => `[${index}:v]scale=-2:420:flags=lanczos[p${index}]`)
    .join(';');
  const stack = visualInputs.map((_path, index) => `[p${index}]`).join('');
  runFfmpeg([
    '-y', '-hide_banner', '-loglevel', 'error', ...inputs,
    '-filter_complex', `${filters};${stack}hstack=inputs=${visualInputs.length}[out]`,
    '-map', '[out]', '-frames:v', '1', '-update', '1', contactSheetPath,
  ]);

  await writeFile(
    reportPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        type: 'shot03-pre-render-eye-candidate-appearance-proof',
        candidatePath: candidate.candidatePath,
        candidateChecksum: prefixedSha(candidateBytes),
        groundedEyeBoxes: candidate.groundedEyeBoxes ?? null,
        appearance,
        artifacts: { contactSheetPath, whitePath, alphaPath },
        canonicalMutated: false,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  return { appearance, contactSheetPath, reportPath };
}

async function newestPassingReplacement() {
  let entries = [];
  try {
    entries = await readdir(CANDIDATE_ROOT, { withFileTypes: true });
  } catch {
    return null;
  }

  const directories = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => join(CANDIDATE_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));

  for (const runDirectory of directories) {
    try {
      const run = JSON.parse(
        await readFile(join(runDirectory, 'candidate-run.json'), 'utf8'),
      );
      if (run.type !== 'shot03-character-state-replacement-candidate') continue;
      const candidate = (run.candidates ?? []).find(
        (item) => item.replacementForLayerId === TARGET_LAYER_ID,
      );
      if (!candidate?.candidatePath || candidate.eyeStateProof?.pass !== true) continue;
      if (candidate.semanticEyeStateProof && candidate.semanticEyeStateProof.pass !== true) continue;
      await access(candidate.candidatePath);
      return { runDirectory, run, candidate };
    } catch {
      continue;
    }
  }
  return null;
}

function decodeRgba(path, dimensions) {
  const result = spawnSync(
    FFMPEG,
    [
      '-hide_banner', '-loglevel', 'error', '-i', path,
      '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1',
    ],
    { encoding: null, maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Could not decode ${path}.`);
  const expected = dimensions.width * dimensions.height * 4;
  if (result.stdout.length !== expected) {
    throw new Error(`Decoded ${path} to ${result.stdout.length} bytes; expected ${expected}.`);
  }
  return new Uint8Array(result.stdout);
}

function readPngDimensions(bytes, label) {
  if (
    bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e || bytes[3] !== 0x47
  ) {
    throw new Error(`${label} is not a PNG.`);
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function runFfmpeg(args) {
  const result = spawnSync(FFMPEG, args, {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed: ${result.stderr || result.stdout}`);
  }
}

function prefixedSha(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function normalizeSha(value) {
  return String(value ?? '').replace(/^sha256:/i, '').toLowerCase();
}

async function runInherited(command, args) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: resolve('.'),
      env: process.env,
      shell: process.platform === 'win32',
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', rejectPromise);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(
        new Error(
          `${command} failed with ${signal ? `signal ${signal}` : `exit code ${code ?? 'unknown'}`}.`,
        ),
      );
    });
  });
}
