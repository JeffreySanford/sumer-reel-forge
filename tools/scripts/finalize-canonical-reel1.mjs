import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import {
  sha256,
  writeJson,
  writeText,
} from '../renderer/artifact-utils.mjs';
import { probeDurationSeconds } from '../renderer/ffmpeg-adapter.mjs';
import { loadRendererConfig } from '../renderer/renderer-config.mjs';

loadLocalEnvFile();

const config = loadRendererConfig();
const outputDirectory = resolve(
  process.env.ANIMATION_PROOF_OUTPUT_DIRECTORY ??
    'tmp/renders/canonical-reel1-scene-v2',
);
const sourceScenePath = resolve(
  'tools/animation/scenes/reel-01-full-animation.scene.json',
);
const sourceScene = JSON.parse(await readFile(sourceScenePath, 'utf8'));
const visualPath = join(outputDirectory, 'reel-animation-v1-visual.mp4');
const narrationTextPath = join(outputDirectory, 'narration-01.txt');
const narrationPath = join(outputDirectory, 'narration-01.wav');
const timingsPath = join(outputDirectory, 'narration-01.timings.json');
const narrationMixPath = join(outputDirectory, 'narration-mix.wav');
const outputPath = join(outputDirectory, 'reel-animation-v1.mp4');
const manifestPath = join(outputDirectory, 'animation-reel1-manifest.json');

if (!existsSync(visualPath)) {
  throw new Error(`Canonical Scene V2 visual is missing: ${visualPath}`);
}
if (!sourceScene.narration?.trim()) {
  throw new Error('Reel 1 production narration is missing from the source scene record.');
}

await mkdir(outputDirectory, { recursive: true });
await writeText(narrationTextPath, `${sourceScene.narration}\n`);

const controls = {
  exaggeration: 0.5,
  cfgWeight: 0.4,
  temperature: 0.8,
};
const referenceArguments = config.chatterboxReferenceAudio
  ? ['--reference-audio', config.chatterboxReferenceAudio]
  : [];

console.log('Generating canonical Reel 1 Chatterbox narration...');
await runProcess(
  config.chatterboxCommand,
  chatterboxArgs([
    config.chatterboxScript,
    '--text-file',
    narrationTextPath,
    '--output-file',
    narrationPath,
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
  {
    cwd: resolve('.'),
    env: {
      PYTHONWARNINGS: 'ignore::UserWarning,ignore::FutureWarning',
      TRANSFORMERS_VERBOSITY: 'error',
    },
  },
);

const narrationDurationSeconds = await probeDurationSeconds({
  command: config.ffprobeCommand,
  inputPath: narrationPath,
  outputDirectory,
  timeoutMs: config.processTimeoutMs,
  log: async (_stream, level, message) => {
    const normalized = String(message).trim();
    if (!normalized) return;
    const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[method](normalized);
  },
});

await runProcess(
  config.ffmpegCommand,
  [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    narrationPath,
    '-filter_complex',
    '[0:a]aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur=60,atrim=0:60[mix]',
    '-map',
    '[mix]',
    '-c:a',
    'pcm_s16le',
    narrationMixPath,
  ],
  { cwd: outputDirectory },
);

await runProcess(
  config.ffmpegCommand,
  [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    visualPath,
    '-i',
    narrationMixPath,
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
    '-t',
    '60',
    '-movflags',
    '+faststart',
    outputPath,
  ],
  { cwd: outputDirectory },
);

const finalDurationSeconds = await probeDurationSeconds({
  command: config.ffprobeCommand,
  inputPath: outputPath,
  outputDirectory,
  timeoutMs: config.processTimeoutMs,
  log: async () => {},
});
if (Math.abs(finalDurationSeconds - 60) > 0.05) {
  throw new Error(
    `Canonical Reel 1 final media must be 60 seconds; measured ${finalDurationSeconds.toFixed(3)}s.`,
  );
}

const timings = JSON.parse(await readFile(timingsPath, 'utf8'));
await writeJson(manifestPath, {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  adapter: 'animation',
  engine: 'remotion-scene-v2',
  scenePath: sourceScenePath,
  canonicalSceneEvidencePath: join(
    outputDirectory,
    'canonical-reel1-scene-v2.json',
  ),
  outputPath,
  output: {
    width: 1080,
    height: 1920,
    fps: 30,
    durationFrames: 1800,
    durationSeconds: finalDurationSeconds,
    checksum: await sha256(outputPath),
  },
  narration: {
    adapter: 'chatterbox',
    timingAdapter: 'estimated-word-timing',
    voice: 'chatterbox-narrator',
    model: 'ResembleAI/chatterbox',
    stylePreset: 'mythic',
    referenceAudio: Boolean(config.chatterboxReferenceAudio),
    ...controls,
    clipCount: 1,
    durationSeconds: narrationDurationSeconds,
    mixPath: narrationMixPath,
    checksum: await sha256(narrationMixPath),
    clips: [
      {
        index: 1,
        text: sourceScene.narration,
        startFrame: 0,
        endFrame: 1799,
        startSeconds: 0,
        endSeconds: 60,
        durationSeconds: narrationDurationSeconds,
        audioPath: narrationPath,
        timingsPath,
        checksum: await sha256(narrationPath),
        timings: Array.isArray(timings) ? timings : [timings],
      },
    ],
  },
  sourcePolicy: {
    storyMutationAllowed: false,
    narrationSource: 'reel-production-record',
    captionSource: 'reel-production-record',
    visualSource: 'approved-animation-v1-canonical-assets',
  },
  completeReelDraft: true,
});

console.log(`Canonical Reel 1 completed: ${outputPath}`);
console.log(`Narration mix: ${narrationMixPath}`);
console.log(`Manifest: ${manifestPath}`);

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

function chatterboxArgs(args) {
  if (basename(config.chatterboxCommand).toLowerCase().startsWith('uv')) {
    return ['run', '--project', config.chatterboxProjectDirectory, ...args];
  }
  return args;
}

function runProcess(command, args, options) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: process.platform === 'win32' && command === 'pnpm',
      stdio: 'inherit',
      windowsHide: true,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} exited with code ${code}.`));
    });
  });
}
