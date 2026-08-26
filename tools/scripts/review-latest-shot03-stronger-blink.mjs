import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { maybeOpenReviewArtifacts } from './open-review-artifacts.mjs';

const ROOT = resolve('.');
const PROOF_ROOT = resolve(
  'tmp/animation-previews/pixi-shot03-recovered-blink-replacement-proof',
);
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const FPS = 30;
const FRAME_WIDTH = 1080;
const FRAME_HEIGHT = 1920;
const WINDOW_START_FRAME = 88;
const WINDOW_END_FRAME = 115;

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const latest = await latestPassingProof();
  const primaryReportPath = resolve(latest.report.sourcePrimaryMotionProofPath ?? '');
  if (!primaryReportPath || !existsSync(primaryReportPath)) {
    throw new Error(`Primary motion proof receipt is missing: ${primaryReportPath}`);
  }
  const primaryReport = JSON.parse(await readFile(primaryReportPath, 'utf8'));
  const controlFramesDirectory = resolve(
    primaryReport.artifacts?.activeFramesDirectory ?? '',
  );
  const controlVideoPath = resolve(
    latest.report.artifacts?.acceptedPrimaryControlVideo ??
      primaryReport.artifacts?.activeVideo ??
      '',
  );
  const activeVideoPath = resolve(latest.report.artifacts?.blinkActiveVideo ?? '');
  const activeFramesDirectory = resolve(
    latest.report.artifacts?.fullActiveFramesDirectory ?? '',
  );

  for (const path of [
    controlFramesDirectory,
    controlVideoPath,
    activeVideoPath,
    activeFramesDirectory,
  ]) {
    if (!path || !existsSync(path)) {
      throw new Error(`Required stronger-blink review artifact is missing: ${path}`);
    }
  }

  const localization = latest.report.isolation?.candidateApexLocalization;
  const bounds = localization?.bounds;
  if (!bounds) throw new Error('Stronger-blink receipt has no apex localization bounds.');

  const faceCrop = buildFullHeadCrop(bounds);
  const reviewDirectory = join(latest.directory, 'human-review');
  await mkdir(reviewDirectory, { recursive: true });

  const faceAbPath = join(
    reviewDirectory,
    'shot03-stronger-blink-full-head-ab-normal-speed.mp4',
  );
  const faceWindowPath = join(
    reviewDirectory,
    'shot03-stronger-blink-full-head-window-normal-speed.mp4',
  );
  const apexFrame = Number(latest.report.isolation?.candidateApexFrame ?? 99);
  const apexControlPath = join(
    controlFramesDirectory,
    `frame-${String(apexFrame).padStart(4, '0')}.png`,
  );
  const apexActivePath = join(
    activeFramesDirectory,
    `frame-${String(apexFrame).padStart(4, '0')}.png`,
  );
  const apexPairPath = join(
    reviewDirectory,
    `shot03-stronger-blink-full-head-apex-${String(apexFrame).padStart(4, '0')}.png`,
  );
  if (!existsSync(apexControlPath) || !existsSync(apexActivePath)) {
    throw new Error('Apex control/active frames are missing from the existing proof.');
  }

  console.log('Shot 3 stronger-blink corrected human review');
  console.log(`Proof: ${latest.reportPath}`);
  console.log(
    `Full-head crop: ${faceCrop.width}x${faceCrop.height} @ (${faceCrop.x},${faceCrop.y})`,
  );
  console.log('Policy: review-only; no regeneration, no candidate mutation, no motion changes.');

  encodeFaceAb(controlVideoPath, activeVideoPath, faceCrop, faceAbPath);
  encodeFaceWindow(controlVideoPath, activeVideoPath, faceCrop, faceWindowPath);
  createFacePair(apexControlPath, apexActivePath, faceCrop, apexPairPath);

  console.log(`[REVIEW] full 7s normal-speed face A/B: ${faceAbPath}`);
  console.log(`[REVIEW] blink-window normal-speed face A/B: ${faceWindowPath}`);
  console.log(`[REVIEW] full-head apex still: ${apexPairPath}`);
  console.log(
    '[GATE] If the blink is still not naturally visible at normal speed, keep the blink channel rejected and move on.',
  );

  await maybeOpenReviewArtifacts([faceAbPath, faceWindowPath, apexPairPath], {
    enabled: true,
    delayMs: 120,
  });
}

async function latestPassingProof() {
  const entries = await readdir(PROOF_ROOT, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(PROOF_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));

  for (const directory of directories) {
    const reportPath = join(
      directory,
      'pixi-shot03-recovered-blink-replacement-proof.json',
    );
    if (!existsSync(reportPath)) continue;
    try {
      const report = JSON.parse(await readFile(reportPath, 'utf8'));
      if (report.proofType !== 'pixi-shot03-recovered-blink-replacement-proof') {
        continue;
      }
      if (report.technicalEvidence?.pass !== true) continue;
      return { directory, reportPath, report };
    } catch {
      continue;
    }
  }
  throw new Error('No passing stronger Shot 3 blink proof was found.');
}

function buildFullHeadCrop(bounds) {
  const centerX = bounds.x + bounds.width / 2;
  const width = 620;
  const height = 420;
  const x = clamp(Math.round(centerX - width / 2), 0, FRAME_WIDTH - width);
  // Enki's eyes sit very near the top of the rendered composition. Always begin
  // at y=0 so the diagnostic cannot crop away forehead/head context above them.
  return { x, y: 0, width, height };
}

function encodeFaceAb(controlPath, activePath, crop, outputPath) {
  const cropFilter = `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`;
  runFfmpeg([
    '-i', controlPath,
    '-i', activePath,
    '-filter_complex',
    `[0:v]${cropFilter},scale=620:-2[left];[1:v]${cropFilter},scale=620:-2[right];[left][right]hstack=inputs=2[v]`,
    '-map', '[v]',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-r', String(FPS),
    '-shortest',
    outputPath,
  ]);
}

function encodeFaceWindow(controlPath, activePath, crop, outputPath) {
  const start = WINDOW_START_FRAME / FPS;
  const duration = (WINDOW_END_FRAME - WINDOW_START_FRAME + 1) / FPS;
  const cropFilter = `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`;
  runFfmpeg([
    '-ss', String(start),
    '-t', String(duration),
    '-i', controlPath,
    '-ss', String(start),
    '-t', String(duration),
    '-i', activePath,
    '-filter_complex',
    `[0:v]${cropFilter},scale=620:-2[left];[1:v]${cropFilter},scale=620:-2[right];[left][right]hstack=inputs=2[v]`,
    '-map', '[v]',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-r', String(FPS),
    '-shortest',
    outputPath,
  ]);
}

function createFacePair(controlPath, activePath, crop, outputPath) {
  const cropFilter = `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`;
  runFfmpeg([
    '-i', controlPath,
    '-i', activePath,
    '-filter_complex',
    `[0:v]${cropFilter},scale=620:-2[left];[1:v]${cropFilter},scale=620:-2[right];[left][right]hstack=inputs=2[v]`,
    '-map', '[v]',
    '-frames:v', '1',
    outputPath,
  ]);
}

function runFfmpeg(args) {
  const result = spawnSync(
    FFMPEG,
    ['-y', '-hide_banner', '-loglevel', 'error', ...args],
    {
      cwd: ROOT,
      stdio: 'inherit',
      windowsHide: true,
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed with exit ${result.status ?? 1}.`);
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
