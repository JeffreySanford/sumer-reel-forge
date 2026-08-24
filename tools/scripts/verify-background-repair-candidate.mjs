import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';

const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const INPUT_BASE_ROOT = resolve('tmp/animation-assets/background-inputs');
const ASSET_ROOT = resolve('assets');
const DEFAULT_PIXEL_CHANGE_THRESHOLD = 2;

const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
const runDirectory = options.candidateDir
  ? resolve(options.candidateDir)
  : newestBackgroundCandidateDirectory();
assertInside(CANDIDATE_ROOT, runDirectory, 'Background candidate directory');

const shotDirectory = join(runDirectory, `shot-${pad2(options.shotNumber)}`);
const candidateMetadataPath = join(
  shotDirectory,
  `${safeName(options.layerId)}.candidate.json`,
);
if (!existsSync(candidateMetadataPath)) {
  throw new Error(`Background candidate metadata not found: ${candidateMetadataPath}`);
}
const metadata = JSON.parse(readFileSync(candidateMetadataPath, 'utf8'));
if (
  metadata.layerId !== options.layerId ||
  metadata.sourceShotNumber !== options.shotNumber
) {
  throw new Error(
    `Expected Shot ${options.shotNumber} / ${options.layerId}; found Shot ${metadata.sourceShotNumber ?? 'unknown'} / ${metadata.layerId ?? 'unknown'}.`,
  );
}

const candidatePath = resolveCandidatePath(metadata.candidatePath, runDirectory);
const sourcePath = resolveSourcePath(metadata.backgroundInputs?.sourcePath);
const maskPath = resolveMaskPath(metadata.backgroundInputs?.maskPath, options.layerId);
for (const [label, path] of [
  ['Candidate', candidatePath],
  ['Source', sourcePath],
  ['Removal mask', maskPath],
]) {
  if (!existsSync(path)) throw new Error(`${label} not found: ${path}`);
}

const foregroundQaPath = metadata.backgroundInputs?.foregroundStructureQaPath;
if (typeof foregroundQaPath !== 'string' || !existsSync(resolve(foregroundQaPath))) {
  throw new Error('Background metadata is missing the foreground structural QA evidence.');
}
const foregroundQa = JSON.parse(readFileSync(resolve(foregroundQaPath), 'utf8'));
if (foregroundQa.qaStatus !== 'PASS') {
  throw new Error(
    `Foreground structural QA must remain PASS; found ${foregroundQa.qaStatus ?? 'unknown'}.`,
  );
}

const sourceDimensions = readPngDimensions(sourcePath, 'Source');
const candidateDimensions = readPngDimensions(candidatePath, 'Candidate');
const maskDimensions = readPngDimensions(maskPath, 'Removal mask');
assertSameDimensions('Candidate', candidateDimensions, sourceDimensions);
assertSameDimensions('Removal mask', maskDimensions, sourceDimensions);

const pixels = sourceDimensions.width * sourceDimensions.height;
const source = decodeFrame(sourcePath, 'rgb24', pixels * 3);
const candidate = decodeFrame(candidatePath, 'rgb24', pixels * 3);
const mask = decodeFrame(maskPath, 'gray', pixels);

let insideCount = 0;
let outsideCount = 0;
let insideDiffSum = 0;
let outsideDiffSum = 0;
let insideChanged = 0;
let outsideChanged = 0;

for (let pixel = 0; pixel < pixels; pixel += 1) {
  const offset = pixel * 3;
  const difference =
    (Math.abs(source[offset] - candidate[offset]) +
      Math.abs(source[offset + 1] - candidate[offset + 1]) +
      Math.abs(source[offset + 2] - candidate[offset + 2])) /
    3;
  const inside = mask[pixel] > 0;
  if (inside) {
    insideCount += 1;
    insideDiffSum += difference;
    if (difference > options.pixelChangeThreshold) insideChanged += 1;
  } else {
    outsideCount += 1;
    outsideDiffSum += difference;
    if (difference > options.pixelChangeThreshold) outsideChanged += 1;
  }
}

const maskRatio = insideCount / pixels;
const insideMeanDifference = insideCount ? insideDiffSum / insideCount : 0;
const outsideMeanDifference = outsideCount ? outsideDiffSum / outsideCount : 0;
const insideChangedRatio = insideCount ? insideChanged / insideCount : 0;
const outsideChangedRatio = outsideCount ? outsideChanged / outsideCount : 0;

const checks = [
  {
    id: 'editorial-resolution',
    pass: true,
    detail: `${sourceDimensions.width}x${sourceDimensions.height} asset resolution`,
  },
  {
    id: 'foreground-structure-qa',
    pass: foregroundQa.qaStatus === 'PASS',
    detail: `${foregroundQa.layerId ?? 'foreground'} structure QA ${foregroundQa.qaStatus}`,
  },
  {
    id: 'mask-coverage',
    pass: maskRatio >= options.minMaskRatio && maskRatio <= options.maxMaskRatio,
    detail: `${(maskRatio * 100).toFixed(3)}% of editorial canvas selected`,
  },
  {
    id: 'outside-preservation',
    pass:
      outsideMeanDifference <= options.maxOutsideMeanDiff &&
      outsideChangedRatio <= options.maxOutsideChangedRatio,
    detail: `mean diff ${outsideMeanDifference.toFixed(4)}, changed pixels ${(outsideChangedRatio * 100).toFixed(4)}%`,
  },
  {
    id: 'inside-reconstruction',
    pass:
      insideMeanDifference >= options.minInsideMeanDiff &&
      insideChangedRatio >= options.minInsideChangedRatio,
    detail: `mean diff ${insideMeanDifference.toFixed(4)}, changed pixels ${(insideChangedRatio * 100).toFixed(4)}%`,
  },
];
const pass = checks.every((check) => check.pass);

