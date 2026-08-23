import 'dotenv/config';
import { spawn } from 'node:child_process';
import { access, mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  prepareOutputDirectory,
  sha256,
  writeJson,
} from '../renderer/artifact-utils.mjs';
import { loadRendererConfig } from '../renderer/renderer-config.mjs';
import {
  assertSceneV2,
  validateSceneV2,
  type SceneV2,
} from '../animation/src/scene-v2';

const root = resolve('.');
const config = loadRendererConfig();
const scenePath = resolve(
  process.argv[2] ??
    'tools/animation/scenes/reel-01-shot-03-benchmark.scene-v2.json',
);
const scene = JSON.parse(await readFile(scenePath, 'utf8')) as SceneV2;
const validation = validateSceneV2(scene);
assertSceneV2(scene);

for (const warning of validation.warnings) {
  console.warn(`[scene-v2] ${warning}`);
}

for (const shot of scene.shots) {
  for (const layer of shot.layers.filter((item) => item.required)) {
    await access(resolve('assets', layer.assetPath));
  }
}

const outputDirectory = process.env.SCENE_V2_BENCHMARK_OUTPUT_DIRECTORY
  ? resolve(process.env.SCENE_V2_BENCHMARK_OUTPUT_DIRECTORY)
  : await prepareOutputDirectory(config.outputRoot, 'shot3-scene-v2-benchmark');
await mkdir(outputDirectory, { recursive: true });

const propsPath = join(outputDirectory, 'scene-v2-props.json');
const videoPath = join(outputDirectory, 'shot3-scene-v2-benchmark.mp4');
const manifestPath = join(outputDirectory, 'shot3-scene-v2-benchmark-manifest.json');
const contactSheetPath = join(outputDirectory, 'shot3-scene-v2-contact-sheet.png');
await writeJson(propsPath, { scene });

console.log(`Rendering ${scene.sceneId}...`);
console.log(`Scene: ${scenePath}`);
console.log(`Output: ${videoPath}`);

await run(
  'pnpm',
  [
    'exec',
    'remotion',
    'render',
    resolve('tools/animation/src/index.tsx'),
    'SceneV2Benchmark',
    videoPath,
    `--props=${propsPath}`,
    `--public-dir=${resolve('assets')}`,
    '--codec=h264',
    '--pixel-format=yuv420p',
    '--overwrite',
  ],
  root,
);

const reviewFrames: Array<{
  id: string;
  progress: number;
  frame: number;
  path: string;
  checksum: string;
}> = [];

for (const marker of scene.reviewMarkers) {
  const frame = Math.round(marker.progress * Math.max(0, scene.durationFrames - 1));
  const seconds = frame / scene.fps;
  const framePath = join(
    outputDirectory,
    `review-${String(frame).padStart(4, '0')}-${marker.id}.png`,
  );
  await run(
    config.ffmpegCommand,
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-ss',
      seconds.toFixed(6),
      '-i',
      videoPath,
      '-frames:v',
      '1',
      framePath,
    ],
    outputDirectory,
  );
  reviewFrames.push({
    id: marker.id,
    progress: marker.progress,
    frame,
    path: framePath,
    checksum: await sha256(framePath),
  });
}

if (reviewFrames.length) {
  const scaleWidth = 270;
  const scaleHeight = 480;
  const inputs = reviewFrames.flatMap((frame) => ['-i', frame.path]);
  const scaled = reviewFrames
    .map(
      (_frame, index) =>
        `[${index}:v]scale=${scaleWidth}:${scaleHeight}:force_original_aspect_ratio=decrease,pad=${scaleWidth}:${scaleHeight}:(ow-iw)/2:(oh-ih)/2:black[v${index}]`,
    )
    .join(';');
  const stackInputs = reviewFrames.map((_frame, index) => `[v${index}]`).join('');
  await run(
    config.ffmpegCommand,
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      ...inputs,
      '-filter_complex',
      `${scaled};${stackInputs}hstack=inputs=${reviewFrames.length}[sheet]`,
      '-map',
      '[sheet]',
      '-frames:v',
      '1',
      contactSheetPath,
    ],
    outputDirectory,
  );
}

await writeJson(manifestPath, {
  schemaVersion: 1,
  benchmarkType: 'scene-v2-shot-benchmark',
  generatedAt: new Date().toISOString(),
  engine: 'remotion',
  composition: 'SceneV2Benchmark',
  scenePath,
  sceneId: scene.sceneId,
  sourceShotNumber: scene.shots[0]?.sourceShotNumber,
  sourceStartFrame: scene.shots[0]?.sourceStartFrame,
  output: {
    path: videoPath,
    checksum: await sha256(videoPath),
    width: scene.width,
    height: scene.height,
    fps: scene.fps,
    durationFrames: scene.durationFrames,
    durationSeconds: scene.durationFrames / scene.fps,
  },
  reviewFrames,
  contactSheet: reviewFrames.length
    ? { path: contactSheetPath, checksum: await sha256(contactSheetPath) }
    : undefined,
  validation,
  reviewPolicy: scene.reviewPolicy,
  sourcePolicy: scene.sourcePolicy,
});

console.log(`Rendered benchmark: ${videoPath}`);
console.log(`Review contact sheet: ${contactSheetPath}`);
console.log(`Manifest: ${manifestPath}`);

async function run(command: string, args: string[], cwd: string): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
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
          `${command} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}.`,
        ),
      );
    });
  });
}
