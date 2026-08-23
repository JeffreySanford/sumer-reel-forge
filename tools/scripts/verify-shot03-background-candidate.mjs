import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';

const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const INPUT_ROOT = resolve(
  'tmp/animation-assets/background-inputs/shot03-background-v1',
);
const ASSET_ROOT = resolve('assets');
const LAYER_ID = 'shot03-background-v1';
const WIDTH = 1080;
const HEIGHT = 1920;
const PIXELS = WIDTH * HEIGHT;
const DEFAULT_PIXEL_CHANGE_THRESHOLD = 2;

const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
const runDirectory = options.candidateDir
  ? resolve(options.candidateDir)
  : newestBackgroundCandidateDirectory();
assertInside(CANDIDATE_ROOT, runDirectory, 'Background candidate directory');

const candidateMetadataPath = join(
  runDirectory,
  'shot-03',
  `${LAYER_ID}.candidate.json`,
);
if (!existsSync(candidateMetadataPath)) {
  throw new Error(`Background candidate metadata not found: ${candidateMetadataPath}`);
}
const metadata = JSON.parse(readFileSync(candidateMetadataPath, 'utf8'));
if (metadata.layerId !== LAYER_ID) {
  throw new Error(`Expected ${LAYER_ID}; found ${metadata.layerId ?? 'unknown'}.`);
}

const candidatePath = resolveCandidatePath(metadata.candidatePath, runDirectory);
const sourcePath = resolveSourcePath(metadata.backgroundInputs?.sourcePath);
const maskPath = resolveMaskPath(metadata.backgroundInputs?.maskPath);
for (const [label, path] of [
  ['Candidate', candidatePath],
  ['Source', sourcePath],
  ['Removal mask', maskPath],
]) {
  if (!existsSync(path)) throw new Error(`${label} not found: ${path}`);
}

const source = decodeFrame(sourcePath, 'rgb24', PIXELS * 3);
const candidate = decodeFrame(candidatePath, 'rgb24', PIXELS * 3);
const mask = decodeFrame(maskPath, 'gray', PIXELS);

let insideCount = 0;
let outsideCount = 0;
let insideDiffSum = 0;
let outsideDiffSum = 0;
let insideChanged = 0;
let outsideChanged = 0;

