import { spawn } from 'node:child_process';
import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const TARGET_LAYER_ID = 'shot03-enki-eyes-v1';
const RIGGING_LAYER_ID = 'shot03-rigging-v1';

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
        schemaVersion: 1,
        type: 'character-state-replacement-eye-state-proof',
        layerId: TARGET_LAYER_ID,
        candidatePath: candidate.candidatePath,
        pass: true,
        qaStatus: 'PASS',
        coverageAdvisory: `eye-band ${(metrics.eyeBandFillRatio * 100).toFixed(2)}% alpha / ${(metrics.opaqueEyeBandFillRatio * 100).toFixed(2)}% opaque`,
        metrics,
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

  console.log('Shot 3 Level 2 replacement audition');
  console.log(`[ok] replacement run: ${runDirectory}`);
  console.log(`[ok] candidate: ${candidate.candidatePath}`);
  console.log(`[ok] eye-state proof: PASS`);
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
      await access(candidate.candidatePath);
      return { runDirectory, run, candidate };
    } catch {
      continue;
    }
  }
  return null;
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
