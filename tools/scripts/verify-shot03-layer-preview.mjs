import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';

const EXPECTED_WIDTH = 1080;
const EXPECTED_HEIGHT = 1920;
const EXPECTED_FPS = 30;
const EXPECTED_DURATION_SECONDS = 5;
const DEFAULT_MIN_MEAN_DIFF = 0.02;
const DEFAULT_MIN_CHANGED_RATIO = 0.0001;
const DEFAULT_PIXEL_CHANGE_THRESHOLD = 2;
const DEFAULT_IGNORE_BOTTOM_PIXELS = 180;

const LAYERS = {
  water: {
    layerId: 'shot03-water-v1',
    previewRoot: resolve('tmp/animation-previews/shot03-water-preview'),
    previewCommand: 'pnpm comfyui:water:preview',
  },
  vessel: {
    layerId: 'shot03-vessel-v1',
    previewRoot: resolve('tmp/animation-previews/shot03-vessel-preview'),
    previewCommand: 'pnpm comfyui:vessel:preview',
  },
};

const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
const layer = LAYERS[options.layer];
const previewDirectory = options.previewDir
  ? resolve(options.previewDir)
  : newestPreviewDirectory(layer.previewRoot, layer.previewCommand);
assertInside(layer.previewRoot, previewDirectory, 'Preview directory');

const manifestPath = join(previewDirectory, 'preview-manifest.json');
if (!existsSync(manifestPath)) throw new Error(`Preview manifest not found: ${manifestPath}`);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.layerId !== layer.layerId) {
  throw new Error(`Expected ${layer.layerId}, found ${manifest.layerId ?? 'unknown'} in preview manifest.`);
}

const videoPath = resolvePathInside(
  previewDirectory,
  manifest?.output?.path,
  'Preview video',
);
if (!videoPath || !existsSync(videoPath)) throw new Error(`Preview video not found: ${videoPath}`);

const media = probeVideo(videoPath, previewDirectory);
const videoStream = media.streams.find((stream) => stream.codec_type === 'video');
if (!videoStream) throw new Error('Preview MP4 has no video stream.');

const width = Number(videoStream.width);
const height = Number(videoStream.height);
const fps = parseRate(videoStream.avg_frame_rate || videoStream.r_frame_rate);
const durationSeconds = Number(media.format?.duration ?? videoStream.duration);
const metadataChecks = [
  {
    label: 'dimensions',
    pass: width === EXPECTED_WIDTH && height === EXPECTED_HEIGHT,
    actual: `${width}x${height}`,
    expected: `${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}`,
  },
  {
    label: 'fps',
    pass: Math.abs(fps - EXPECTED_FPS) < 0.05,
    actual: Number.isFinite(fps) ? fps.toFixed(3) : 'unknown',
    expected: `${EXPECTED_FPS}`,
  },
  {
    label: 'duration',
    pass: Number.isFinite(durationSeconds) && Math.abs(durationSeconds - EXPECTED_DURATION_SECONDS) < 0.2,
    actual: Number.isFinite(durationSeconds) ? `${durationSeconds.toFixed(3)}s` : 'unknown',
    expected: `~${EXPECTED_DURATION_SECONDS}s`,
  },
];

const reviewFrames = Array.isArray(manifest.reviewFrames) ? manifest.reviewFrames : [];
if (reviewFrames.length < 3) {
  throw new Error(`Expected at least 3 review frames in ${manifestPath}; found ${reviewFrames.length}.`);
}

const opening = findReviewFrame(reviewFrames, 'opening', 0);
const hero = findReviewFrame(reviewFrames, 'hero', 1);
const end = findReviewFrame(reviewFrames, 'end', 2);
const comparisons = [
  measureFrameDifference(opening.path, hero.path, 'opening→hero'),
  measureFrameDifference(hero.path, end.path, 'hero→end'),
];
const motionPass = comparisons.every((comparison) => comparison.pass);
const metadataPass = metadataChecks.every((check) => check.pass);
const pass = metadataPass && motionPass;

