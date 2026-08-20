import { access, copyFile, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { writeText } from './artifact-utils.mjs';
import {
  assembleEditorialVideo,
  probeDurationSeconds,
} from './ffmpeg-adapter.mjs';
import { runProcess } from './process-runner.mjs';

export async function renderEditorialPipeline(context) {
  const { episode, outputDirectory, config, log } = context;
  if (episode.episode !== 1) {
    throw new Error(
      `The curated editorial-v1 asset set supports episode 1, not episode ${episode.episode}.`,
    );
  }

  const frames = await copyApprovedFrames(context);
  const narrationTextPath = join(outputDirectory, 'narration.txt');
  const narrationAudioPath = join(outputDirectory, 'narration.wav');
  const timingsPath = join(outputDirectory, 'narration-timings.json');
  const captionsPath = join(outputDirectory, 'captions.srt');
  const videoPath = join(outputDirectory, 'reel-editorial-v1.mp4');

  await writeText(narrationTextPath, `${episode.narration}\n`);
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
    {
      cwd: outputDirectory,
      timeoutMs: config.processTimeoutMs,
      onStdout: (message) => log('stdout', 'info', message),
      onStderr: (message) => log('stderr', 'warn', message),
    },
  );
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

  await assembleEditorialVideo({
    command: config.ffmpegCommand,
    frames,
    audioPath: narrationAudioPath,
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
        adapter: 'windows-sapi',
        voice: config.editorialVoice,
        rate: config.editorialVoiceRate,
        provisional: true,
        durationSeconds: audioDurationSeconds,
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
      metadata: { role: 'narration-word-timings', adapter: 'windows-sapi' },
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
      },
    },
  ];
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
