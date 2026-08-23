import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';

const PREVIEW_BASE = resolve('tmp/animation-previews');
const DEFAULT_MIN_MEAN_DIFF = 0.01;
const DEFAULT_MIN_CHANGED_RATIO = 0.00005;
const DEFAULT_PIXEL_CHANGE_THRESHOLD = 2;

const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
const shotLabel = String(options.shotNumber).padStart(2, '0');
const previewRoot = resolve(PREVIEW_BASE, `shot${shotLabel}-layered-preview`);
const previewDirectory = options.previewDir
  ? resolve(options.previewDir)
  : newestPreviewDirectory(previewRoot, options.shotNumber);
assertInside(previewRoot, previewDirectory, `Shot ${options.shotNumber} preview directory`);

const manifestPath = join(previewDirectory, 'preview-manifest.json');
if (!existsSync(manifestPath)) {
  throw new Error(`Layered preview manifest not found: ${manifestPath}`);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const expectedPreviewType = `shot${shotLabel}-layered-candidate-preview`;
if (manifest.previewType !== expectedPreviewType) {
  throw new Error(
    `Expected ${expectedPreviewType}, found ${manifest.previewType ?? 'unknown'}.`,
  );
}
if (manifest.sourceShotNumber !== options.shotNumber) {
  throw new Error(
    `Preview sourceShotNumber ${manifest.sourceShotNumber ?? 'unknown'} does not match Shot ${options.shotNumber}.`,
  );
}
if (manifest.assetResolution?.mode !== 'layered') {
  throw new Error(
    `Candidate audition must resolve through layered Scene V2 mode; found ${manifest.assetResolution?.mode ?? 'unknown'}.`,
  );
}

if (!Array.isArray(manifest.candidates) || !manifest.candidates.length) {
  throw new Error('Layered preview must record the required candidate set.');
}
const upstream = [];
for (const candidate of manifest.candidates) {
  if (!candidate?.qaPath || !existsSync(candidate.qaPath)) {
    throw new Error(`Missing QA evidence for ${candidate?.layerId ?? 'unknown layer'}.`);
  }
  const qa = JSON.parse(readFileSync(candidate.qaPath, 'utf8'));
  const pass = qa.pass === true || qa.qaStatus === 'PASS';
  if (!pass) {
    throw new Error(`Recorded upstream QA is not passing for ${candidate.layerId}.`);
  }
  upstream.push({
    layerId: candidate.layerId,
    qaPath: candidate.qaPath,
    coverageAdvisory: candidate.coverageAdvisory ?? null,
    pass: true,
  });
}

const render = manifest.renderCanvas ?? {};
const expectedWidth = Number(render.width);
const expectedHeight = Number(render.height);
const expectedFps = Number(render.fps);
const durationFrames = Number(render.durationFrames);
if (
  !Number.isFinite(expectedWidth) ||
  !Number.isFinite(expectedHeight) ||
  !Number.isFinite(expectedFps) ||
  !Number.isFinite(durationFrames)
) {
  throw new Error('Preview manifest has incomplete renderCanvas metadata.');
}
const expectedDurationSeconds = durationFrames / expectedFps;
const videoPath = resolvePathInside(
  previewDirectory,
  manifest?.output?.path,
  'Layered candidate preview video',
);
if (!videoPath || !existsSync(videoPath)) {
  throw new Error(`Layered candidate preview video not found: ${videoPath}`);
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
    pass: width === expectedWidth && height === expectedHeight,
    actual: `${width}x${height}`,
    expected: `${expectedWidth}x${expectedHeight}`,
  },
  {
    label: 'fps',
    pass: Math.abs(fps - expectedFps) < 0.05,
    actual: Number.isFinite(fps) ? fps.toFixed(3) : 'unknown',
    expected: `${expectedFps}`,
  },
  {
    label: 'duration',
    pass:
      Number.isFinite(durationSeconds) &&
      Math.abs(durationSeconds - expectedDurationSeconds) < 0.25,
    actual: Number.isFinite(durationSeconds)
      ? `${durationSeconds.toFixed(3)}s`
      : 'unknown',
    expected: `~${expectedDurationSeconds.toFixed(3)}s`,
  },
];

