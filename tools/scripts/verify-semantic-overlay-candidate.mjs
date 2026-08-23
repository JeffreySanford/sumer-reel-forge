import { spawnSync } from 'node:child_process';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import {
  loadProductionLaneRegistry,
  resolveLayerProductionLane,
} from '../creative/style-decisions.mjs';

const DEFAULT_MANIFEST = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const ASSET_ROOT = resolve('assets');
const CANDIDATE_BASE = resolve('tmp/animation-assets/candidates');
const DIAGNOSTIC_ROOT = resolve('tmp/animation-diagnostics');

const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const manifestPath = resolve(options.manifest ?? DEFAULT_MANIFEST);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const shot = manifest.shots?.find(
    (item) => item.sourceShotNumber === options.shotNumber,
  );
  const layer = shot?.layers?.find((item) => item.id === options.layerId);
  if (!shot || !layer) {
    throw new Error(
      `Could not resolve Shot ${options.shotNumber} / ${options.layerId}.`,
    );
  }
  if (!layer.hasAlpha) {
    throw new Error(`${layer.id} is not an alpha semantic-overlay layer.`);
  }

  const registry = await loadProductionLaneRegistry(options.productionLanes);
  const lane = resolveLayerProductionLane(registry, layer);
  if (!lane) throw new Error(`No production lane matches ${layer.id}.`);
  const allowedFamilies = new Set([
    'sam3-semantic-overlay',
    'semantic-coherence-mask',
  ]);
  if (!allowedFamilies.has(lane.generator?.family)) {
    throw new Error(
      `${layer.id} uses ${lane.generator?.family ?? 'unknown'}; semantic overlay QA is not applicable.`,
    );
  }

  const sourcePath = resolve(ASSET_ROOT, shot.sourceFrame);
  const sourceBytes = await readFile(sourcePath);
  const sourceDimensions = readPngDimensions(sourceBytes, 'Editorial source');
  const candidate = await newestCandidate(manifest.manifestId, layer.id);
  const candidateBytes = await readFile(candidate.path);
  const candidateDimensions = readPngDimensions(candidateBytes, layer.id);
  const dimensionsMatch =
    candidateDimensions.width === sourceDimensions.width &&
    candidateDimensions.height === sourceDimensions.height;

  const candidateRgba = decodeRgba(candidate.path, sourceDimensions);
  const sourceRgba = decodeRgba(sourcePath, sourceDimensions);
  const pixelCount = sourceDimensions.width * sourceDimensions.height;
  if (candidateRgba.length !== pixelCount * 4 || sourceRgba.length !== pixelCount * 4) {
    throw new Error('Decoded RGBA buffer size does not match source dimensions.');
  }

  let alphaGt0 = 0;
  let alphaGt16 = 0;
  let alphaGt64 = 0;
  let alphaGt192 = 0;
  let selectedPixels = 0;
  let selectedRgbChanged = 0;
  let selectedRgbAbsoluteDiff = 0;
  let selectedRgbMaximumDiff = 0;

  for (let offset = 0; offset < candidateRgba.length; offset += 4) {
    const alpha = candidateRgba[offset + 3];
    if (alpha > 0) alphaGt0 += 1;
    if (alpha > 16) alphaGt16 += 1;
    if (alpha > 64) alphaGt64 += 1;
    if (alpha > 192) alphaGt192 += 1;
    if (alpha <= 16) continue;
    selectedPixels += 1;
    let changed = false;
    for (let channel = 0; channel < 3; channel += 1) {
      const diff = Math.abs(
        candidateRgba[offset + channel] - sourceRgba[offset + channel],
      );
      selectedRgbAbsoluteDiff += diff;
      selectedRgbMaximumDiff = Math.max(selectedRgbMaximumDiff, diff);
      if (diff !== 0) changed = true;
    }
    if (changed) selectedRgbChanged += 1;
  }

  const coverage = {
    alphaGt0: alphaGt0 / pixelCount,
    alphaGt16: alphaGt16 / pixelCount,
    alphaGt64: alphaGt64 / pixelCount,
    alphaGt192: alphaGt192 / pixelCount,
  };
  const thresholds = lane.qa?.alphaCoverage ?? {
    minimum: 0.001,
    maximum: 0.9,
  };
  const alphaCoveragePass =
    coverage.alphaGt16 >= thresholds.minimum &&
    coverage.alphaGt16 <= thresholds.maximum;
  const selectedRgbChangedRatio = selectedPixels
    ? selectedRgbChanged / selectedPixels
    : 1;
  const selectedRgbMeanDiff = selectedPixels
    ? selectedRgbAbsoluteDiff / (selectedPixels * 3)
    : Number.POSITIVE_INFINITY;
  const sourceRgbPass = lane.qa?.requireSourceRgbUnderAlpha
    ? selectedRgbChangedRatio <= 0.0001 && selectedRgbMeanDiff <= 0.01
    : true;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const diagnosticDirectory = resolve(
    DIAGNOSTIC_ROOT,
    `shot-${String(shot.sourceShotNumber).padStart(2, '0')}`,
    safeName(layer.id),
    stamp,
  );
  await mkdir(diagnosticDirectory, { recursive: true });
  const alphaPath = join(diagnosticDirectory, 'alpha-mask.png');
  const whitePath = join(diagnosticDirectory, 'candidate-on-white.png');
  const blackPath = join(diagnosticDirectory, 'candidate-on-black.png');
  createDiagnostics(candidate.path, sourceDimensions, alphaPath, whitePath, blackPath);

  const passed = dimensionsMatch && alphaCoveragePass && sourceRgbPass;
  const report = {
    schemaVersion: 1,
    type: 'semantic-overlay-structure-qa',
    generatedAt: new Date().toISOString(),
    manifestId: manifest.manifestId,
    shotId: shot.shotId,
    sourceShotNumber: shot.sourceShotNumber,
    layerId: layer.id,
    laneId: lane.id,
    qaFamily: lane.qa?.family ?? null,
    sourcePath,
    candidatePath: candidate.path,
    sourceDimensions,
    candidateDimensions,
    thresholds: {
      alphaCoverage: thresholds,
      selectedRgbChangedRatioMaximum: 0.0001,
      selectedRgbMeanDiffMaximum: 0.01,
    },
    measurements: {
      coverage,
      selectedPixels,
      selectedRgbChangedRatio,
      selectedRgbMeanDiff,
      selectedRgbMaximumDiff,
    },
    checks: {
      dimensionsMatch,
      alphaCoveragePass,
      sourceRgbPass,
    },
    diagnostics: {
      alphaMask: alphaPath,
      candidateOnWhite: whitePath,
      candidateOnBlack: blackPath,
    },
    qaStatus: passed ? 'PASS' : 'FAIL',
    motionQaStatus: 'PENDING_COMPOSITE_BENCHMARK',
    humanReviewRequired: true,
    humanReviewNotes: [
      'Confirm the semantic region matches the requested material/role rather than merely satisfying alpha coverage.',
      lane.id === 'environmental-coherence-mask'
        ? 'Confirm the mask reads as environmental coherence and not a hard human/mermaid/apparition silhouette.'
        : 'Confirm the extraction is visually useful and free of unrelated subject regions.',
    ],
  };
  const reportPath = join(
    candidate.runDirectory,
    `${safeName(layer.id)}-structure-qa.json`,
  );
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`Semantic overlay verification — Shot ${shot.sourceShotNumber} / ${layer.id}`);
  console.log(`Lane: ${lane.id}`);
  console.log(`Candidate: ${candidate.path}`);
  console.log(`${dimensionsMatch ? '[ok]' : '[blocked]'} dimensions: ${candidateDimensions.width}x${candidateDimensions.height}`);
  console.log(
    `${alphaCoveragePass ? '[ok]' : '[blocked]'} alpha coverage (>16): ${(coverage.alphaGt16 * 100).toFixed(3)}% (allowed ${(thresholds.minimum * 100).toFixed(3)}%–${(thresholds.maximum * 100).toFixed(1)}%)`,
  );
  console.log(
    `${sourceRgbPass ? '[ok]' : '[blocked]'} source RGB under selected alpha: mean diff ${selectedRgbMeanDiff.toFixed(4)}, changed ${(selectedRgbChangedRatio * 100).toFixed(4)}%`,
  );
  console.log(`Structure QA: ${report.qaStatus}`);
  console.log(`Motion QA: ${report.motionQaStatus}`);
  console.log(`Alpha mask: ${alphaPath}`);
  console.log(`On white: ${whitePath}`);
  console.log(`On black: ${blackPath}`);
  console.log(`Report: ${reportPath}`);
  console.log('Human semantic review remains required; motion is judged in the assembled benchmark.');
  if (!passed) process.exitCode = 2;
}