for (let pixel = 0; pixel < PIXELS; pixel += 1) {
  const offset = pixel * 3;
  const difference =
    (Math.abs(source[offset] - candidate[offset]) +
      Math.abs(source[offset + 1] - candidate[offset + 1]) +
      Math.abs(source[offset + 2] - candidate[offset + 2])) /
    3;

  // The final composite uses the grayscale removal mask as alpha. Any non-zero
  // mask value is therefore part of the permitted repair region, including
  // anti-aliased silhouette edges. Pixels with mask=0 must remain editorial-v1.
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

const maskRatio = insideCount / PIXELS;
const insideMeanDifference = insideCount ? insideDiffSum / insideCount : 0;
const outsideMeanDifference = outsideCount ? outsideDiffSum / outsideCount : 0;
const insideChangedRatio = insideCount ? insideChanged / insideCount : 0;
const outsideChangedRatio = outsideCount ? outsideChanged / outsideCount : 0;

const checks = [
  {
    id: 'mask-coverage',
    pass: maskRatio >= options.minMaskRatio && maskRatio <= options.maxMaskRatio,
    detail: `${(maskRatio * 100).toFixed(3)}% of canvas selected`,
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

const contactSheetPath = join(runDirectory, 'background-review-contact-sheet.png');
createContactSheet(sourcePath, maskPath, candidatePath, contactSheetPath);

const report = {
  schemaVersion: 2,
  verificationType: 'background-reconstruction-preservation',
  generatedAt: new Date().toISOString(),
  layerId: LAYER_ID,
  candidateDirectory: runDirectory,
  candidatePath,
  sourcePath,
  maskPath,
  crop: metadata.backgroundInputs?.crop ?? null,
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
    'PASS proves the candidate changed the validated removal region while preserving editorial-v1 wherever the blend mask is zero. It does not replace human review of whether the reconstructed river/background is visually plausible.',
};
const reportPath = join(runDirectory, 'background-qa.json');
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log('Shot 3 background reconstruction verification');
console.log(`Candidate: ${candidatePath}`);
if (report.crop) {
  console.log(
    `Working crop: ${report.crop.width}x${report.crop.height} @ (${report.crop.x}, ${report.crop.y})`,
  );
}
for (const check of checks) {
  console.log(`[${check.pass ? 'ok' : 'fail'}] ${check.id}: ${check.detail}`);
}
console.log(`Background QA: ${pass ? 'PASS' : 'FAIL'}`);
console.log(`Review contact sheet: ${contactSheetPath}`);
console.log(`Report: ${reportPath}`);
console.log('Human review is still required before promotion.');
if (!pass) process.exitCode = 2;

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
      maxBuffer: 32 * 1024 * 1024,
      windowsHide: true,
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `ffmpeg could not decode ${path}: ${String(result.stderr ?? '').trim()}`,
    );
  }
  if (!Buffer.isBuffer(result.stdout) || result.stdout.length !== expectedBytes) {
    throw new Error(
      `${basename(path)} decoded to ${result.stdout?.length ?? 0} bytes; expected ${expectedBytes} for ${WIDTH}x${HEIGHT} ${pixelFormat}.`,
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

function newestBackgroundCandidateDirectory() {
  if (!existsSync(CANDIDATE_ROOT)) {
    throw new Error(
      `Candidate root does not exist: ${CANDIDATE_ROOT}. Run pnpm comfyui:background:generate first.`,
    );
  }
  const directories = readdirSync(CANDIDATE_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(CANDIDATE_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  for (const directory of directories) {
    if (existsSync(join(directory, 'shot-03', `${LAYER_ID}.candidate.json`))) {
      return directory;
    }
  }
  throw new Error(
    'No Shot 3 background candidate found. Run pnpm comfyui:background:generate first.',
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

function resolveMaskPath(rawPath) {
  if (typeof rawPath !== 'string' || !rawPath) {
    throw new Error('Background candidate metadata is missing maskPath.');
  }
  const path = resolve(rawPath);
  assertInside(INPUT_ROOT, path, 'Background removal mask');
  return path;
}

function parseOptions(args) {
  const options = {
    candidateDir: undefined,
    pixelChangeThreshold: DEFAULT_PIXEL_CHANGE_THRESHOLD,
    minMaskRatio: 0.005,
    maxMaskRatio: 0.7,
    maxOutsideMeanDiff: 0.5,
    maxOutsideChangedRatio: 0.01,
    minInsideMeanDiff: 1,
    minInsideChangedRatio: 0.05,
  };
  for (const arg of args) {
    if (arg.startsWith('--candidate-dir=')) {
      options.candidateDir = arg.slice('--candidate-dir='.length);
    } else if (arg.startsWith('--pixel-change-threshold=')) {
      options.pixelChangeThreshold = numberOption(arg, '--pixel-change-threshold=');
    } else if (arg.startsWith('--min-mask-ratio=')) {
      options.minMaskRatio = numberOption(arg, '--min-mask-ratio=');
    } else if (arg.startsWith('--max-mask-ratio=')) {
      options.maxMaskRatio = numberOption(arg, '--max-mask-ratio=');
    } else if (arg.startsWith('--max-outside-mean-diff=')) {
      options.maxOutsideMeanDiff = numberOption(arg, '--max-outside-mean-diff=');
    } else if (arg.startsWith('--max-outside-changed-ratio=')) {
      options.maxOutsideChangedRatio = numberOption(
        arg,
        '--max-outside-changed-ratio=',
      );
    } else if (arg.startsWith('--min-inside-mean-diff=')) {
      options.minInsideMeanDiff = numberOption(arg, '--min-inside-mean-diff=');
    } else if (arg.startsWith('--min-inside-changed-ratio=')) {
      options.minInsideChangedRatio = numberOption(
        arg,
        '--min-inside-changed-ratio=',
      );
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  if (options.minMaskRatio > options.maxMaskRatio) {
    throw new Error('--min-mask-ratio must not exceed --max-mask-ratio.');
  }
  return options;
}

function numberOption(arg, prefix) {
  const value = Number(arg.slice(prefix.length));
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${prefix.slice(0, -1)} must be a non-negative number.`);
  }
  return value;
}

function assertInside(parent, child, label) {
  const path = relative(resolve(parent), resolve(child));
  if (path.startsWith('..') || isAbsolute(path)) {
    throw new Error(`${label} must remain under ${parent}: ${child}`);
  }
}
