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

export async function probeDurationSeconds({
  command,
  inputPath,
  outputDirectory,
  timeoutMs,
  log,
}) {
  const result = await runProcess(
    command,
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      inputPath,
    ],
    {
      cwd: outputDirectory,
      timeoutMs,
      onStderr: (message) => log('stderr', 'warn', message),
    },
  );
  const duration = Number(result.stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Could not determine media duration for ${inputPath}.`);
  }
  return duration;
}

export async function assembleEditorialVideo({
  command,
  frames,
  audioPath,
  captionsPath,
  title,
  series,
  durationSeconds,
  outputPath,
  outputDirectory,
  timeoutMs,
  log,
}) {
  const args = ['-y'];
  for (const frame of frames) {
    args.push(
      '-loop',
      '1',
      '-t',
      String(frame.durationSeconds),
      '-i',
      basename(frame.path),
    );
  }
  const audioInputIndex = frames.length;
  const captionsInputIndex = frames.length + 1;
  args.push('-i', audioPath, '-i', captionsPath);

  const anchors = [
    [0.45, 0.45],
    [0.35, 0.48],
    [0.55, 0.4],
    [0.48, 0.35],
    [0.42, 0.45],
    [0.52, 0.52],
    [0.45, 0.4],
    [0.5, 0.45],
  ];
  const filters = frames.map((frame, index) => {
    const frameCount = Math.round(frame.durationSeconds * 30);
    const [x, y] = anchors[index % anchors.length];
    const zoomStep = (0.06 / frameCount).toFixed(7);
    return (
      `[${index}:v]scale=1200:2134:force_original_aspect_ratio=increase,` +
      `crop=1200:2134,zoompan=z='min(zoom+${zoomStep},1.06)':` +
      `x='(iw-iw/zoom)*${x}':y='(ih-ih/zoom)*${y}':` +
      `d=${frameCount}:s=1080x1920:fps=30,` +
      `trim=duration=${frame.durationSeconds},setpts=PTS-STARTPTS,setsar=1[v${index}]`
    );
  });
  filters.push(
    `${frames.map((_, index) => `[v${index}]`).join('')}concat=n=${frames.length}:v=1:a=0[sequence]`,
    `[sequence]subtitles=filename='${basename(captionsPath)}':` +
      `force_style='FontName=Arial,FontSize=10,PrimaryColour=&H00FFFFFF,` +
      `OutlineColour=&HC0000000,BorderStyle=1,Outline=1.2,Shadow=0,` +
      `Alignment=2,MarginV=72'[captioned]`,
    `[captioned]drawtext=font='Arial':text='${escapeDrawText(title.toUpperCase())}':` +
      `fontcolor=white:fontsize=64:borderw=3:bordercolor=black@0.65:` +
      `x=(w-text_w)/2:y=230:enable='between(t,53.3,59.4)'[titled]`,
    `[titled]drawtext=font='Arial':text='${escapeDrawText(series.toUpperCase())}':` +
      `fontcolor=#D6AD58:fontsize=32:borderw=2:bordercolor=black@0.65:` +
      `x=(w-text_w)/2:y=315:enable='between(t,53.3,59.4)',` +
      `fade=t=in:st=0:d=0.7,fade=t=out:st=${durationSeconds - 0.7}:d=0.7[video]`,
    `[${audioInputIndex}:a]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,` +
      `apad=whole_dur=${durationSeconds},atrim=0:${durationSeconds}[audio]`,
  );

  args.push(
    '-filter_complex',
    filters.join(';'),
    '-map',
    '[video]',
    '-map',
    '[audio]',
    '-map',
    `${captionsInputIndex}:0`,
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '18',
    '-r',
    '30',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-c:s',
    'mov_text',
    '-metadata:s:s:0',
    'language=eng',
    '-metadata:s:s:0',
    'title=English',
    '-t',
    String(durationSeconds),
    '-movflags',
    '+faststart',
    outputPath,
  );
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

function escapeDrawText(value) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(':', '\\:')
    .replaceAll("'", "\\'");
}
