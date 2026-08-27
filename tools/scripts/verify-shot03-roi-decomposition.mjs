import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { maybeOpenReviewArtifacts } from './open-review-artifacts.mjs';
import { reviewGeneratedMedia } from './review-generated-media.mjs';

const ROOT = resolve('.');
const WORK_ROOT = resolve('tmp/animation-assets/resegmentation/shot03-roi-search');
const SOURCE_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-03.png',
);
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const WIDTH = 941;
const HEIGHT = 1672;
const PIXELS = WIDTH * HEIGHT;
const STRONG_ALPHA = 128;
const AI_REVIEW = !process.argv.includes('--no-ai-review');
const REQUIRE_AI_REVIEW = process.argv.includes('--require-ai-review');

await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const reportPath = await latestSearchReport();
  const runDirectory = resolve(reportPath, '..');
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  const vessel = report.ranked?.vessel?.[0];
  const enki = report.ranked?.enki?.[0];
  if (!vessel?.registeredPath || !enki?.registeredPath) {
    throw new Error('Latest ROI report does not contain top vessel and Enki candidates.');
  }

  const vesselPath = resolve(vessel.registeredPath);
  const enkiPath = resolve(enki.registeredPath);
  for (const path of [SOURCE_PATH, vesselPath, enkiPath]) {
    if (!existsSync(path)) throw new Error(`Required decomposition input is missing: ${path}`);
  }

  const proofDirectory = join(runDirectory, 'decomposition-proof');
  await mkdir(proofDirectory, { recursive: true });
  const unionMaskPath = join(proofDirectory, 'shot03-vessel-enki-union-mask.png');
  const cutoutPlatePath = join(proofDirectory, 'shot03-source-cutout-plate.png');
  const recomposedPath = join(proofDirectory, 'shot03-static-recomposition.png');
  const diffPath = join(proofDirectory, 'shot03-source-vs-recomposition-diff.png');
  const sheetPath = join(proofDirectory, 'shot03-decomposition-proof-sheet.png');

  console.log('Shot 3 ROI static decomposition fidelity proof');
  console.log(`Source: ${SOURCE_PATH}`);
  console.log(`Vessel: ${vesselPath}`);
  console.log(`Enki: ${enkiPath}`);
  console.log('Policy: existing source-backed candidates only; no SAM generation and no canonical mutation.');
  console.log('');

  createUnionMask(vesselPath, enkiPath, unionMaskPath);
  createCutoutPlate(SOURCE_PATH, unionMaskPath, cutoutPlatePath);
  createRecomposition(cutoutPlatePath, vesselPath, enkiPath, recomposedPath);
  createDiff(SOURCE_PATH, recomposedPath, diffPath);
  createProofSheet(SOURCE_PATH, recomposedPath, diffPath, sheetPath);

  const sourceRgb = decodeRgb(SOURCE_PATH);
  const recomposedRgb = decodeRgb(recomposedPath);
  const recompositionMetrics = compareRgb(sourceRgb, recomposedRgb);
  const vesselFidelity = compareCandidateToSource(vesselPath, sourceRgb);
  const enkiFidelity = compareCandidateToSource(enkiPath, sourceRgb);

  const technicalPass =
    recompositionMetrics.meanAbsoluteChannelDelta <= 0.5 &&
    recompositionMetrics.changedPixelRatioOver4 <= 0.01 &&
    vesselFidelity.strongAlphaRgbMismatchRatioOver4 <= 0.01 &&
    enkiFidelity.strongAlphaRgbMismatchRatioOver4 <= 0.01;

  console.log('[DETERMINISTIC]');
  console.log(
    `  recomposition mean abs channel delta=${recompositionMetrics.meanAbsoluteChannelDelta.toFixed(4)} · pixels delta>4=${(recompositionMetrics.changedPixelRatioOver4 * 100).toFixed(4)}% · max=${recompositionMetrics.maxChannelDelta}`,
  );
  console.log(
    `  vessel strong-alpha source mismatch>4=${(vesselFidelity.strongAlphaRgbMismatchRatioOver4 * 100).toFixed(4)}% · mean=${vesselFidelity.meanAbsoluteChannelDelta.toFixed(4)}`,
  );
  console.log(
    `  Enki strong-alpha source mismatch>4=${(enkiFidelity.strongAlphaRgbMismatchRatioOver4 * 100).toFixed(4)}% · mean=${enkiFidelity.meanAbsoluteChannelDelta.toFixed(4)}`,
  );
  console.log(`  technical source-fidelity gate: ${technicalPass ? 'PASS' : 'FAIL'}`);

  const receiptPath = join(proofDirectory, 'shot03-decomposition-proof.json');
  const receipt = {
    schemaVersion: 1,
    type: 'shot03-roi-static-decomposition-proof',
    generatedAt: new Date().toISOString(),
    sourceSearchReportPath: reportPath,
    sourcePath: SOURCE_PATH,
    sourceDimensions: { width: WIDTH, height: HEIGHT },
    vessel: {
      path: vesselPath,
      padding: vessel.padding,
      threshold: vessel.threshold,
      structuralRisk: vessel.structuralRisk,
      sourceFidelity: vesselFidelity,
    },
    enki: {
      path: enkiPath,
      padding: enki.padding,
      threshold: enki.threshold,
      structuralRisk: enki.structuralRisk,
      sourceFidelity: enkiFidelity,
    },
    recompositionMetrics,
    technicalSourceFidelityPass: technicalPass,
    artifacts: {
      unionMask: unionMaskPath,
      cutoutPlate: cutoutPlatePath,
      recomposed: recomposedPath,
      diff: diffPath,
      proofSheet: sheetPath,
    },
    policy: {
      sourcePixelsAreAuthority: true,
      noRegeneration: true,
      canonicalAssetsMutated: false,
      canonicalManifestMutated: false,
      automaticPromotionAllowed: false,
      humanReviewRequired: true,
    },
  };
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');

  let ai = null;
  if (AI_REVIEW) {
    const aiPath = join(proofDirectory, 'ollama-decomposition-proof-review.json');
    ai = await reviewGeneratedMedia({
      artifacts: [
        { path: SOURCE_PATH, label: 'approved editorial source' },
        { path: recomposedPath, label: 'static recomposition from cutout plate plus vessel and Enki layers' },
        { path: diffPath, label: 'absolute RGB difference between editorial source and static recomposition' },
        { path: vesselPath, label: 'top vessel extraction' },
        { path: enkiPath, label: 'top Enki extraction' },
      ],
      task: [
        'Review this as a source-preserving decomposition proof, not an animation proof.',
        'The editorial source is authoritative.',
        'The recomposed frame should visually match the editorial source, with no duplicate, missing, shifted, ghosted, or contaminated subject pixels.',
        `Deterministic recomposition evidence: ${JSON.stringify(recompositionMetrics)}.`,
        `Vessel source-fidelity evidence: ${JSON.stringify(vesselFidelity)}.`,
        `Enki source-fidelity evidence: ${JSON.stringify(enkiFidelity)}.`,
        `Deterministic technical source-fidelity gate: ${technicalPass ? 'PASS' : 'FAIL'}.`,
        'Do not override a deterministic FAIL. PASS_ADVISORY only means suitable for human review before background inpainting.',
      ].join(' '),
      rubric: [
        'static recomposition matches editorial source',
        'no duplicated or missing vessel/character regions',
        'no registration shift or halo',
        'extracted layers preserve editorial RGB identity',
        'difference image is visually negligible when deterministic metrics are also passing',
      ],
      outputPath: aiPath,
      requireAi: REQUIRE_AI_REVIEW,
      maxVideoSamples: 1,
    });
    receipt.aiReviewPath = aiPath;
    receipt.ai = ai;
    await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  } else {
    console.log('[ai] decomposition visual review skipped by --no-ai-review');
  }

  console.log('');
  console.log(`[REVIEW] proof sheet: ${sheetPath}`);
  console.log(`[REVIEW] recomposed frame: ${recomposedPath}`);
  console.log(`[INFO] receipt: ${receiptPath}`);
  if (ai?.status) console.log(`[INFO] local vision status: ${ai.status}`);
  if (technicalPass) {
    console.log('[NEXT] Source-fidelity decomposition is technically credible; human visual review of the proof sheet remains required before background inpainting.');
  } else {
    console.log('[STOP] Static decomposition does not yet reproduce the editorial source closely enough for background inpainting.');
  }

  await maybeOpenReviewArtifacts([sheetPath, recomposedPath], { delayMs: 120 });
}