const report = {
  schemaVersion: 1,
  verificationType: 'rendered-animation-motion',
  generatedAt: new Date().toISOString(),
  layerId: layer.layerId,
  previewDirectory,
  videoPath,
  pass,
  metadata: {
    pass: metadataPass,
    width,
    height,
    fps,
    durationSeconds,
    checks: metadataChecks,
  },
  motion: {
    pass: motionPass,
    minMeanAbsoluteDifference: options.minMeanDiff,
    minChangedPixelRatio: options.minChangedRatio,
    pixelChangeThreshold: options.pixelChangeThreshold,
    ignoreBottomPixels: options.ignoreBottomPixels,
    note:
      'Motion is measured from decoded review-frame pixels above the review-guide region. Passing proves rendered pixels changed; human review still decides whether the motion is physically and artistically correct.',
    comparisons,
  },
};
const reportPath = join(previewDirectory, 'motion-qa.json');
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Shot 3 ${options.layer} rendered-motion verification`);
console.log(`Preview: ${previewDirectory}`);
for (const check of metadataChecks) {
  console.log(`[${check.pass ? 'ok' : 'fail'}] ${check.label}: ${check.actual} (expected ${check.expected})`);
}
for (const comparison of comparisons) {
  console.log(
    `[${comparison.pass ? 'ok' : 'fail'}] ${comparison.label}: mean diff ${comparison.meanAbsoluteDifference.toFixed(4)}, changed pixels ${(comparison.changedPixelRatio * 100).toFixed(4)}%`,
  );
}
console.log(`Motion QA: ${motionPass ? 'PASS' : 'FAIL'}`);
console.log(`Report: ${reportPath}`);
if (!pass) process.exitCode = 2;

function measureFrameDifference(firstPath, secondPath, label) {
  const first = resolveReviewFrame(firstPath);
  const second = resolveReviewFrame(secondPath);
  const cropHeight = EXPECTED_HEIGHT - options.ignoreBottomPixels;
  const result = spawnSync(
    process.env.FFMPEG_COMMAND ?? 'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      first,
      '-i',
      second,
      '-filter_complex',
      `[0:v]crop=${EXPECTED_WIDTH}:${cropHeight}:0:0[a];[1:v]crop=${EXPECTED_WIDTH}:${cropHeight}:0:0[b];[a][b]blend=all_mode=difference,format=gray`,
      '-frames:v',
      '1',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'gray',
      'pipe:1',
    ],
    {
      cwd: previewDirectory,
      env: process.env,
      encoding: null,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
      shell: process.platform === 'win32',
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg frame comparison failed for ${label}: ${String(result.stderr ?? '').trim()}`);
  }
  const pixels = result.stdout;
  if (!Buffer.isBuffer(pixels) || pixels.length === 0) {
    throw new Error(`No comparison pixels were produced for ${label}.`);
  }
  let sum = 0;
  let changed = 0;
  for (const value of pixels) {
    sum += value;
    if (value > options.pixelChangeThreshold) changed += 1;
  }
  const meanAbsoluteDifference = sum / pixels.length;
  const changedPixelRatio = changed / pixels.length;
  return {
    label,
    first,
    second,
    comparedPixels: pixels.length,
    meanAbsoluteDifference,
    changedPixelRatio,
    pass:
      meanAbsoluteDifference >= options.minMeanDiff &&
      changedPixelRatio >= options.minChangedRatio,
  };
}

function findReviewFrame(frames, id, fallbackIndex) {
  const frame = frames.find((entry) => entry?.id === id) ?? frames[fallbackIndex];
  if (!frame?.path) throw new Error(`Missing ${id} review frame path.`);
  return frame;
}

function resolveReviewFrame(rawPath) {
  const path = resolvePathInside(previewDirectory, rawPath, 'Review frame');
  if (!existsSync(path)) throw new Error(`Review frame not found: ${path}`);
  return path;
}

function probeVideo(path, cwd) {
  const result = spawnSync(
    process.env.FFPROBE_COMMAND ?? 'ffprobe',
    ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path],
    {
      cwd,
      env: process.env,
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
      shell: process.platform === 'win32',
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffprobe failed: ${String(result.stderr ?? '').trim()}`);
  return JSON.parse(result.stdout);
}

function parseRate(rate) {
  if (typeof rate !== 'string' || !rate) return Number.NaN;
  const [numerator, denominator = '1'] = rate.split('/');
  const den = Number(denominator);
  return den ? Number(numerator) / den : Number.NaN;
}

function newestPreviewDirectory(root, previewCommand) {
  if (!existsSync(root)) {
    throw new Error(`Preview root does not exist: ${root}. Run ${previewCommand} first.`);
  }
  const directories = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  if (!directories.length) throw new Error(`No preview directories found under ${root}.`);
  return directories[0];
}

function resolvePathInside(parent, rawPath, label) {
  if (typeof rawPath !== 'string' || !rawPath) return undefined;
  const candidate = isAbsolute(rawPath) ? resolve(rawPath) : resolve(parent, rawPath);
  assertInside(parent, candidate, label);
  return candidate;
}

function assertInside(parent, child, label) {
  const path = relative(resolve(parent), resolve(child));
  if (path.startsWith('..') || isAbsolute(path)) {
    throw new Error(`${label} must remain under ${parent}: ${child}`);
  }
}

function parseOptions(args) {
  const options = {
    layer: 'water',
    previewDir: undefined,
    minMeanDiff: DEFAULT_MIN_MEAN_DIFF,
    minChangedRatio: DEFAULT_MIN_CHANGED_RATIO,
    pixelChangeThreshold: DEFAULT_PIXEL_CHANGE_THRESHOLD,
    ignoreBottomPixels: DEFAULT_IGNORE_BOTTOM_PIXELS,
  };
  for (const arg of args) {
    if (arg.startsWith('--layer=')) options.layer = arg.slice('--layer='.length);
    else if (arg.startsWith('--preview-dir=')) options.previewDir = arg.slice('--preview-dir='.length);
    else if (arg.startsWith('--min-mean-diff=')) options.minMeanDiff = numberOption(arg, '--min-mean-diff=');
    else if (arg.startsWith('--min-changed-ratio=')) options.minChangedRatio = numberOption(arg, '--min-changed-ratio=');
    else if (arg.startsWith('--pixel-change-threshold=')) options.pixelChangeThreshold = numberOption(arg, '--pixel-change-threshold=');
    else if (arg.startsWith('--ignore-bottom-pixels=')) options.ignoreBottomPixels = numberOption(arg, '--ignore-bottom-pixels=');
    else throw new Error(`Unknown option ${arg}`);
  }
  if (!(options.layer in LAYERS)) throw new Error('--layer must be water or vessel.');
  if (options.ignoreBottomPixels >= EXPECTED_HEIGHT) {
    throw new Error('--ignore-bottom-pixels must be less than the preview height.');
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