const contactSheetPath = join(
  runDirectory,
  `${safeName(options.layerId)}-background-review-contact-sheet.png`,
);
createContactSheet(sourcePath, maskPath, candidatePath, contactSheetPath);

const report = {
  schemaVersion: 1,
  verificationType: 'verified-overlay-background-repair-preservation',
  generatedAt: new Date().toISOString(),
  sourceShotNumber: options.shotNumber,
  layerId: options.layerId,
  candidateDirectory: runDirectory,
  candidatePath,
  sourcePath,
  maskPath,
  foregroundStructureQaPath: resolve(foregroundQaPath),
  assetDimensions: sourceDimensions,
  renderCanvasIndependent: true,
  pass,
  thresholds: {
    pixelChangeThreshold: options.pixelChangeThreshold,
    minMaskRatio: options.minMaskRatio,
    maxMaskRatio: options.maxMaskRatio,
    maxOutsideMeanDiff: options.maxOutsideMeanDiff,
    maxOutsideChangedRatio: options.maxOutsideChangedRatio,
    minInsideMeanDiff: options.minInsideMeanDiff,
    minInsideChangedRatio: options.minInsideChangedRatio,
  },
  metrics: {
    maskRatio,
    insidePixels: insideCount,
    outsidePixels: outsideCount,
    insideMeanDifference,
    insideChangedRatio,
    outsideMeanDifference,
    outsideChangedRatio,
  },
  checks,
  contactSheetPath,
  interpretation:
    'PASS proves that the QA-passed foreground alpha defined the only allowed repair region, the repaired candidate changed that region, and editorial-v1 pixels outside it remained effectively unchanged. Human review still decides whether the reconstruction is visually plausible.',
};
const reportPath = join(
  runDirectory,
  `${safeName(options.layerId)}-background-qa.json`,
);
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Shot ${options.shotNumber} background repair verification — ${options.layerId}`);
console.log(`Candidate: ${candidatePath}`);
for (const check of checks) {
  console.log(`[${check.pass ? 'ok' : 'fail'}] ${check.id}: ${check.detail}`);
}
console.log(`Background QA: ${pass ? 'PASS' : 'FAIL'}`);
console.log(`Review contact sheet: ${contactSheetPath}`);
console.log(`Report: ${reportPath}`);
console.log('Human review is still required before promotion.');
if (!pass) process.exitCode = 2;

function newestBackgroundCandidateDirectory() {
  if (!existsSync(CANDIDATE_ROOT)) {
    throw new Error(`Candidate root does not exist: ${CANDIDATE_ROOT}.`);
  }
  const directories = readdirSync(CANDIDATE_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(CANDIDATE_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  for (const directory of directories) {
    const metadataPath = join(
      directory,
      `shot-${pad2(options.shotNumber)}`,
      `${safeName(options.layerId)}.candidate.json`,
    );
    if (existsSync(metadataPath)) return directory;
  }
  throw new Error(
    `No Shot ${options.shotNumber} ${options.layerId} background candidate was found.`,
  );
}

function resolveCandidatePath(rawPath, runDirectory) {
  if (typeof rawPath !== 'string' || !rawPath) {
    throw new Error('Background candidate metadata is missing candidatePath.');
  }
  const path = isAbsolute(rawPath) ? resolve(rawPath) : resolve(runDirectory, rawPath);
  assertInside(runDirectory, path, 'Background candidate');
  return path;
}

function resolveSourcePath(rawPath) {
  if (typeof rawPath !== 'string' || !rawPath) {
    throw new Error('Background candidate metadata is missing sourcePath.');
  }
  const path = resolve(rawPath);
  assertInside(ASSET_ROOT, path, 'Editorial source');
  return path;
}

function resolveMaskPath(rawPath, layerId) {
  if (typeof rawPath !== 'string' || !rawPath) {
    throw new Error('Background candidate metadata is missing maskPath.');
  }
  const path = resolve(rawPath);
  const expectedRoot = join(INPUT_BASE_ROOT, safeName(layerId));
  assertInside(expectedRoot, path, 'Background removal mask');
  return path;
}

function readPngDimensions(path, label) {
  const buffer = readFileSync(path);
  if (
    buffer.length < 24 ||
    buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
    buffer.subarray(12, 16).toString('ascii') !== 'IHDR'
  ) {
    throw new Error(`${label} is not a valid PNG.`);
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function assertSameDimensions(label, actual, expected) {
  if (actual.width !== expected.width || actual.height !== expected.height) {
    throw new Error(
      `${label} is ${actual.width}x${actual.height}; expected editorial source ${expected.width}x${expected.height}.`,
    );
  }
}

function decodeFrame(path, pixelFormat, expectedBytes) {
  const result = spawnSync(
    process.env.FFMPEG_COMMAND ?? 'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      path,
      '-frames:v',
      '1',
      '-f',
      'rawvideo',
      '-pix_fmt',
      pixelFormat,
      'pipe:1',
    ],
    {
      cwd: process.cwd(),
      env: process.env,
      encoding: null,
      maxBuffer: Math.max(32 * 1024 * 1024, expectedBytes + 1024),
      windowsHide: true,
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg could not decode ${path}: ${String(result.stderr ?? '').trim()}`);
  }
  if (!Buffer.isBuffer(result.stdout) || result.stdout.length !== expectedBytes) {
    throw new Error(
      `${basename(path)} decoded to ${result.stdout?.length ?? 0} bytes; expected ${expectedBytes}.`,
    );
  }
  return result.stdout;
}

