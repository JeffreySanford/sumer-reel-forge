import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';

const PREVIEW_ROOT = resolve('tmp/animation-previews/shot03-layered-preview');
const EXPECTED_WIDTH = 1080;
const EXPECTED_HEIGHT = 1920;
const EXPECTED_FPS = 30;
const EXPECTED_DURATION_SECONDS = 7;
const DEFAULT_MIN_MEAN_DIFF = 0.02;
const DEFAULT_MIN_CHANGED_RATIO = 0.0001;
const DEFAULT_PIXEL_CHANGE_THRESHOLD = 2;
const DEFAULT_IGNORE_BOTTOM_PIXELS = 180;

const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
const previewDirectory = options.previewDir
  ? resolve(options.previewDir)
  : newestPreviewDirectory();
assertInside(PREVIEW_ROOT, previewDirectory, 'Layered preview directory');

const manifestPath = join(previewDirectory, 'preview-manifest.json');
if (!existsSync(manifestPath)) {
  throw new Error(`Layered preview manifest not found: ${manifestPath}`);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.previewType !== 'shot03-layered-candidate-preview') {
  throw new Error(
    `Expected shot03-layered-candidate-preview, found ${manifest.previewType ?? 'unknown'}.`,
  );
}
if (!Array.isArray(manifest.candidates) || manifest.candidates.length !== 4) {
  throw new Error('Layered preview must record exactly four required Shot 3 candidates.');
}
for (const candidate of manifest.candidates) {
  if (!candidate?.qaPath || !existsSync(candidate.qaPath)) {
    throw new Error(`Missing QA evidence for ${candidate?.layerId ?? 'unknown layer'}.`);
  }
  const qa = JSON.parse(readFileSync(candidate.qaPath, 'utf8'));
  if (qa.pass !== true) {
    throw new Error(`Recorded QA is not passing for ${candidate.layerId}.`);
  }
}

const videoPath = resolvePathInside(
  previewDirectory,
  manifest?.output?.path,
  'Layered preview video',
);
if (!videoPath || !existsSync(videoPath)) {
  throw new Error(`Layered preview video not found: ${videoPath}`);
}

const media = probeVideo(videoPath);
const videoStream = media.streams.find((stream) => stream.codec_type === 'video');
if (!videoStream) throw new Error('Layered preview MP4 has no video stream.');
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
    pass:
      Number.isFinite(durationSeconds) &&
      Math.abs(durationSeconds - EXPECTED_DURATION_SECONDS) < 0.25,
    actual: Number.isFinite(durationSeconds)
      ? `${durationSeconds.toFixed(3)}s`
      : 'unknown',
    expected: `~${EXPECTED_DURATION_SECONDS}s`,
  },
];

const reviewFrames = Array.isArray(manifest.reviewFrames)
  ? manifest.reviewFrames
  : [];
if (reviewFrames.length < 3) {
  throw new Error('Layered preview must contain opening, hero, and end review frames.');
}
const opening = findReviewFrame(reviewFrames, 'opening', 0);
const hero = findReviewFrame(reviewFrames, 'hero', 1);
const end = findReviewFrame(reviewFrames, 'end', 2);
const comparisons = [
  measureFrameDifference(opening.path, hero.path, 'opening→hero'),
  measureFrameDifference(hero.path, end.path, 'hero→end'),
];
const metadataPass = metadataChecks.every((check) => check.pass);
const motionPass = comparisons.every((comparison) => comparison.pass);
const pass = metadataPass && motionPass;

const report = {
  schemaVersion: 1,
  verificationType: 'shot03-layered-candidate-motion',
  generatedAt: new Date().toISOString(),
  previewDirectory,
  videoPath,
  pass,
  upstreamQaPass: true,
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
    comparisons,
    interpretation:
      'Passing proves the assembled candidate render changes over time. Human review must still confirm material motion, Enki/vessel attachment, mask edges, and cinematic coherence.',
  },
};
const reportPath = join(previewDirectory, 'motion-qa.json');
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log('Shot 3 layered candidate verification');
console.log(`Preview: ${previewDirectory}`);
console.log('[ok] upstream QA: background + water + vessel + Enki');
for (const check of metadataChecks) {
  console.log(
    `[${check.pass ? 'ok' : 'fail'}] ${check.label}: ${check.actual} (expected ${check.expected})`,
  );
}
for (const comparison of comparisons) {
  console.log(
    `[${comparison.pass ? 'ok' : 'fail'}] ${comparison.label}: mean diff ${comparison.meanAbsoluteDifference.toFixed(4)}, changed pixels ${(comparison.changedPixelRatio * 100).toFixed(4)}%`,
  );
}
console.log(`Layered motion QA: ${motionPass ? 'PASS' : 'FAIL'}`);
console.log(`Report: ${reportPath}`);
console.log('Human review remains the final gate.');
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
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `ffmpeg frame comparison failed for ${label}: ${String(result.stderr ?? '').trim()}`,
    );
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
  if (!path || !existsSync(path)) throw new Error(`Review frame not found: ${path}`);
  return path;
}

function probeVideo(path) {
  const result = spawnSync(
    process.env.FFPROBE_COMMAND ?? 'ffprobe',
    ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path],
    {
      cwd: previewDirectory,
      env: process.env,
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffprobe failed: ${String(result.stderr ?? '').trim()}`);
  }
  return JSON.parse(result.stdout);
}

function parseRate(rate) {
  if (typeof rate !== 'string' || !rate) return Number.NaN;
  const [numerator, denominator = '1'] = rate.split('/');
  const den = Number(denominator);
  return den ? Number(numerator) / den : Number.NaN;
}

function newestPreviewDirectory() {
  if (!existsSync(PREVIEW_ROOT)) {
    throw new Error(
      `Layered preview root does not exist: ${PREVIEW_ROOT}. Run pnpm animation:shot3:candidate-preview first.`,
    );
  }
  const directories = readdirSync(PREVIEW_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(PREVIEW_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  if (!directories.length) throw new Error(`No layered previews found under ${PREVIEW_ROOT}.`);
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
    previewDir: undefined,
    minMeanDiff: DEFAULT_MIN_MEAN_DIFF,
    minChangedRatio: DEFAULT_MIN_CHANGED_RATIO,
    pixelChangeThreshold: DEFAULT_PIXEL_CHANGE_THRESHOLD,
    ignoreBottomPixels: DEFAULT_IGNORE_BOTTOM_PIXELS,
  };
  for (const arg of args) {
    if (arg.startsWith('--preview-dir=')) {
      options.previewDir = arg.slice('--preview-dir='.length);
    } else if (arg.startsWith('--min-mean-diff=')) {
      options.minMeanDiff = numberOption(arg, '--min-mean-diff=');
    } else if (arg.startsWith('--min-changed-ratio=')) {
      options.minChangedRatio = numberOption(arg, '--min-changed-ratio=');
    } else if (arg.startsWith('--pixel-change-threshold=')) {
      options.pixelChangeThreshold = numberOption(arg, '--pixel-change-threshold=');
    } else if (arg.startsWith('--ignore-bottom-pixels=')) {
      options.ignoreBottomPixels = numberOption(arg, '--ignore-bottom-pixels=');
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  if (options.ignoreBottomPixels >= EXPECTED_HEIGHT) {
    throw new Error('--ignore-bottom-pixels must be less than preview height.');
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
