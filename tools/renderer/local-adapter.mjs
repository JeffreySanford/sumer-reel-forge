import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { toSrt, writeText } from './artifact-utils.mjs';
import { renderComfyUiImages } from './comfyui-adapter.mjs';
import { assembleVideo } from './ffmpeg-adapter.mjs';
import { runProcess } from './process-runner.mjs';

export async function renderLocalPipeline(context) {
  const { episode, outputDirectory, config, log } = context;
  const artifacts = await renderComfyUiImages(context);
  const narrationTextPath = join(outputDirectory, 'narration.txt');
  const narrationAudioPath = join(outputDirectory, 'narration.wav');
  const captionsPath = join(outputDirectory, 'narration.srt');
  const authoredCaptionsPath = join(outputDirectory, 'authored-captions.srt');
  const videoPath = join(outputDirectory, 'reel.mp4');
  await writeText(narrationTextPath, `${episode.narration}\n`);
  await writeText(
    authoredCaptionsPath,
    toSrt(episode.onScreenText, episode.targetDurationSeconds),
  );

  await runConfiguredCommand({
    command: config.ttsCommand,
    args: config.ttsArgs,
    replacements: {
      '{input}': narrationTextPath,
      '{output}': narrationAudioPath,
      '{voice}': config.ttsVoice,
    },
    outputDirectory,
    timeoutMs: config.processTimeoutMs,
    label: 'TTS',
    log,
  });
  await access(narrationAudioPath);
  artifacts.push({
    assetType: 'audio',
    path: narrationAudioPath,
    metadata: { adapter: 'local-command', voice: config.ttsVoice },
  });

  await runConfiguredCommand({
    command: config.whisperCommand,
    args: config.whisperArgs,
    replacements: {
      '{input}': narrationAudioPath,
      '{outputDirectory}': outputDirectory,
      '{model}': config.whisperModel,
    },
    outputDirectory,
    timeoutMs: config.processTimeoutMs,
    label: 'Whisper',
    log,
  });
  await access(captionsPath);
  artifacts.push({
    assetType: 'captions',
    path: captionsPath,
    metadata: { adapter: 'whisper', model: config.whisperModel },
  });

  await assembleVideo({
    command: config.ffmpegCommand,
    frames: artifacts
      .filter((artifact) => artifact.assetType === 'image')
      .map((artifact) => ({
        path: artifact.path,
        durationSeconds:
          Number(artifact.metadata.durationSeconds) ||
          episode.targetDurationSeconds / episode.shots.length,
      })),
    audioPath: narrationAudioPath,
    captionsPath,
    outputPath: videoPath,
    outputDirectory,
    timeoutMs: config.processTimeoutMs,
    log,
  });
  artifacts.push({
    assetType: 'video',
    path: videoPath,
    metadata: {
      adapter: 'ffmpeg',
      width: 1080,
      height: 1920,
      durationSeconds: episode.targetDurationSeconds,
    },
  });
  return artifacts;
}

async function runConfiguredCommand(options) {
  const args = options.args.map((argument) =>
    Object.entries(options.replacements).reduce(
      (current, [token, replacement]) => current.split(token).join(replacement),
      argument,
    ),
  );
  await options.log(
    'system',
    'info',
    `${options.label} command: ${options.command} ${args.join(' ')}`,
  );
  return runProcess(options.command, args, {
    cwd: options.outputDirectory,
    timeoutMs: options.timeoutMs,
    onStdout: (message) => options.log('stdout', 'info', message),
    onStderr: (message) => options.log('stderr', 'warn', message),
  });
}
