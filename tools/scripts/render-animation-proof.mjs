import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import {
  prepareOutputDirectory,
  sha256,
  writeText,
  writeJson,
} from '../renderer/artifact-utils.mjs';
import { probeDurationSeconds } from '../renderer/ffmpeg-adapter.mjs';
import { loadRendererConfig } from '../renderer/renderer-config.mjs';

loadLocalEnvFile();

const config = loadRendererConfig();
const options = parseArgs(process.argv.slice(2));
const outputDirectory = process.env.ANIMATION_PROOF_OUTPUT_DIRECTORY
  ? resolve(process.env.ANIMATION_PROOF_OUTPUT_DIRECTORY)
  : await prepareOutputDirectory(config.outputRoot, 'animation-proof');
const entryPoint = resolve('tools/animation/src/index.tsx');
const scenePath = resolve(
  options.scene ?? 'tools/animation/scenes/reel-01-proof.scene.json',
);
const scene = JSON.parse(await readFile(scenePath, 'utf8'));
const compositionId = options.composition ?? 'ReelAnimation';
const outputPrefix = options.prefix ?? 'reel-animation-proof';
const adapterName = options.adapter ?? 'animation-proof';
const narrationAdapter = normalizeNarrationAdapter(
  options['narration-adapter'] ??
    options.narrationAdapter ??
    config.editorialNarrationAdapter,
);
const visualOnlyPath = join(outputDirectory, `${outputPrefix}-visual.mp4`);
const outputPath = join(outputDirectory, `${outputPrefix}.mp4`);
const manifestPath = join(
  outputDirectory,
  options.manifest ?? 'animation-proof-manifest.json',
);
const narrationMixPath = join(outputDirectory, 'narration-mix.wav');

await mkdir(outputDirectory, { recursive: true });
const narrationMetadata = await prepareNarrationMetadata(narrationAdapter);
const narrationSegments = await synthesizeNarrationSegments(
  scene,
  narrationMetadata,
);

await runProcess(
  'pnpm',
  [
    'exec',
    'remotion',
    'render',
    entryPoint,
    compositionId,
    visualOnlyPath,
    '--codec=h264',
    '--pixel-format=yuv420p',
    '--overwrite',
  ],
  { cwd: resolve('.') },
);

await mixNarrationSegments(scene, narrationSegments);
await muxNarration(visualOnlyPath, narrationMixPath, outputPath);

let durationSeconds;
try {
  durationSeconds = await probeDurationSeconds({
    command: config.ffprobeCommand,
    inputPath: outputPath,
    outputDirectory,
    timeoutMs: config.processTimeoutMs,
    log: async (_stream, level, message) => {
      const method =
        level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[method](String(message).trim());
    },
  });
} catch (error) {
  console.warn(`FFprobe validation skipped: ${error.message}`);
}

await writeJson(manifestPath, {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  adapter: adapterName,
  engine: 'remotion',
  engineVersion: '4.0.515',
  scenePath,
  outputPath,
  output: {
    width: scene.width,
    height: scene.height,
    fps: scene.fps,
    durationFrames: scene.durationFrames,
    durationSeconds,
    checksum: await sha256(outputPath),
  },
  narration: {
    ...narrationMetadata,
    clipCount: narrationSegments.length,
    mixPath: narrationMixPath,
    checksum: await sha256(narrationMixPath),
    clips: narrationSegments,
  },
  sourcePolicy: scene.sourcePolicy,
  scene,
});

console.log(`Rendered animation output: ${outputPath}`);
console.log(`Wrote manifest: ${manifestPath}`);

function loadLocalEnvFile() {
  const envPath = resolve('.env');
  if (!existsSync(envPath)) return;
  if (typeof process.loadEnvFile !== 'function') {
    throw new Error(
      'Native .env loading requires Node 20.12 or newer. This workspace targets Node 22.',
    );
  }

  const inheritedEnvironment = { ...process.env };
  process.loadEnvFile(envPath);
  Object.assign(process.env, inheritedEnvironment);
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) {
      continue;
    }
    const [rawKey, inlineValue] = arg.slice(2).split('=', 2);
    const value = inlineValue ?? args[index + 1];
    if (inlineValue === undefined) {
      index += 1;
    }
    parsed[rawKey] = value;
  }
  return parsed;
}

