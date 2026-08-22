import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { sha256, writeJson } from '../renderer/artifact-utils.mjs';
import { probeDurationSeconds } from '../renderer/ffmpeg-adapter.mjs';
import { runProcess } from '../renderer/process-runner.mjs';
import { loadRendererConfig } from '../renderer/renderer-config.mjs';

const config = loadRendererConfig();
const response = await fetch(`${config.apiBaseUrl}/chapters/1/reels/1`, {
  signal: AbortSignal.timeout(30000),
});
if (!response.ok) {
  throw new Error(`Could not load Reel 1 narration: HTTP ${response.status}.`);
}
const episode = await response.json();
const outputDirectory = resolve('tmp/auditions/reel-01');
await mkdir(outputDirectory, { recursive: true });
const textPath = join(outputDirectory, 'narration.txt');
await writeFile(textPath, `${episode.narration}\n`, 'utf8');

const voices = [...new Set([config.kokoroVoice, 'af_bella'])];
const auditions = [];
for (const voice of voices) {
  const outputPath = join(outputDirectory, `${voice}.wav`);
  const timingsPath = join(outputDirectory, `${voice}-timings.json`);
  await runProcess(
    config.kokoroCommand,
    kokoroArguments(config, {
      textPath,
      outputPath,
      timingsPath,
      voice,
    }),
    {
      timeoutMs: config.processTimeoutMs,
      onStdout: (message) => process.stdout.write(message),
      onStderr: (message) => process.stderr.write(message),
    },
  );
  const durationSeconds = await probeDurationSeconds({
    command: config.ffprobeCommand,
    inputPath: outputPath,
    outputDirectory,
    timeoutMs: 30000,
    log: async () => undefined,
  });
  auditions.push({
    voice,
    speed: config.kokoroSpeed,
    path: outputPath,
    timingsPath,
    durationSeconds,
    checksum: await sha256(outputPath),
  });
  console.log(
    `${voice}: ${durationSeconds.toFixed(2)} seconds (${outputPath})`,
  );
}

await writeJson(join(outputDirectory, 'audition-manifest.json'), {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  episode: episode.episode,
  title: episode.title,
  narrationChecksum: await sha256(textPath),
  auditions,
});

function kokoroArguments(config, paths) {
  return [
    'run',
    '--project',
    config.kokoroProjectDirectory,
    '--locked',
    'python',
    config.kokoroScript,
    '--text-file',
    paths.textPath,
    '--output-file',
    paths.outputPath,
    '--timings-file',
    paths.timingsPath,
    '--model',
    config.kokoroModelPath,
    '--voices',
    config.kokoroVoicesPath,
    '--voice',
    paths.voice,
    '--speed',
    String(config.kokoroSpeed),
  ];
}
