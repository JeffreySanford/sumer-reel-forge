import 'dotenv/config';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  prepareOutputDirectory,
  sha256,
  writeJson,
} from '../renderer/artifact-utils.mjs';
import { loadRendererConfig } from '../renderer/renderer-config.mjs';
import {
  assertSceneV2,
  type SceneV2,
} from '../animation/src/scene-v2';
import type { WaterMaterialHandoffConfig } from '../animation/src/SceneV2WaterHandoff';

interface WaterHandoffBenchmarkConfig {
  schemaVersion: 1;
  transitionId: string;
  projectSlug: string;
  chapterNumber: number;
  episodeNumber: number;
  width: number;
  height: number;
  fps: number;
  outgoingScenePath: string;
  incomingScenePath: string;
  transition: WaterMaterialHandoffConfig;
  reviewMarkers: Array<{ id: string; frame: number }>;
  reviewPolicy: {
    humanApprovalRequired: boolean;
    hardFails: string[];
  };
}

async function main(): Promise<void> {
  const root = resolve('.');
  const rendererConfig = loadRendererConfig();
  const configPath = resolve(
    process.argv[2] ??
      'tools/animation/scenes/reel-01-shot-03-to-04-water-handoff.json',
  );
  const benchmark = JSON.parse(
    await readFile(configPath, 'utf8'),
  ) as WaterHandoffBenchmarkConfig;
  validateBenchmark(benchmark);

  const outgoingPath = resolve(benchmark.outgoingScenePath);
  const incomingPath = resolve(benchmark.incomingScenePath);
  const outgoingScene = JSON.parse(
    await readFile(outgoingPath, 'utf8'),
  ) as SceneV2;
  const incomingScene = JSON.parse(
    await readFile(incomingPath, 'utf8'),
  ) as SceneV2;
  assertSceneV2(outgoingScene);
  assertSceneV2(incomingScene);

  if (outgoingScene.fps !== incomingScene.fps) {
    throw new Error('Water handoff requires matching outgoing/incoming fps.');
  }
  if (
    outgoingScene.width !== incomingScene.width ||
    outgoingScene.height !== incomingScene.height
  ) {
    throw new Error('Water handoff requires matching scene dimensions.');
  }

  const durationFrames =
    outgoingScene.durationFrames + incomingScene.durationFrames;
  for (const marker of benchmark.reviewMarkers) {
    if (marker.frame < 0 || marker.frame >= durationFrames) {
      throw new Error(
        `Review marker ${marker.id} frame ${marker.frame} is outside the ${durationFrames}-frame transition benchmark.`,
      );
    }
  }

  const outputDirectory = process.env.WATER_HANDOFF_BENCHMARK_OUTPUT_DIRECTORY
    ? resolve(process.env.WATER_HANDOFF_BENCHMARK_OUTPUT_DIRECTORY)
    : await prepareOutputDirectory(
        rendererConfig.outputRoot,
        'shot3-to-shot4-water-handoff',
      );
  await mkdir(outputDirectory, { recursive: true });

  const propsPath = join(outputDirectory, 'water-handoff-props.json');
  const videoPath = join(
    outputDirectory,
    'shot3-to-shot4-water-handoff-benchmark.mp4',
  );
  const contactSheetPath = join(
    outputDirectory,
    'shot3-to-shot4-water-handoff-contact-sheet.png',
  );
  const manifestPath = join(
    outputDirectory,
    'shot3-to-shot4-water-handoff-manifest.json',
  );

  await writeJson(propsPath, {
    outgoingScene,
    incomingScene,
    transition: benchmark.transition,
  });

  console.log(`Rendering ${benchmark.transitionId}...`);
  console.log(`Outgoing: ${outgoingPath}`);
  console.log(`Incoming: ${incomingPath}`);
  console.log(`Output: ${videoPath}`);

  await run(
    'pnpm',
    [
      'exec',
      'remotion',
      'render',
      resolve('tools/animation/src/index.tsx'),
      'SceneV2WaterHandoff',
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
    frame: number;
    seconds: number;
    path: string;
    checksum: string;
  }> = [];

  for (const marker of benchmark.reviewMarkers) {
    const seconds = marker.frame / benchmark.fps;
    const framePath = join(
      outputDirectory,
      `review-${String(marker.frame).padStart(4, '0')}-${marker.id}.png`,
    );
    await run(
      rendererConfig.ffmpegCommand,
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
      frame: marker.frame,
      seconds,
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
    const stackInputs = reviewFrames
      .map((_frame, index) => `[v${index}]`)
      .join('');
    await run(
      rendererConfig.ffmpegCommand,
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
    benchmarkType: 'scene-v2-water-material-handoff',
    generatedAt: new Date().toISOString(),
    engine: 'remotion',
    composition: 'SceneV2WaterHandoff',
    transitionId: benchmark.transitionId,
    configPath,
    outgoingScene: {
      path: outgoingPath,
      sceneId: outgoingScene.sceneId,
      sourceShotNumber: outgoingScene.shots[0]?.sourceShotNumber,
    },
    incomingScene: {
      path: incomingPath,
      sceneId: incomingScene.sceneId,
      sourceShotNumber: incomingScene.shots[0]?.sourceShotNumber,
    },
    transition: benchmark.transition,
    output: {
      path: videoPath,
      checksum: await sha256(videoPath),
      width: benchmark.width,
      height: benchmark.height,
      fps: benchmark.fps,
      durationFrames,
      durationSeconds: durationFrames / benchmark.fps,
    },
    reviewFrames,
    contactSheet: reviewFrames.length
      ? { path: contactSheetPath, checksum: await sha256(contactSheetPath) }
      : undefined,
    reviewPolicy: benchmark.reviewPolicy,
  });

  console.log(`Rendered benchmark: ${videoPath}`);
  console.log(`Review contact sheet: ${contactSheetPath}`);
  console.log(`Manifest: ${manifestPath}`);
}

function validateBenchmark(config: WaterHandoffBenchmarkConfig): void {
  if (config.schemaVersion !== 1) {
    throw new Error('Water handoff benchmark schemaVersion must be 1.');
  }
  if (config.transition.type !== 'waterMaterialHandoff') {
    throw new Error('Water handoff benchmark must use waterMaterialHandoff.');
  }
  if (config.transition.genericDissolveAllowed) {
    throw new Error('Generic dissolve is not allowed for the water handoff.');
  }
  if (!config.transition.materialContinuityRequired) {
    throw new Error('Water material continuity must remain required.');
  }
  if (
    config.transition.preRollFrames <= 0 ||
    config.transition.postRollFrames <= 0
  ) {
    throw new Error('Water handoff requires positive pre/post-roll frames.');
  }
  if (
    config.transition.coverPeak <= 0 ||
    config.transition.coverPeak > 1 ||
    config.transition.refractionStrength <= 0 ||
    config.transition.refractionStrength > 1
  ) {
    throw new Error('Water handoff cover/refraction values must be within 0..1.');
  }
  if (!config.reviewPolicy.humanApprovalRequired) {
    throw new Error('Water handoff requires human approval.');
  }
}

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

main().catch((error) => {
  console.error(
    error instanceof Error ? error.stack ?? error.message : String(error),
  );
  process.exitCode = 1;
});