function createContactSheet(sourcePath, maskPath, candidatePath, outputPath) {
  const result = spawnSync(
    process.env.FFMPEG_COMMAND ?? 'ffmpeg',
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      sourcePath,
      '-i',
      maskPath,
      '-i',
      candidatePath,
      '-filter_complex',
      '[0:v]scale=360:640:force_original_aspect_ratio=decrease,pad=360:640:(ow-iw)/2:(oh-ih)/2:black[s];[1:v]scale=360:640:force_original_aspect_ratio=decrease,pad=360:640:(ow-iw)/2:(oh-ih)/2:black[m];[2:v]scale=360:640:force_original_aspect_ratio=decrease,pad=360:640:(ow-iw)/2:(oh-ih)/2:black[c];[s][m][c]hstack=inputs=3[sheet]',
      '-map',
      '[sheet]',
      '-frames:v',
      '1',
      outputPath,
    ],
    {
      cwd: process.cwd(),
      env: process.env,
      encoding: 'utf8',
      windowsHide: true,
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `ffmpeg could not create background contact sheet: ${String(result.stderr ?? '').trim()}`,
    );
  }
}

function parseOptions(args) {
  const parsed = {
    shotNumber: undefined,
    layerId: undefined,
    candidateDir: undefined,
    pixelChangeThreshold: DEFAULT_PIXEL_CHANGE_THRESHOLD,
    minMaskRatio: 0.001,
    maxMaskRatio: 0.65,
    maxOutsideMeanDiff: 0.5,
    maxOutsideChangedRatio: 0.01,
    minInsideMeanDiff: 1,
    minInsideChangedRatio: 0.05,
  };
  for (const arg of args) {
    if (arg.startsWith('--shot=')) {
      parsed.shotNumber = Number(arg.slice('--shot='.length));
    } else if (arg.startsWith('--layer=')) {
      parsed.layerId = arg.slice('--layer='.length);
    } else if (arg.startsWith('--candidate-dir=')) {
      parsed.candidateDir = arg.slice('--candidate-dir='.length);
    } else if (arg.startsWith('--pixel-change-threshold=')) {
      parsed.pixelChangeThreshold = Number(arg.slice('--pixel-change-threshold='.length));
    } else if (arg.startsWith('--min-mask-ratio=')) {
      parsed.minMaskRatio = Number(arg.slice('--min-mask-ratio='.length));
    } else if (arg.startsWith('--max-mask-ratio=')) {
      parsed.maxMaskRatio = Number(arg.slice('--max-mask-ratio='.length));
    } else if (arg.startsWith('--max-outside-mean-diff=')) {
      parsed.maxOutsideMeanDiff = Number(arg.slice('--max-outside-mean-diff='.length));
    } else if (arg.startsWith('--max-outside-changed-ratio=')) {
      parsed.maxOutsideChangedRatio = Number(arg.slice('--max-outside-changed-ratio='.length));
    } else if (arg.startsWith('--min-inside-mean-diff=')) {
      parsed.minInsideMeanDiff = Number(arg.slice('--min-inside-mean-diff='.length));
    } else if (arg.startsWith('--min-inside-changed-ratio=')) {
      parsed.minInsideChangedRatio = Number(arg.slice('--min-inside-changed-ratio='.length));
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  if (!Number.isInteger(parsed.shotNumber) || parsed.shotNumber < 1 || !parsed.layerId) {
    throw new Error('--shot=<positive integer> and --layer=<id> are required.');
  }
  for (const [name, value] of Object.entries(parsed)) {
    if (
      name !== 'shotNumber' &&
      name !== 'layerId' &&
      name !== 'candidateDir' &&
      !Number.isFinite(value)
    ) {
      throw new Error(`Invalid numeric option ${name}.`);
    }
  }
  return parsed;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function safeName(value) {
  return String(value)
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

function assertInside(parent, child, label) {
  const path = relative(resolve(parent), resolve(child));
  if (path !== '' && (path.startsWith('..') || isAbsolute(path))) {
    throw new Error(`${label} must remain under ${parent}: ${child}`);
  }
}