const reviewFrames = Array.isArray(manifest.reviewFrames)
  ? [...manifest.reviewFrames].sort((a, b) => a.progress - b.progress)
  : [];
if (reviewFrames.length < 2) {
  throw new Error('Generic candidate motion QA requires at least two review frames.');
}
const comparisons = [];
for (let index = 0; index < reviewFrames.length - 1; index += 1) {
  const first = reviewFrames[index];
  const second = reviewFrames[index + 1];
  comparisons.push(
    measureFrameDifference(
      first.path,
      second.path,
      `${first.id}→${second.id}`,
      expectedWidth,
      expectedHeight,
    ),
  );
}

const metadataPass = metadataChecks.every((check) => check.pass);
const motionPass = comparisons.every((comparison) => comparison.pass);
const pass = metadataPass && motionPass;
const humanContext = manifest.humanReview ?? {};
const cameraMotion = inspectCameraMotion(manifest.scenePath, options.shotNumber);
const report = {
  schemaVersion: 1,
  verificationType: 'generic-scene-v2-layered-candidate-aggregate-motion',
  generatedAt: new Date().toISOString(),
  sourceShotNumber: options.shotNumber,
  shotId: manifest.shotId ?? null,
  sceneId: manifest.sceneId ?? null,
  previewDirectory,
  videoPath,
  pass,
  upstreamQaPass: true,
  upstream,
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
    scope: 'aggregate-scene-frame-difference',
    materialLocalProof: false,
    cameraMotionPresent: cameraMotion.present,
    cameraMotion,
    minMeanAbsoluteDifference: options.minMeanDiff,
    minChangedPixelRatio: options.minChangedRatio,
    pixelChangeThreshold: options.pixelChangeThreshold,
    ignoreTopPixels: options.ignoreTopPixels,
    ignoreBottomPixels: options.ignoreBottomPixels,
    comparisons,
    interpretation: cameraMotion.present
      ? 'Passing proves aggregate visual change between Scene V2 review beats, but camera motion contributes to the measurement. This result does not independently prove material-local motion. Human review and material-local QA remain required for material realism.'
      : 'Passing proves aggregate visual change between Scene V2 review beats. This result still does not independently prove that each animated material contributes useful or realistic motion.',
  },
  humanReview: {
    required: true,
    stillnessAnchor: humanContext.stillnessAnchor ?? null,
    eyeTarget: humanContext.eyeTarget ?? null,
    emotionalPurpose: humanContext.emotionalPurpose ?? null,
    questions: [
      `Does the stillness anchor (${humanContext.stillnessAnchor ?? 'defined composition anchor'}) remain visually stable?`,
      `Does motion support the eye target (${humanContext.eyeTarget ?? 'defined eye target'}) rather than compete with it?`,
      'Do all moving materials behave according to their physical/material character instead of as translated cards?',
      'Do provisional production lanes look strong enough to become reusable knowledge, or do they need another benchmark iteration?',
      'Would this shot be acceptable as a production benchmark after human review?',
    ],
  },
};
const reportPath = join(previewDirectory, 'motion-qa.json');
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`Shot ${options.shotNumber} generic layered candidate verification`);
console.log(`Preview: ${previewDirectory}`);
console.log(`[ok] upstream QA: ${upstream.length}/${upstream.length} required candidates`);
for (const item of upstream) {
  console.log(
    `[ok] ${item.layerId}${item.coverageAdvisory ? ` · ${item.coverageAdvisory}` : ''}`,
  );
}
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
console.log(`Aggregate Scene V2 motion QA: ${motionPass ? 'PASS' : 'FAIL'}`);
if (cameraMotion.present) {
  console.log(
    '[review] Camera motion contributes to aggregate frame differences; this check does NOT independently prove material-local motion.',
  );
}
console.log(`Report: ${reportPath}`);
console.log('Human semantic/cinematic review remains the final gate.');
if (!pass) process.exitCode = 2;