function normalizeNarrationAdapter(value) {
  if (value === 'auto') {
    return 'chatterbox';
  }
  if (['chatterbox', 'kokoro', 'sapi'].includes(value)) {
    return value;
  }
  throw new Error(
    `Unsupported narration adapter '${value}'. Use auto, chatterbox, kokoro, or sapi.`,
  );
}

async function prepareNarrationMetadata(adapter) {
  if (adapter === 'chatterbox') {
    return {
      adapter: 'chatterbox',
      timingAdapter: 'estimated-word-timing',
      voice: 'chatterbox-narrator',
      model: 'ResembleAI/chatterbox',
      stylePreset: 'mythic',
      referenceAudio: Boolean(config.chatterboxReferenceAudio),
      ...chatterboxControls('mythic'),
    };
  }

  if (adapter === 'kokoro') {
    return {
      adapter: 'kokoro-onnx',
      timingAdapter: 'estimated-word-timing',
      voice: config.kokoroVoice,
      speed: config.kokoroSpeed,
      model: basename(config.kokoroModelPath),
      stylePreset: 'mythic',
    };
  }

  const narrationVoice = await selectNarrationVoice();
  return {
    adapter: 'windows-sapi',
    timingAdapter: 'windows-sapi',
    requestedVoice: config.editorialVoice,
    voice: narrationVoice,
    rate: config.editorialVoiceRate,
  };
}

async function selectNarrationVoice() {
  const voices = await listWindowsVoices();
  const candidates = [
    config.editorialVoice,
    ...voices.filter((voice) => voice !== config.editorialVoice),
  ].filter(Boolean);
  const textPath = join(outputDirectory, 'voice-check.txt');
  const audioPath = join(outputDirectory, 'voice-check.wav');
  const timingsPath = join(outputDirectory, 'voice-check.timings.json');
  await writeText(textPath, 'Voice check.\n');

  for (const voice of candidates) {
    const result = await runProcessQuiet(
      config.windowsSpeechCommand,
      [
        '-NoProfile',
        '-NonInteractive',
        '-File',
        config.windowsSpeechScript,
        '-InputPath',
        textPath,
        '-OutputPath',
        audioPath,
        '-TimingsPath',
        timingsPath,
        '-Voice',
        voice,
        '-Rate',
        String(config.editorialVoiceRate),
      ],
      { cwd: resolve('.') },
    );
    if (result.code === 0) {
      if (voice !== config.editorialVoice) {
        console.warn(
          `Configured voice '${config.editorialVoice}' failed; using '${voice}' for the proof narration.`,
        );
      }
      return voice;
    }
  }

  throw new Error(
    `No usable Windows SAPI voice found. Tried: ${candidates.join(', ')}.`,
  );
}

