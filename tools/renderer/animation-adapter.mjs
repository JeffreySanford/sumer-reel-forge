import { access, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { runProcess } from './process-runner.mjs';

export async function renderAnimationPipeline(context) {
  const { outputDirectory, config, log } = context;
  await log(
    'system',
    'info',
    'Animation adapter is rendering the complete Remotion Reel 1 animation draft.',
  );

  await runProcess(
    process.execPath,
    [
      resolve('tools/scripts/render-animation-proof.mjs'),
      '--scene',
      'tools/animation/scenes/reel-01-full-animation.scene.json',
      '--composition',
      'FullReelAnimation',
      '--prefix',
      'reel-animation-v1',
      '--manifest',
      'animation-reel1-manifest.json',
      '--adapter',
      'animation',
      '--narration-adapter',
      'chatterbox',
    ],
    {
      cwd: resolve('.'),
      timeoutMs: config.jobTimeoutMs,
      env: {
        ANIMATION_PROOF_OUTPUT_DIRECTORY: outputDirectory,
        RENDER_OUTPUT_ROOT: config.outputRoot,
      },
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

  await Promise.all([
    access(videoPath),
    access(visualOnlyVideoPath),
    access(narrationMixPath),
    access(manifestPath),
  ]);

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const output = manifest.output ?? {};
  const narration = manifest.narration ?? {};

  return [
    {
      assetType: 'video',
      path: videoPath,
      metadata: {
        adapter: 'animation',
        engine: manifest.engine ?? 'remotion',
        engineVersion: manifest.engineVersion,
        width: output.width,
        height: output.height,
        frameRate: output.fps,
        durationSeconds: output.durationSeconds,
        captionsBurnedIn: true,
        audioSynchronized: true,
        narrationAdapter: narration.adapter,
        narrationVoice: narration.voice,
        sceneId: manifest.scene?.sceneId,
        visualBible: manifest.scene?.visualBible,
        sourcePolicy: manifest.sourcePolicy,
        completeReelDraft: true,
      },
    },
    {
      assetType: 'audio',
      path: narrationMixPath,
      metadata: {
        adapter: narration.adapter ?? 'windows-sapi',
        role: 'timed-animation-narration-mix',
        voice: narration.voice,
        requestedVoice: narration.requestedVoice,
        rate: narration.rate,
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
        sceneId: manifest.scene?.sceneId,
      },
    },
    {
      assetType: 'other',
      path: visualOnlyVideoPath,
      metadata: {
        role: 'visual-only-animation-reel-video',
        adapter: 'animation',
        engine: manifest.engine,
      },
    },
  ];
}