function measureFrameDifference(
  firstPath,
  secondPath,
  label,
  expectedWidth,
  expectedHeight,
) {
  const first = resolveReviewFrame(firstPath);
  const second = resolveReviewFrame(secondPath);
  const top = manifest.showReviewGuides ? options.ignoreTopPixels : 0;
  const bottom = manifest.showReviewGuides ? options.ignoreBottomPixels : 0;
  const cropHeight = expectedHeight - top - bottom;
  if (cropHeight <= 0) {
    throw new Error('Review-guide exclusion leaves no pixels for motion QA.');
  }
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
      `[0:v]crop=${expectedWidth}:${cropHeight}:0:${top}[a];[1:v]crop=${expectedWidth}:${cropHeight}:0:${top}[b];[a][b]blend=all_mode=difference,format=gray`,
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
      maxBuffer: 24 * 1024 * 1024,
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

function inspectCameraMotion(scenePath, shotNumber) {
  if (typeof scenePath !== 'string' || !scenePath) {
    return { present: false, available: false };
  }
  const path = resolve(scenePath);
  if (!existsSync(path)) {
    return { present: false, available: false, scenePath: path };
  }
  try {
    const scene = JSON.parse(readFileSync(path, 'utf8'));
    const shot = scene.shots?.find(
      (item) => item.sourceShotNumber === shotNumber || item.id === manifest.shotId,
    );
    const camera = shot?.camera;
    if (!camera) return { present: false, available: true, scenePath: path };
    const scaleDelta = Math.abs(Number(camera.scaleTo ?? 1) - Number(camera.scaleFrom ?? 1));
    const xDelta = Math.abs(Number(camera.xTo ?? 0) - Number(camera.xFrom ?? 0));
    const yDelta = Math.abs(Number(camera.yTo ?? 0) - Number(camera.yFrom ?? 0));
    const rotationDelta = Math.abs(
      Number(camera.rotationTo ?? 0) - Number(camera.rotationFrom ?? 0),
    );
    return {
      present: scaleDelta > 0.000001 || xDelta > 0.000001 || yDelta > 0.000001 || rotationDelta > 0.000001,
      available: true,
      scenePath: path,
      preset: camera.preset ?? null,
      scaleDelta,
      xDelta,
      yDelta,
      rotationDelta,
    };
  } catch (error) {
    return {
      present: false,
      available: false,
      scenePath: path,
      error: error instanceof Error ? error.message : String(error),
    };
  }
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

function newestPreviewDirectory(root, shotNumber) {
  if (!existsSync(root)) {
    throw new Error(
      `Shot ${shotNumber} preview root does not exist: ${root}. Run the generic candidate preview first.`,
    );
  }
  const directories = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  if (!directories.length) {
    throw new Error(`No Shot ${shotNumber} previews found under ${root}.`);
  }
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
  const result = {
    shotNumber: 0,
    previewDir: undefined,
    minMeanDiff: DEFAULT_MIN_MEAN_DIFF,
    minChangedRatio: DEFAULT_MIN_CHANGED_RATIO,
    pixelChangeThreshold: DEFAULT_PIXEL_CHANGE_THRESHOLD,
    ignoreTopPixels: 150,
    ignoreBottomPixels: 40,
  };
  for (const arg of args) {
    if (arg.startsWith('--shot=')) {
      const value = Number(arg.slice('--shot='.length));
      if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid ${arg}`);
      result.shotNumber = value;
    } else if (arg.startsWith('--preview-dir=')) {
      result.previewDir = arg.slice('--preview-dir='.length);
    } else if (arg.startsWith('--min-mean-diff=')) {
      result.minMeanDiff = numberOption(arg, '--min-mean-diff=');
    } else if (arg.startsWith('--min-changed-ratio=')) {
      result.minChangedRatio = numberOption(arg, '--min-changed-ratio=');
    } else if (arg.startsWith('--pixel-change-threshold=')) {
      result.pixelChangeThreshold = numberOption(arg, '--pixel-change-threshold=');
    } else if (arg.startsWith('--ignore-top-pixels=')) {
      result.ignoreTopPixels = numberOption(arg, '--ignore-top-pixels=');
    } else if (arg.startsWith('--ignore-bottom-pixels=')) {
      result.ignoreBottomPixels = numberOption(arg, '--ignore-bottom-pixels=');
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  if (!result.shotNumber) throw new Error('--shot=<number> is required.');
  return result;
}

function numberOption(arg, prefix) {
  const value = Number(arg.slice(prefix.length));
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${prefix.slice(0, -1)} must be a non-negative number.`);
  }
  return value;
}
