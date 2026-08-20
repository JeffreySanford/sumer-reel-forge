import { basename, join } from 'node:path';
import { writeText } from './artifact-utils.mjs';
import { runProcess } from './process-runner.mjs';

export async function isFfmpegAvailable(command, log) {
  try {
    await runProcess(command, ['-version'], {
      timeoutMs: 10000,
      onStderr: (message) => log('stderr', 'warn', message),
    });
    return true;
  } catch (error) {
    await log('system', 'warn', `FFmpeg unavailable: ${error.message}`);
    return false;
  }
}

export async function createSilentAudio({
  command,
  durationSeconds,
  outputPath,
  outputDirectory,
  timeoutMs,
  log,
}) {
  await runFfmpeg(
    command,
    [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'anullsrc=r=48000:cl=stereo',
      '-t',
      String(durationSeconds),
      '-c:a',
      'pcm_s16le',
      outputPath,
    ],
    { outputDirectory, timeoutMs, log },
  );
}

export async function assembleVideo({
  command,
  frames,
  audioPath,
  captionsPath,
  outputPath,
  outputDirectory,
  timeoutMs,
  log,
}) {
  const concatPath = join(outputDirectory, 'frames.ffconcat');
  const concat = ['ffconcat version 1.0'];
  for (const frame of frames) {
    concat.push(
      `file '${basename(frame.path)}'`,
      `duration ${frame.durationSeconds}`,
    );
  }
  concat.push(`file '${basename(frames.at(-1).path)}'`);
  await writeText(concatPath, `${concat.join('\n')}\n`);

  const args = [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatPath,
    '-i',
    audioPath,
  ];
  if (captionsPath) {
    args.push('-i', captionsPath, '-map', '0:v', '-map', '1:a', '-map', '2:0');
  } else {
    args.push('-map', '0:v', '-map', '1:a');
  }
  args.push(
    '-c:v',
    'libx264',
    '-r',
    '30',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
  );
  if (captionsPath) {
    args.push('-c:s', 'mov_text');
  }
  args.push('-shortest', '-movflags', '+faststart', outputPath);
  await runFfmpeg(command, args, { outputDirectory, timeoutMs, log });
}

async function runFfmpeg(command, args, options) {
  await options.log('system', 'info', `${command} ${args.join(' ')}`);
  return runProcess(command, args, {
    cwd: options.outputDirectory,
    timeoutMs: options.timeoutMs,
    onStdout: (message) => options.log('stdout', 'info', message),
    onStderr: (message) => options.log('stderr', 'info', message),
  });
}