async function listWindowsVoices() {
  const result = await runProcessQuiet(
    config.windowsSpeechCommand,
    [
      '-NoProfile',
      '-NonInteractive',
      '-File',
      config.windowsSpeechScript,
      '-ListVoices',
    ],
    { cwd: resolve('.') },
  );
  if (result.code !== 0) {
    return [];
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function synthesizeNarrationSegments(scene, narrationMetadata) {
  if (scene.narration) {
    return [
      await synthesizeNarrationSegment({
        scene,
        narrationMetadata,
        text: scene.narration,
        index: 0,
        startFrame: 0,
        endFrame: scene.durationFrames - 1,
      }),
    ];
  }

  const segments = [];
  for (const [index, caption] of scene.captions.entries()) {
    segments.push(
      await synthesizeNarrationSegment({
        scene,
        narrationMetadata,
        text: caption.text,
        index,
        startFrame: caption.startFrame,
        endFrame: caption.endFrame,
      }),
    );
  }
  return segments;
}

async function synthesizeNarrationSegment({
  scene,
  narrationMetadata,
  text,
  index,
  startFrame,
  endFrame,
}) {
  const clipNumber = String(index + 1).padStart(2, '0');
  const textPath = join(outputDirectory, `narration-${clipNumber}.txt`);
  const audioPath = join(outputDirectory, `narration-${clipNumber}.wav`);
  const timingsPath = join(
    outputDirectory,
    `narration-${clipNumber}.timings.json`,
  );
  await writeText(textPath, `${text}\n`);
  await synthesizeNarrationAudio({
    narrationMetadata,
    textPath,
    audioPath,
    timingsPath,
  });
  const durationSeconds = await probeDurationSeconds({
    command: config.ffprobeCommand,
    inputPath: audioPath,
    outputDirectory,
    timeoutMs: config.processTimeoutMs,
    log: logMediaProbe,
  });
  const timings = JSON.parse(await readFile(timingsPath, 'utf8'));
  return {
    index: index + 1,
    text,
    startFrame,
    endFrame,
    startSeconds: startFrame / scene.fps,
    endSeconds: endFrame / scene.fps,
    durationSeconds,
    audioPath,
    timingsPath,
    checksum: await sha256(audioPath),
    timings: Array.isArray(timings) ? timings : [timings],
  };
}

async function synthesizeNarrationAudio({
  narrationMetadata,
  textPath,
  audioPath,
  timingsPath,
}) {
  if (narrationMetadata.adapter === 'chatterbox') {
    const referenceArguments = config.chatterboxReferenceAudio
      ? ['--reference-audio', config.chatterboxReferenceAudio]
      : [];
    await runProcess(
      config.chatterboxCommand,
      chatterboxArgs([
        config.chatterboxScript,
        '--text-file',
        textPath,
        '--output-file',
        audioPath,
        '--timings-file',
        timingsPath,
        '--model-directory',
        config.chatterboxModelDirectory,
        '--device',
        config.chatterboxDevice,
        '--exaggeration',
        String(narrationMetadata.exaggeration),
        '--cfg-weight',
        String(narrationMetadata.cfgWeight),
        '--temperature',
        String(narrationMetadata.temperature),
        ...referenceArguments,
      ]),
      { cwd: resolve('.'), env: chatterboxEnvironment() },
    );
    return;
  }

  if (narrationMetadata.adapter === 'kokoro-onnx') {
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
        textPath,
        '--output-file',
        audioPath,
        '--timings-file',
        timingsPath,
        '--model',
        config.kokoroModelPath,
        '--voices',
        config.kokoroVoicesPath,
        '--voice',
        narrationMetadata.voice,
        '--speed',
        String(narrationMetadata.speed),
      ],
      { cwd: resolve('.') },
    );
    return;
  }

  await runProcess(
    config.windowsSpeechCommand,
    [
      '-NoProfile',
      '-NonInteractive',
      '-File',
      config.windowsSpeechScript,
      '-InputPath',
      textPath,
      '-OutputPath',
      audioPath,
      '-TimingsPath',
      timingsPath,
      '-Voice',
      narrationMetadata.voice,
      '-Rate',
      String(narrationMetadata.rate),
    ],
    { cwd: resolve('.') },
  );
}

function chatterboxArgs(args) {
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

async function mixNarrationSegments(scene, segments) {
  const args = ['-hide_banner', '-loglevel', 'error', '-y'];
  for (const segment of segments) {
    args.push('-i', segment.audioPath);
  }
  const filters = segments
    .map((segment, index) => {
      const delayMs = Math.round(segment.startSeconds * 1000);
      return `[${index}:a]adelay=${delayMs}:all=1,apad,atrim=0:${scene.durationFrames / scene.fps}[a${index}]`;
    })
    .join(';');
  const mixInputs = segments.map((_segment, index) => `[a${index}]`).join('');
  args.push(
    '-filter_complex',
    `${filters};${mixInputs}amix=inputs=${segments.length}:normalize=0,aresample=48000,aformat=channel_layouts=stereo[mix]`,
    '-map',
    '[mix]',
    '-c:a',
    'pcm_s16le',
    narrationMixPath,
  );
  await runProcess(config.ffmpegCommand, args, { cwd: outputDirectory });
}

async function muxNarration(videoPath, audioPath, finalPath) {
  await runProcess(
    config.ffmpegCommand,
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      videoPath,
      '-i',
      audioPath,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-shortest',
      '-movflags',
      '+faststart',
      finalPath,
    ],
    { cwd: outputDirectory },
  );
}

async function logMediaProbe(_stream, level, message) {
  const normalized = String(message).trim();
  if (!normalized) {
    return;
  }
  const method =
    level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
  console[method](normalized);
}

function runProcess(command, args, options) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: shouldUseShell(command),
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      reject(new Error(`${command} exited with code ${code}.`));
    });
  });
}

function runProcessQuiet(command, args, options) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      shell: shouldUseShell(command),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) =>
      resolvePromise({ code: 1, stdout, stderr: error.message }),
    );
    child.on('exit', (code) =>
      resolvePromise({ code: code ?? 1, stdout, stderr }),
    );
  });
}

function shouldUseShell(command) {
  return process.platform === 'win32' && command === 'pnpm';
}