function decodeRgba(path, dimensions) {
  const result = spawnSync(
    process.env.FFMPEG_COMMAND ?? 'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      path,
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgba',
      'pipe:1',
    ],
    {
      cwd: process.cwd(),
      env: process.env,
      encoding: null,
      maxBuffer: dimensions.width * dimensions.height * 4 + 1024 * 1024,
      windowsHide: true,
      shell: process.platform === 'win32',
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg RGBA decode failed for ${path} with exit code ${result.status}.`);
  }
  return result.stdout;
}

function createDiagnostics(candidatePath, dimensions, alphaPath, whitePath, blackPath) {
  runFfmpeg([
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    candidatePath,
    '-vf',
    'alphaextract,format=gray',
    '-frames:v',
    '1',
    alphaPath,
  ]);
  for (const [color, outputPath] of [
    ['white', whitePath],
    ['black', blackPath],
  ]) {
    runFfmpeg([
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'lavfi',
      '-i',
      `color=c=${color}:s=${dimensions.width}x${dimensions.height}`,
      '-i',
      candidatePath,
      '-filter_complex',
      '[0:v][1:v]overlay=0:0:format=auto',
      '-frames:v',
      '1',
      outputPath,
    ]);
  }
}

function runFfmpeg(args) {
  const result = spawnSync(process.env.FFMPEG_COMMAND ?? 'ffmpeg', args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed with exit code ${result.status ?? 'unknown'}.`);
  }
}

