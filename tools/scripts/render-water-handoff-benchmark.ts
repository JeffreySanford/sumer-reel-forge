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
import { loadSceneV2ForRender } from '../animation/src/scene-v2-asset-loader';
import type { WaterMaterialHandoffConfig } from '../animation/src/SceneV2WaterHandoff';
import {
  formatLocalRenderProfile,
  getLocalRenderProfile,
  remotionPerformanceArgs,
} from '../animation/src/local-render-profile';
import {
  formatRemotionPhaseMetrics,
  renderFromPreparedBundle,
  type RemotionPhaseMetrics,
} from '../animation/src/remotion-shared-render';

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
  const renderProfile = getLocalRenderProfile();
  const sharedBundle = process.env.REMOTION_SHARED_BUNDLE
    ? resolve(process.env.REMOTION_SHARED_BUNDLE)
    : undefined;
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
  const outgoingLoaded = await loadSceneV2ForRender(outgoingPath, resolve('assets'));
  const incomingLoaded = await loadSceneV2ForRender(incomingPath, resolve('assets'));
  const outgoingScene = outgoingLoaded.scene;
  const incomingScene = incomingLoaded.scene;

  for (const warning of outgoingLoaded.assetResolution.warnings) {
    console.warn(`[animation-assets:outgoing] ${warning}`);
  }
  for (const warning of incomingLoaded.assetResolution.warnings) {
    console.warn(`[animation-assets:incoming] ${warning}`);
  }

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

  const inputProps = {
    outgoingScene,
    incomingScene,
    transition: benchmark.transition,
  };
  await writeJson(propsPath, inputProps);

  console.log(`Rendering ${benchmark.transitionId}...`);
  console.log(`Outgoing: ${outgoingPath} [${outgoingLoaded.assetResolution.mode}]`);
  console.log(`Incoming: ${incomingPath} [${incomingLoaded.assetResolution.mode}]`);
  console.log(`Hardware: ${formatLocalRenderProfile(renderProfile)}`);
  if (sharedBundle) console.log(`Shared Remotion bundle: ${sharedBundle}`);
  console.log(`Output: ${videoPath}`);

  let renderDurationMs: number;
  let remotionMetrics: RemotionPhaseMetrics | null = null;
  if (sharedBundle) {
    remotionMetrics = await renderFromPreparedBundle({
      serveUrl: sharedBundle,
      compositionId: 'SceneV2WaterHandoff',
      inputProps,
      outputLocation: videoPath,
      profile: renderProfile,
    });
    renderDurationMs = remotionMetrics.totalDurationMs;
  } else {
    const startedAt = Date.now();
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
        ...remotionPerformanceArgs(renderProfile),
        '--overwrite',
      ],
      root,
    );
    renderDurationMs = Date.now() - startedAt;
  }

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
    renderProfile,
    renderDurationMs,
    remotionMetrics,
    sharedBundle,
    outgoingScene: {
      path: outgoingPath,
      sceneId: outgoingScene.sceneId,
      sourceShotNumber: outgoingScene.shots[0]?.sourceShotNumber,
      assetResolution: outgoingLoaded.assetResolution,
      assetManifestPath: outgoingLoaded.manifestPath,
    },
    incomingScene: {
      path: incomingPath,
      sceneId: incomingScene.sceneId,
      sourceShotNumber: incomingScene.shots[0]?.sourceShotNumber,
      assetResolution: incomingLoaded.assetResolution,
      assetManifestPath: incomingLoaded.manifestPath,
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
  console.log(`Render time: ${(renderDurationMs / 1000).toFixed(1)}s`);
  if (remotionMetrics) {
    console.log(`Remotion phases: ${formatRemotionPhaseMetrics(remotionMetrics)}`);
  }
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
