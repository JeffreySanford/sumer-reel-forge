import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { maybeOpenReviewArtifacts } from './open-review-artifacts.mjs';
import { reviewGeneratedMedia } from './review-generated-media.mjs';

const ROOT = resolve('.');
const ROI_ROOT = resolve('tmp/animation-assets/resegmentation/shot03-roi-search');
const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const SOURCE_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-03.png',
);
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const WIDTH = 941;
const HEIGHT = 1672;
const PIXELS = WIDTH * HEIGHT;
const STRONG_ALPHA = 128;
const OPAQUE_ALPHA = 245;

const options = parseOptions(process.argv.slice(2));

await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  console.log('Shot 3 ROI static full-layer recomposition gate');
  console.log('Composition: repaired background + ROI vessel + ROI Enki.');
  console.log('Water/rigging remain source-baked in the repaired background for this recovery proof.');
  console.log('Policy: no canonical mutation, no promotion, no motion activation.');
  console.log('');

  const roiReportPath = await latestRoiReport();
  const roiReport = JSON.parse(await readFile(roiReportPath, 'utf8'));
  const vessel = roiReport.ranked?.vessel?.[0];
  const enki = roiReport.ranked?.enki?.[0];
  if (!vessel?.registeredPath || !enki?.registeredPath) {
    throw new Error('Latest ROI report does not contain top vessel and Enki candidates.');
  }
  const vesselPath = resolve(vessel.registeredPath);
  const enkiPath = resolve(enki.registeredPath);

  const decompositionPath = join(
    resolve(roiReportPath, '..'),
    'decomposition-proof',
    'shot03-decomposition-proof.json',
  );
  if (!existsSync(decompositionPath)) {
    throw new Error(
      `Static source-fidelity proof is missing: ${decompositionPath}. Run shot03-roi-background-auto.mjs first.`,
    );
  }
  const decomposition = JSON.parse(await readFile(decompositionPath, 'utf8'));
  if (decomposition.technicalSourceFidelityPass !== true) {
    throw new Error('Static source-fidelity decomposition proof did not pass; recomposition is blocked.');
  }

  const background = await latestPassingBackground();
  const backgroundPath = resolve(background.metadata.candidatePath);
  for (const path of [SOURCE_PATH, vesselPath, enkiPath, backgroundPath]) {
    if (!existsSync(path)) throw new Error(`Required input is missing: ${path}`);
  }

  console.log(`[ROI] report: ${roiReportPath}`);
  console.log(`[BACKGROUND] candidate: ${backgroundPath}`);
  console.log(`[BACKGROUND] QA: ${background.qaPath}`);
  console.log(`[FOREGROUND] vessel: ${vesselPath}`);
  console.log(`[FOREGROUND] Enki: ${enkiPath}`);

  const outputDirectory = join(background.directory, 'static-recomposition-proof');
  await mkdir(outputDirectory, { recursive: true });
  const unionMaskPath = join(outputDirectory, 'shot03-vessel-enki-union-mask.png');
  const recomposedPath = join(outputDirectory, 'shot03-static-full-recomposition.png');
  const diffPath = join(outputDirectory, 'shot03-source-vs-static-recomposition-diff.png');
  const sheetPath = join(outputDirectory, 'shot03-static-recomposition-review-sheet.png');

  createUnionMask(vesselPath, enkiPath, unionMaskPath);
  createRecomposition(backgroundPath, vesselPath, enkiPath, recomposedPath);
  createDiff(SOURCE_PATH, recomposedPath, diffPath);
  createSheet(SOURCE_PATH, backgroundPath, recomposedPath, diffPath, sheetPath);

  const sourceRgb = decodeRaw(SOURCE_PATH, 'rgb24', PIXELS * 3);
  const recomposedRgb = decodeRaw(recomposedPath, 'rgb24', PIXELS * 3);
  const vesselRgba = decodeRaw(vesselPath, 'rgba', PIXELS * 4);
  const enkiRgba = decodeRaw(enkiPath, 'rgba', PIXELS * 4);
  const unionAlpha = new Uint8Array(PIXELS);
  for (let pixel = 0; pixel < PIXELS; pixel += 1) {
    unionAlpha[pixel] = Math.max(
      vesselRgba[pixel * 4 + 3],
      enkiRgba[pixel * 4 + 3],
    );
  }

  const metrics = {
    fullFrame: compareRegion(sourceRgb, recomposedRgb, () => true),
    outsideForeground: compareRegion(
      sourceRgb,
      recomposedRgb,
      (pixel) => unionAlpha[pixel] === 0,
    ),
    strongForeground: compareRegion(
      sourceRgb,
      recomposedRgb,
      (pixel) => unionAlpha[pixel] > STRONG_ALPHA,
    ),
    opaqueForeground: compareRegion(
      sourceRgb,
      recomposedRgb,
      (pixel) => unionAlpha[pixel] >= OPAQUE_ALPHA,
    ),
    antialiasedEdge: compareRegion(
      sourceRgb,
      recomposedRgb,
      (pixel) => unionAlpha[pixel] > 0 && unionAlpha[pixel] < OPAQUE_ALPHA,
    ),
  };

  const technicalPass =
    background.qa.pass === true &&
    decomposition.technicalSourceFidelityPass === true &&
    metrics.outsideForeground.meanAbsoluteChannelDelta <= 0.5 &&
    metrics.outsideForeground.changedPixelRatioOver4 <= 0.01 &&
    metrics.opaqueForeground.meanAbsoluteChannelDelta <= 2.0 &&
    metrics.opaqueForeground.changedPixelRatioOver4 <= 0.03;

  console.log('');
  console.log('[DETERMINISTIC]');
  printMetric('outside foreground', metrics.outsideForeground);
  printMetric('opaque foreground', metrics.opaqueForeground);
  printMetric('strong foreground', metrics.strongForeground);
  printMetric('antialiased edge (advisory)', metrics.antialiasedEdge);
  printMetric('full frame', metrics.fullFrame);
  console.log(`  technical static recomposition gate: ${technicalPass ? 'PASS' : 'FAIL'}`);

  const receiptPath = join(outputDirectory, 'shot03-static-recomposition-proof.json');
  const receipt = {
    schemaVersion: 1,
    type: 'shot03-roi-static-full-recomposition-proof',
    generatedAt: new Date().toISOString(),
    sourceRoiReportPath: roiReportPath,
    sourceDecompositionProofPath: decompositionPath,
    backgroundCandidateDirectory: background.directory,
    backgroundCandidatePath: backgroundPath,
    backgroundQaPath: background.qaPath,
    backgroundQaPass: background.qa.pass === true,
    vesselPath,
    enkiPath,
    sourcePath: SOURCE_PATH,
    compositionPolicy: {
      backgroundContainsEditorialWaterAndRigging: true,
      explicitForegroundLayers: ['shot03-vessel-v1', 'shot03-enki-body-v1'],
      doNotAddLegacyWaterLayer: true,
      doNotAddLegacyRiggingLayer: true,
    },
    metrics,
    technicalStaticRecompositionPass: technicalPass,
    artifacts: {
      unionMask: unionMaskPath,
      recomposed: recomposedPath,
      diff: diffPath,
      reviewSheet: sheetPath,
    },
    canonicalAssetsMutated: false,
    canonicalManifestMutated: false,
    automaticPromotionAllowed: false,
    motionActivationAllowed: false,
    humanReviewRequired: true,
  };
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');

  let ai = null;
  if (!options.noAiReview) {
    const aiPath = join(outputDirectory, 'ollama-static-recomposition-review.json');
    ai = await reviewGeneratedMedia({
      artifacts: [
        { path: SOURCE_PATH, label: 'approved Shot 3 editorial source' },
        { path: backgroundPath, label: 'temporary clean background candidate' },
        { path: recomposedPath, label: 'static full recomposition: background plus vessel plus Enki' },
        { path: diffPath, label: 'amplified absolute RGB difference: source versus static recomposition' },
        { path: sheetPath, label: 'review sheet: source, background, recomposition, difference' },
      ],
      task: [
        'Review the static Shot 3 decomposition before motion is reintroduced.',
        'The editorial source is authoritative.',
        'The repaired background intentionally contains source-baked water, atmosphere, and rigging; only vessel and Enki are explicit foreground layers in this recovery proof.',
        'Do not request the old water or rigging extraction to be added again; that would duplicate source-baked content.',
        `Deterministic metrics: ${JSON.stringify(metrics)}.`,
        `Technical static recomposition gate: ${technicalPass ? 'PASS' : 'FAIL'}.`,
        'Do not override a deterministic FAIL.',
        'Look for visible seams, halos, doubled edges, missing vessel/character regions, registration shifts, inpaint leakage around subject boundaries, or obvious background repairs visible after foreground replacement.',
        'PASS_ADVISORY means suitable for human review only; never promote or activate motion.',
      ].join(' '),
      rubric: [
        'recomposition reads like the approved editorial frame',
        'vessel and Enki occupy correct source registration',
        'no duplicate or missing foreground content',
        'no obvious inpaint seam around foreground silhouettes',
        'no duplicate water or rigging layers',
      ],
      outputPath: aiPath,
      requireAi: options.requireAiReview,
      maxVideoSamples: 1,
    });
    receipt.aiReviewPath = aiPath;
    receipt.ai = ai;
    await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  } else {
    console.log('[ai] static recomposition review skipped by --no-ai-review');
  }

  console.log('');
  console.log(`[REVIEW] static recomposition: ${recomposedPath}`);
  console.log(`[REVIEW] review sheet: ${sheetPath}`);
  console.log(`[INFO] receipt: ${receiptPath}`);
  if (ai?.status) console.log(`[INFO] local vision status: ${ai.status}`);
  if (technicalPass && (!ai || ai.status === 'PASS_ADVISORY')) {
    console.log('[NEXT] Static decomposition is technically credible. Human visual acceptance remains the final gate before Pixi motion is reintroduced.');
  } else {
    console.log('[STOP] Static recomposition is not yet cleared for human acceptance or motion.');
  }

  await maybeOpenReviewArtifacts([sheetPath, recomposedPath, backgroundPath], {
    enabled: !options.noOpen,
    delayMs: 120,
  });
}