async function newestCandidate(manifestId, layerId) {
  const root = resolve(CANDIDATE_BASE, manifestId);
  const entries = await readdir(root, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => join(root, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  for (const runDirectory of directories) {
    const runPath = join(runDirectory, 'candidate-run.json');
    if (!(await exists(runPath))) continue;
    try {
      const run = JSON.parse(await readFile(runPath, 'utf8'));
      const entry = (run.candidates ?? []).find(
        (candidate) => candidate.layerId === layerId,
      );
      if (entry?.candidatePath && (await exists(entry.candidatePath))) {
        return { path: resolve(entry.candidatePath), runDirectory };
      }
    } catch {
      // Continue through older candidate runs.
    }
  }
  throw new Error(
    `No candidate run containing ${layerId} was found under ${root}.`,
  );
}

function parseOptions(args) {
  const result = {
    shotNumber: undefined,
    layerId: undefined,
    manifest: undefined,
    productionLanes: undefined,
  };
  for (const arg of args) {
    if (arg.startsWith('--shot=')) {
      const value = Number(arg.slice('--shot='.length));
      if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid ${arg}`);
      result.shotNumber = value;
    } else if (arg.startsWith('--layer=')) {
      result.layerId = arg.slice('--layer='.length);
    } else if (arg.startsWith('--manifest=')) {
      result.manifest = arg.slice('--manifest='.length);
    } else if (arg.startsWith('--production-lanes=')) {
      result.productionLanes = arg.slice('--production-lanes='.length);
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  if (!result.shotNumber || !result.layerId) {
    throw new Error('--shot=<number> and --layer=<id> are required.');
  }
  return result;
}

function readPngDimensions(buffer, label) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length < 24 ||
    buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
    buffer.subarray(12, 16).toString('ascii') !== 'IHDR'
  ) {
    throw new Error(`${label} is not a valid PNG.`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function safeName(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, '-');
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