async function latestSearchReport() {
  const entries = await readdir(WORK_ROOT, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(WORK_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  for (const directory of directories) {
    const path = join(directory, 'shot03-roi-segmentation-search.json');
    if (existsSync(path)) return path;
  }
  throw new Error(`No completed ROI search report found under ${WORK_ROOT}.`);
}

function createUnionMask(vesselPath, enkiPath, outputPath) {
  runFfmpeg([
    '-i', vesselPath,
    '-i', enkiPath,
    '-filter_complex',
    "[0:v]alphaextract[a];[1:v]alphaextract[b];[a][b]blend=all_expr='max(A,B)',format=gray[mask]",
    '-map', '[mask]',
    '-frames:v', '1',
    outputPath,
  ]);
}

function createCutoutPlate(sourcePath, maskPath, outputPath) {
  runFfmpeg([
    '-i', sourcePath,
    '-i', maskPath,
    '-filter_complex',
    '[0:v]format=rgb24[src];[1:v]format=gray,negate[keep];[src][keep]alphamerge[out]',
    '-map', '[out]',
    '-frames:v', '1',
    outputPath,
  ]);
}

function createRecomposition(platePath, vesselPath, enkiPath, outputPath) {
  runFfmpeg([
    '-f', 'lavfi',
    '-i', `color=c=black@0.0:s=${WIDTH}x${HEIGHT}:d=1`,
    '-i', platePath,
    '-i', vesselPath,
    '-i', enkiPath,
    '-filter_complex',
    '[0:v]format=rgba,colorchannelmixer=aa=0[base];[1:v]format=rgba[plate];[2:v]format=rgba[vessel];[3:v]format=rgba[enki];[base][plate]overlay=format=auto[a];[a][vessel]overlay=format=auto[b];[b][enki]overlay=format=auto[out]',
    '-map', '[out]',
    '-frames:v', '1',
    outputPath,
  ]);
}

function createDiff(sourcePath, recomposedPath, outputPath) {
  runFfmpeg([
    '-i', sourcePath,
    '-i', recomposedPath,
    '-filter_complex',
    '[0:v]format=rgb24[src];[1:v]format=rgb24[re];[src][re]blend=all_mode=difference,eq=contrast=4:brightness=0.05[out]',
    '-map', '[out]',
    '-frames:v', '1',
    outputPath,
  ]);
}

function createProofSheet(sourcePath, recomposedPath, diffPath, outputPath) {
  runFfmpeg([
    '-i', sourcePath,
    '-i', recomposedPath,
    '-i', diffPath,
    '-filter_complex',
    '[0:v]scale=313:557:flags=lanczos[s];[1:v]scale=313:557:flags=lanczos[r];[2:v]scale=313:557:flags=neighbor[d];[s][r][d]hstack=inputs=3[out]',
    '-map', '[out]',
    '-frames:v', '1',
    outputPath,
  ]);
}

function compareCandidateToSource(candidatePath, sourceRgb) {
  const candidate = decodeRgba(candidatePath);
  let strongAlphaPixels = 0;
  let mismatchPixels = 0;
  let channelDeltaSum = 0;
  let channelCount = 0;
  let maxChannelDelta = 0;
  for (let pixel = 0; pixel < PIXELS; pixel += 1) {
    const alpha = candidate[pixel * 4 + 3];
    if (alpha <= STRONG_ALPHA) continue;
    strongAlphaPixels += 1;
    let pixelMax = 0;
    for (let channel = 0; channel < 3; channel += 1) {
      const delta = Math.abs(candidate[pixel * 4 + channel] - sourceRgb[pixel * 3 + channel]);
      channelDeltaSum += delta;
      channelCount += 1;
      pixelMax = Math.max(pixelMax, delta);
      maxChannelDelta = Math.max(maxChannelDelta, delta);
    }
    if (pixelMax > 4) mismatchPixels += 1;
  }
  return {
    strongAlphaPixels,
    strongAlphaCoverage: strongAlphaPixels / PIXELS,
    strongAlphaRgbMismatchPixelsOver4: mismatchPixels,
    strongAlphaRgbMismatchRatioOver4: strongAlphaPixels ? mismatchPixels / strongAlphaPixels : 1,
    meanAbsoluteChannelDelta: channelCount ? channelDeltaSum / channelCount : 255,
    maxChannelDelta,
  };
}

function compareRgb(a, b) {
  if (a.length !== b.length) throw new Error('RGB buffers differ in length.');
  let channelDeltaSum = 0;
  let maxChannelDelta = 0;
  let changedPixelsOver4 = 0;
  for (let pixel = 0; pixel < PIXELS; pixel += 1) {
    let pixelMax = 0;
    for (let channel = 0; channel < 3; channel += 1) {
      const index = pixel * 3 + channel;
      const delta = Math.abs(a[index] - b[index]);
      channelDeltaSum += delta;
      pixelMax = Math.max(pixelMax, delta);
      maxChannelDelta = Math.max(maxChannelDelta, delta);
    }
    if (pixelMax > 4) changedPixelsOver4 += 1;
  }
  return {
    meanAbsoluteChannelDelta: channelDeltaSum / a.length,
    maxChannelDelta,
    changedPixelsOver4,
    changedPixelRatioOver4: changedPixelsOver4 / PIXELS,
  };
}

function decodeRgb(path) {
  return decodeRaw(path, 'rgb24', PIXELS * 3);
}

function decodeRgba(path) {
  return decodeRaw(path, 'rgba', PIXELS * 4);
}

function decodeRaw(path, pixelFormat, expectedBytes) {
  const result = spawnSync(
    FFMPEG,
    ['-hide_banner', '-loglevel', 'error', '-i', path, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', pixelFormat, 'pipe:1'],
    { cwd: ROOT, encoding: null, maxBuffer: 32 * 1024 * 1024, windowsHide: true, shell: false },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg could not decode ${path}: ${String(result.stderr ?? '').trim()}`);
  }
  if (!Buffer.isBuffer(result.stdout) || result.stdout.length !== expectedBytes) {
    throw new Error(`${path} decoded to ${result.stdout?.length ?? 0} bytes; expected ${expectedBytes}.`);
  }
  return result.stdout;
}

function runFfmpeg(args) {
  const result = spawnSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`FFmpeg failed with exit ${result.status ?? 'unknown'}: ${result.stderr || result.stdout}`);
  }
}