async function latestRoiReport() {
  const entries = await readdir(ROI_ROOT, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(ROI_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  for (const directory of directories) {
    const path = join(directory, 'shot03-roi-segmentation-search.json');
    if (existsSync(path)) return path;
  }
  throw new Error(`No completed Shot 3 ROI report found under ${ROI_ROOT}.`);
}

async function latestPassingBackground() {
  const entries = await readdir(CANDIDATE_ROOT, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory() && entry.name.includes('shot03-roi-background'))
    .map((entry) => join(CANDIDATE_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));

  for (const directory of directories) {
    const qaPath = join(directory, 'background-qa.json');
    const metadataPath = join(
      directory,
      'shot-03',
      'shot03-background-v1.candidate.json',
    );
    const autoPath = join(directory, 'shot03-roi-background-auto.json');
    if (!existsSync(qaPath) || !existsSync(metadataPath)) continue;
    try {
      const qa = JSON.parse(await readFile(qaPath, 'utf8'));
      const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
      const auto = existsSync(autoPath)
        ? JSON.parse(await readFile(autoPath, 'utf8'))
        : null;
      if (qa.pass !== true || metadata.layerId !== 'shot03-background-v1') continue;
      if (auto?.backgroundAiStatus && auto.backgroundAiStatus !== 'PASS_ADVISORY') continue;
      return { directory, qaPath, metadataPath, autoPath, qa, metadata, auto };
    } catch {
      continue;
    }
  }
  throw new Error(
    'No QA-passed Shot 3 ROI background candidate was found. Run node tools/scripts/shot03-roi-background-auto.mjs first.',
  );
}

function createUnionMask(vesselPath, enkiPath, outputPath) {
  runFfmpeg([
    '-i', vesselPath,
    '-i', enkiPath,
    '-filter_complex',
    "[0:v]alphaextract[a];[1:v]alphaextract[b];[a][b]blend=all_expr='max(A,B)',format=gray[out]",
    '-map', '[out]',
    '-frames:v', '1',
    outputPath,
  ]);
}

function createRecomposition(backgroundPath, vesselPath, enkiPath, outputPath) {
  runFfmpeg([
    '-i', backgroundPath,
    '-i', vesselPath,
    '-i', enkiPath,
    '-filter_complex',
    '[0:v]format=rgba[bg];[1:v]format=rgba[vessel];[2:v]format=rgba[enki];[bg][vessel]overlay=format=auto[a];[a][enki]overlay=format=auto,format=rgb24[out]',
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
    '[0:v]format=rgb24[s];[1:v]format=rgb24[r];[s][r]blend=all_mode=difference,eq=contrast=4:brightness=0.05[out]',
    '-map', '[out]',
    '-frames:v', '1',
    outputPath,
  ]);
}

function createSheet(sourcePath, backgroundPath, recomposedPath, diffPath, outputPath) {
  runFfmpeg([
    '-i', sourcePath,
    '-i', backgroundPath,
    '-i', recomposedPath,
    '-i', diffPath,
    '-filter_complex',
    '[0:v]scale=235:418:flags=lanczos[s];[1:v]scale=235:418:flags=lanczos[b];[2:v]scale=235:418:flags=lanczos[r];[3:v]scale=235:418:flags=neighbor[d];[s][b][r][d]hstack=inputs=4[out]',
    '-map', '[out]',
    '-frames:v', '1',
    outputPath,
  ]);
}

function compareRegion(source, candidate, includePixel) {
  let pixels = 0;
  let changedPixelsOver4 = 0;
  let channelDeltaSum = 0;
  let maxChannelDelta = 0;
  for (let pixel = 0; pixel < PIXELS; pixel += 1) {
    if (!includePixel(pixel)) continue;
    pixels += 1;
    let pixelMax = 0;
    for (let channel = 0; channel < 3; channel += 1) {
      const index = pixel * 3 + channel;
      const delta = Math.abs(source[index] - candidate[index]);
      channelDeltaSum += delta;
      pixelMax = Math.max(pixelMax, delta);
      maxChannelDelta = Math.max(maxChannelDelta, delta);
    }
    if (pixelMax > 4) changedPixelsOver4 += 1;
  }
  return {
    pixels,
    coverage: pixels / PIXELS,
    meanAbsoluteChannelDelta: pixels ? channelDeltaSum / (pixels * 3) : 0,
    changedPixelsOver4,
    changedPixelRatioOver4: pixels ? changedPixelsOver4 / pixels : 0,
    maxChannelDelta,
  };
}

function printMetric(label, metric) {
  console.log(
    `  ${label}: mean=${metric.meanAbsoluteChannelDelta.toFixed(4)} · delta>4=${(metric.changedPixelRatioOver4 * 100).toFixed(4)}% · max=${metric.maxChannelDelta} · coverage=${(metric.coverage * 100).toFixed(3)}%`,
  );
}

function decodeRaw(path, pixelFormat, expectedBytes) {
  const result = spawnSync(
    FFMPEG,
    ['-hide_banner', '-loglevel', 'error', '-i', path, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', pixelFormat, 'pipe:1'],
    {
      cwd: ROOT,
      encoding: null,
      maxBuffer: 32 * 1024 * 1024,
      windowsHide: true,
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg could not decode ${path}: ${String(result.stderr ?? '').trim()}`);
  }
  if (!Buffer.isBuffer(result.stdout) || result.stdout.length !== expectedBytes) {
    throw new Error(`${basename(path)} decoded to ${result.stdout?.length ?? 0} bytes; expected ${expectedBytes}.`);
  }
  return result.stdout;
}

function runFfmpeg(args) {
  const result = spawnSync(
    FFMPEG,
    ['-y', '-hide_banner', '-loglevel', 'error', ...args],
    {
      cwd: ROOT,
      encoding: 'utf8',
      windowsHide: true,
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`FFmpeg failed with exit ${result.status ?? 'unknown'}: ${result.stderr || result.stdout}`);
  }
}

function parseOptions(args) {
  const result = {
    noOpen: false,
    noAiReview: false,
    requireAiReview: false,
  };
  for (const arg of args) {
    if (arg === '--no-open') result.noOpen = true;
    else if (arg === '--no-ai-review') result.noAiReview = true;
    else if (arg === '--require-ai-review') result.requireAiReview = true;
    else throw new Error(`Unknown option ${arg}`);
  }
  return result;
}
