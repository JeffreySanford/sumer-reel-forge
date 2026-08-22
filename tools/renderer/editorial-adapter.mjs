import { access, copyFile, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { writeText } from './artifact-utils.mjs';
import {
  assembleEditorialVideo,
  createEditorialAmbience,
  probeDurationSeconds,
} from './ffmpeg-adapter.mjs';
import { runProcess } from './process-runner.mjs';

export async function renderEditorialPipeline(context) {
  const { episode, job, outputDirectory, config, log } = context;
  if (episode.episode !== 1) {
    throw new Error(
      `The curated editorial-v1 asset set supports episode 1, not episode ${episode.episode}.`,
    );
  }

  const frames = await copyApprovedFrames(context);
  const narrationTextPath = join(outputDirectory, 'narration.txt');
  const narrationAudioPath = join(outputDirectory, 'narration.wav');
  const timingsPath = join(outputDirectory, 'narration-timings.json');
  const ambiencePath = join(outputDirectory, 'ambience-bed.wav');
  const captionsPath = join(outputDirectory, 'captions.srt');
  const videoPath = join(outputDirectory, 'reel-editorial-v1.mp4');
  const provisional = job.mode !== 'final-video';

  await writeText(narrationTextPath, `${episode.narration}\n`);
  const narrationMetadata = await synthesizeNarration({
    config,
    outputDirectory,
    narrationTextPath,
    narrationAudioPath,
    timingsPath,
    narrationIdentity: job.narrationConfig ?? episode.narrationIdentity,
    log,
  });
  await access(narrationAudioPath);

  const audioDurationSeconds = await probeDurationSeconds({
    command: config.ffprobeCommand,
    inputPath: narrationAudioPath,
    outputDirectory,
    timeoutMs: config.processTimeoutMs,
    log,
  });
  if (audioDurationSeconds > episode.targetDurationSeconds - 1) {
    throw new Error(
      `Narration is ${audioDurationSeconds.toFixed(2)} seconds; it must leave at least one second inside the ${episode.targetDurationSeconds}-second reel.`,
    );
  }

  const rawTimings = JSON.parse(await readFile(timingsPath, 'utf8'));
  const captions = createTimedCaptions({
    narration: episode.narration,
    timings: Array.isArray(rawTimings) ? rawTimings : [rawTimings],
    audioDurationSeconds,
  });
  await writeText(captionsPath, toSrtWithMilliseconds(captions));

  await createEditorialAmbience({
    command: config.ffmpegCommand,
    durationSeconds: episode.targetDurationSeconds,
    outputPath: ambiencePath,
    outputDirectory,
    timeoutMs: config.processTimeoutMs,
    log,
  });

  await assembleEditorialVideo({
    command: config.ffmpegCommand,
    frames,
    audioPath: narrationAudioPath,
    ambiencePath,
    captionsPath,
    title: episode.title,
    series: episode.series,
    durationSeconds: episode.targetDurationSeconds,
    outputPath: videoPath,
    outputDirectory,
    timeoutMs: config.processTimeoutMs,
    log,
  });

  return [
    ...frames.map((frame, index) => ({
      assetType: 'image',
      shotNumber: index + 1,
      path: frame.path,
      metadata: {
        adapter: 'editorial',
        visualBible: 'blessings-of-sumer-v1',
        sourceFile: basename(frame.sourcePath),
        width: 941,
        height: 1672,
        durationSeconds: frame.durationSeconds,
      },
    })),
    {
      assetType: 'audio',
      path: narrationAudioPath,
      metadata: {
        ...narrationMetadata,
        provisional,
        durationSeconds: audioDurationSeconds,
      },
    },
    {
      assetType: 'audio',
      path: ambiencePath,
      metadata: {
        adapter: 'procedural-ffmpeg',
        role: 'ambience-score-bed',
        direction: 'water, low frame drum, soft lyre, restrained final rise',
        provisional,
        durationSeconds: episode.targetDurationSeconds,
      },
    },
    {
      assetType: 'captions',
      path: captionsPath,
      metadata: {
        adapter: 'authored-word-timing',
        format: 'srt',
        burnedIntoVideo: true,
        subtitleTrack: true,
      },
    },
    {
      assetType: 'other',
      path: narrationTextPath,
      metadata: { role: 'narration-script' },
    },
    {
      assetType: 'other',
      path: timingsPath,
      metadata: {
        role: 'narration-word-timings',
        adapter: narrationMetadata.timingAdapter,
      },
    },
    {
      assetType: 'video',
      path: videoPath,
      metadata: {
        adapter: 'editorial-ffmpeg',
        visualBible: 'blessings-of-sumer-v1',
        width: 1080,
        height: 1920,
        frameRate: 30,
        durationSeconds: episode.targetDurationSeconds,
        captionsBurnedIn: true,
        subtitleTrack: true,
        narrationAdapter: narrationMetadata.adapter,
        ambienceScore: 'procedural-ffmpeg-v1',
        provisional,
      },
    },
  ];
}

async function synthesizeNarration({
  config,
  outputDirectory,
  narrationTextPath,
  narrationAudioPath,
  timingsPath,
  narrationIdentity,
  log,
}) {
  const processOptions = {
    cwd: outputDirectory,
    timeoutMs: config.processTimeoutMs,
    onStdout: (message) => log('stdout', 'info', message),
    onStderr: (message) => log('stderr', 'warn', message),
  };
  const narrationAdapter =
    config.editorialNarrationAdapter === 'auto'
      ? (narrationIdentity?.voiceProfile.engine ?? 'kokoro')
      : config.editorialNarrationAdapter;

  if (narrationAdapter === 'chatterbox') {
    const controls = chatterboxControls(narrationIdentity?.stylePreset);
    const referenceArguments = config.chatterboxReferenceAudio
      ? ['--reference-audio', config.chatterboxReferenceAudio]
      : [];
    await runProcess(
      config.chatterboxCommand,
      chatterboxArgs(config, [
        config.chatterboxScript,
        '--text-file',
        narrationTextPath,
        '--output-file',
        narrationAudioPath,
        '--timings-file',
        timingsPath,
        '--model-directory',
        config.chatterboxModelDirectory,
        '--device',
        config.chatterboxDevice,
        '--exaggeration',
        String(controls.exaggeration),
        '--cfg-weight',
        String(controls.cfgWeight),
        '--temperature',
        String(controls.temperature),
        ...referenceArguments,
      ]),
      { ...processOptions, env: chatterboxEnvironment() },
    );
    return {
      adapter: 'chatterbox',
      timingAdapter: 'estimated-word-timing',
      voice: narrationIdentity?.voiceProfile.slug ?? 'chatterbox-narrator',
      model: narrationIdentity?.voiceProfile.model ?? 'ResembleAI/chatterbox',
      stylePreset: narrationIdentity?.stylePreset ?? 'mythic',
      styleNotes: narrationIdentity?.styleNotes ?? '',
      referenceAudio: Boolean(config.chatterboxReferenceAudio),
      referenceAudioChecksum:
        narrationIdentity?.voiceProfile.referenceAudioChecksum,
      ...controls,
    };
  }

  if (narrationAdapter === 'kokoro') {
    const voice =
      narrationIdentity?.voiceProfile.engine === 'kokoro'
        ? (narrationIdentity.voiceProfile.providerVoice ?? config.kokoroVoice)
        : config.kokoroVoice;
    const speed = kokoroSpeedForStyle(
      narrationIdentity?.stylePreset,
      config.kokoroSpeed,
    );
    await runProcess(
      config.kokoroCommand,
      [
        'run',
        '--project',
        config.kokoroProjectDirectory,
        '--locked',
        'python',
        config.kokoroScript,
        '--text-file',
        narrationTextPath,
        '--output-file',
        narrationAudioPath,
        '--timings-file',
        timingsPath,
        '--model',
        config.kokoroModelPath,
        '--voices',
        config.kokoroVoicesPath,
        '--voice',
        voice,
        '--speed',
        String(speed),
      ],
      processOptions,
    );
    return {
      adapter: 'kokoro-onnx',
      timingAdapter: 'estimated-word-timing',
      voice,
      speed,
      model: basename(config.kokoroModelPath),
      stylePreset: narrationIdentity?.stylePreset,
      styleNotes: narrationIdentity?.styleNotes,
    };
  }

  await runProcess(
    config.windowsSpeechCommand,
    [
      '-NoProfile',
      '-NonInteractive',
      '-File',
      config.windowsSpeechScript,
      '-InputPath',
      narrationTextPath,
      '-OutputPath',
      narrationAudioPath,
      '-TimingsPath',
      timingsPath,
      '-Voice',
      config.editorialVoice,
      '-Rate',
      String(config.editorialVoiceRate),
    ],
    processOptions,
  );
  return {
    adapter: 'windows-sapi',
    timingAdapter: 'windows-sapi',
    voice: config.editorialVoice,
    rate: config.editorialVoiceRate,
  };
}

function chatterboxControls(stylePreset = 'mythic') {
  return (
    {
      documentary: { exaggeration: 0.25, cfgWeight: 0.5, temperature: 0.72 },
      intimate: { exaggeration: 0.4, cfgWeight: 0.35, temperature: 0.74 },
      mythic: { exaggeration: 0.5, cfgWeight: 0.4, temperature: 0.8 },
      dramatic: { exaggeration: 0.7, cfgWeight: 0.3, temperature: 0.85 },
      archival: { exaggeration: 0.2, cfgWeight: 0.55, temperature: 0.7 },
    }[stylePreset] ?? {
      exaggeration: 0.5,
      cfgWeight: 0.4,
      temperature: 0.8,
    }
  );
}

function chatterboxArgs(config, args) {
  if (basename(config.chatterboxCommand).toLowerCase().startsWith('uv')) {
    return ['run', '--project', config.chatterboxProjectDirectory, ...args];
  }
  return args;
}

function chatterboxEnvironment() {
  return {
    PYTHONWARNINGS: 'ignore::UserWarning,ignore::FutureWarning',
    TRANSFORMERS_VERBOSITY: 'error',
  };
}

function kokoroSpeedForStyle(stylePreset, fallback) {
  return (
    {
      documentary: 0.95,
      intimate: 0.88,
      mythic: 0.9,
      dramatic: 1,
      archival: 0.85,
    }[stylePreset] ?? fallback
  );
}

async function copyApprovedFrames({ episode, outputDirectory, config, log }) {
  const frames = [];
  for (const [index, shot] of episode.shots.entries()) {
    const filename = `shot-${String(index + 1).padStart(2, '0')}.png`;
    const sourcePath = join(config.editorialAssetDirectory, filename);
    const outputPath = join(outputDirectory, filename);
    await access(sourcePath);
    await copyFile(sourcePath, outputPath);
    frames.push({
      path: outputPath,
      sourcePath,
      durationSeconds: shot.durationSeconds,
    });
    await log('system', 'info', `Copied approved editorial frame ${filename}.`);
  }
  return frames;
}

function createTimedCaptions({ narration, timings, audioDurationSeconds }) {
  const usable = timings.filter(
    (timing) =>
      timing &&
      Number.isFinite(Number(timing.audioPositionSeconds)) &&
      Number.isInteger(Number(timing.characterPosition)),
  );
  if (usable.length === 0) {
    throw new Error('Narration synthesis did not return word timings.');
  }

  const reportedEnd = Number(usable.at(-1).audioPositionSeconds);
  const scale = reportedEnd > 0 ? audioDurationSeconds / reportedEnd : 1;
  const words = usable.map((timing, index) => {
    const start = Number(timing.characterPosition);
    const nextStart = Number(
      usable[index + 1]?.characterPosition ?? narration.length,
    );
    return {
      text: narration.slice(start, nextStart).trim(),
      startSeconds: Number(timing.audioPositionSeconds) * scale,
    };
  });

  const groups = [];
  let sentenceStart = 0;
  for (let index = 0; index < words.length; index += 1) {
    const closesSentence = /[.!?;:]$/.test(words[index].text);
    if (!closesSentence && index !== words.length - 1) {
      continue;
    }
    const sentenceLength = index - sentenceStart + 1;
    const chunkCount = Math.ceil(sentenceLength / 8);
    const chunkSize = Math.ceil(sentenceLength / chunkCount);
    for (
      let chunkStart = sentenceStart;
      chunkStart <= index;
      chunkStart += chunkSize
    ) {
      const chunkEnd = Math.min(chunkStart + chunkSize, index + 1);
      groups.push({
        text: words
          .slice(chunkStart, chunkEnd)
          .map((word) => word.text)
          .join(' '),
        startSeconds: Math.max(0, words[chunkStart].startSeconds - 0.08),
        endSeconds: 0,
      });
    }
    sentenceStart = index + 1;
  }

  for (const [index, group] of groups.entries()) {
    group.endSeconds =
      groups[index + 1]?.startSeconds ??
      Math.min(audioDurationSeconds + 0.3, 59);
  }
  return groups;
}

function toSrtWithMilliseconds(captions) {
  return `${captions
    .map(
      (caption, index) =>
        `${index + 1}\n${formatSrtTime(caption.startSeconds)} --> ${formatSrtTime(caption.endSeconds)}\n${caption.text}\n`,
    )
    .join('\n')}\n`;
}

function formatSrtTime(seconds) {
  const milliseconds = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(milliseconds / 3600000);
  const minutes = Math.floor((milliseconds % 3600000) / 60000);
  const remainingSeconds = Math.floor((milliseconds % 60000) / 1000);
  const remainingMilliseconds = milliseconds % 1000;
  return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)},${String(remainingMilliseconds).padStart(3, '0')}`;
}

function pad(value) {
  return String(value).padStart(2, '0');
}
