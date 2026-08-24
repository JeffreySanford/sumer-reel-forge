import { access, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { runProcess } from './process-runner.mjs';

export async function renderAnimationPipeline(context) {
  const { outputDirectory, config, log } = context;
  await log(
    'system',
    'info',
    'Animation adapter is rendering the approved canonical Scene V2 Reel 1 animation.',
  );

  const renderEnvironment = {
    ANIMATION_PROOF_OUTPUT_DIRECTORY: outputDirectory,
    RENDER_OUTPUT_ROOT: config.outputRoot,
  };

  await runProcess(
    process.execPath,
    [
      '--import',
      'tsx',
      resolve('tools/scripts/render-canonical-reel1-scene-v2.ts'),
    ],
    {
      cwd: resolve('.'),
      timeoutMs: config.jobTimeoutMs,
      env: renderEnvironment,
      onStdout: (message) => log('stdout', 'info', message),
      onStderr: (message) => log('stderr', 'warn', message),
    },
  );

  await runProcess(
    process.execPath,
    [resolve('tools/scripts/finalize-canonical-reel1.mjs')],
    {
      cwd: resolve('.'),
      timeoutMs: config.jobTimeoutMs,
      env: renderEnvironment,
      onStdout: (message) => log('stdout', 'info', message),
      onStderr: (message) => log('stderr', 'warn', message),
    },
  );

  const videoPath = join(outputDirectory, 'reel-animation-v1.mp4');
  const visualOnlyVideoPath = join(
    outputDirectory,
    'reel-animation-v1-visual.mp4',
  );
  const narrationMixPath = join(outputDirectory, 'narration-mix.wav');
  const manifestPath = join(outputDirectory, 'animation-reel1-manifest.json');
  const canonicalScenePath = join(
    outputDirectory,
    'canonical-reel1-scene-v2.json',
  );

  await Promise.all([
    access(videoPath),
    access(visualOnlyVideoPath),
    access(narrationMixPath),
    access(manifestPath),
    access(canonicalScenePath),
  ]);

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const canonicalScene = JSON.parse(await readFile(canonicalScenePath, 'utf8'));
  const output = manifest.output ?? {};
  const narration = manifest.narration ?? {};

  return [
    {
      assetType: 'video',
      path: videoPath,
      metadata: {
        adapter: 'animation',
        engine: manifest.engine ?? 'remotion-scene-v2',
        width: output.width,
        height: output.height,
        frameRate: output.fps,
        durationSeconds: output.durationSeconds,
        captionsBurnedIn: true,
        audioSynchronized: true,
        narrationAdapter: narration.adapter,
        narrationVoice: narration.voice,
        sceneId: canonicalScene.sceneId,
        visualBible: canonicalScene.visualBible,
        assetVersion: canonicalScene.assetVersion,
        sourcePolicy: manifest.sourcePolicy,
        canonicalSceneV2: true,
        completeReelDraft: true,
      },
    },
    {
      assetType: 'audio',
      path: narrationMixPath,
      metadata: {
        adapter: narration.adapter ?? 'chatterbox',
        role: 'timed-animation-narration-mix',
        voice: narration.voice,
        clipCount: narration.clipCount,
        durationSeconds: output.durationSeconds,
      },
    },
    {
      assetType: 'other',
      path: manifestPath,
      metadata: {
        role: 'animation-reel1-manifest',
        adapter: 'animation',
        engine: manifest.engine,
        sceneId: canonicalScene.sceneId,
      },
    },
    {
      assetType: 'other',
      path: visualOnlyVideoPath,
      metadata: {
        role: 'visual-only-animation-reel-video',
        adapter: 'animation',
        engine: manifest.engine,
        sceneId: canonicalScene.sceneId,
      },
    },
    {
      assetType: 'other',
      path: canonicalScenePath,
      metadata: {
        role: 'canonical-scene-v2-reel-evidence',
        adapter: 'animation',
        sceneId: canonicalScene.sceneId,
        shotCount: canonicalScene.shots?.length ?? 0,
      },
    },
  ];
}