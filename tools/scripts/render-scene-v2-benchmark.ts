import 'dotenv/config';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  prepareOutputDirectory,
  sha256,
  writeJson,
} from '../renderer/artifact-utils.mjs';
import { loadRendererConfig } from '../renderer/renderer-config.mjs';
import { loadSceneV2ForRender } from '../animation/src/scene-v2-asset-loader';
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

async function main(): Promise<void> {
  const root = resolve('.');
  const config = loadRendererConfig();
  const renderProfile = getLocalRenderProfile();
  const sharedBundle = process.env.REMOTION_SHARED_BUNDLE
    ? resolve(process.env.REMOTION_SHARED_BUNDLE)
    : undefined;
  const scenePath = resolve(
    process.argv[2] ??
      'tools/animation/scenes/reel-01-shot-03-benchmark.scene-v2.json',
  );
  const loaded = await loadSceneV2ForRender(scenePath, resolve('assets'));
  const { scene, assetResolution } = loaded;

  for (const warning of assetResolution.warnings) {
    console.warn(`[animation-assets] ${warning}`);
  }

  const sourceShotNumber = scene.shots[0]?.sourceShotNumber;
  if (!sourceShotNumber) {
    throw new Error('Scene V2 benchmark requires a sourceShotNumber.');
  }
  const benchmarkStem = `shot${sourceShotNumber}-scene-v2-benchmark`;
  const outputDirectory = process.env.SCENE_V2_BENCHMARK_OUTPUT_DIRECTORY
    ? resolve(process.env.SCENE_V2_BENCHMARK_OUTPUT_DIRECTORY)
    : await prepareOutputDirectory(config.outputRoot, benchmarkStem);
  await mkdir(outputDirectory, { recursive: true });

  const propsPath = join(outputDirectory, 'scene-v2-props.json');
  const videoPath = join(outputDirectory, `${benchmarkStem}.mp4`);
  const manifestPath = join(outputDirectory, `${benchmarkStem}-manifest.json`);
  const contactSheetPath = join(outputDirectory, `${benchmarkStem}-contact-sheet.png`);
  await writeJson(propsPath, { scene });

  console.log(`Rendering ${scene.sceneId}...`);
  console.log(`Scene: ${scenePath}`);
  console.log(
    `Assets: ${assetResolution.mode}${loaded.manifestPath ? ` via ${loaded.manifestPath}` : ''}`,
  );
  console.log(`Hardware: ${formatLocalRenderProfile(renderProfile)}`);
  if (sharedBundle) console.log(`Shared Remotion bundle: ${sharedBundle}`);
  console.log(`Output: ${videoPath}`);

  let renderDurationMs: number;
  let remotionMetrics: RemotionPhaseMetrics | null = null;
  if (sharedBundle) {
    remotionMetrics = await renderFromPreparedBundle({
      serveUrl: sharedBundle,
      compositionId: 'SceneV2Benchmark',
      inputProps: { scene },
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
        'SceneV2Benchmark',
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
    progress: number;
    frame: number;
    path: string;
    checksum: string;
  }> = [];

  for (const marker of scene.reviewMarkers) {
    const frame = Math.round(
      marker.progress * Math.max(0, scene.durationFrames - 1),
    );
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
    const stackInputs = reviewFrames
      .map((_frame, index) => `[v${index}]`)
      .join('');
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
    sourceShotNumber,
    sourceStartFrame: scene.shots[0]?.sourceStartFrame,
    renderProfile,
    renderDurationMs,
    remotionMetrics,
    sharedBundle,
    assetResolution: {
      mode: assetResolution.mode,
      manifestId: assetResolution.manifestId,
      manifestPath: loaded.manifestPath,
      layeredShotIds: assetResolution.layeredShotIds,
      fallbackShotIds: assetResolution.fallbackShotIds,
      unresolvedRequiredLayerIds: assetResolution.unresolvedRequiredLayerIds,
      warnings: assetResolution.warnings,
    },
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
    reviewPolicy: scene.reviewPolicy,
    sourcePolicy: scene.sourcePolicy,
  });

  console.log(`Rendered benchmark: ${videoPath}`);
  console.log(`Render time: ${(renderDurationMs / 1000).toFixed(1)}s`);
  if (remotionMetrics) {
    console.log(`Remotion phases: ${formatRemotionPhaseMetrics(remotionMetrics)}`);
  }
  console.log(`Review contact sheet: ${contactSheetPath}`);
  console.log(`Manifest: ${manifestPath}`);
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
