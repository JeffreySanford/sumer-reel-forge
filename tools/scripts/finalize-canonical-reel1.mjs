import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import {
  CANONICAL_REEL1_NARRATION_CUES,
  REEL_DURATION_SECONDS,
  assertCanonicalNarrationPlan,
  paceTempoForTarget,
} from '../renderer/canonical-reel1-audio-plan.mjs';
import {
  sha256,
  writeJson,
  writeText,
} from '../renderer/artifact-utils.mjs';
import {
  createEditorialAmbience,
  probeDurationSeconds,
} from '../renderer/ffmpeg-adapter.mjs';
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
const narrationCueDirectory = join(outputDirectory, 'narration-cues');
const narrationMixPath = join(outputDirectory, 'narration-mix.wav');
const ambiencePath = join(outputDirectory, 'ambience-bed.wav');
const outputPath = join(outputDirectory, 'reel-animation-v1.mp4');
const manifestPath = join(outputDirectory, 'animation-reel1-manifest.json');

if (!existsSync(visualPath)) {
  throw new Error(`Canonical Scene V2 visual is missing: ${visualPath}`);
}
if (!sourceScene.narration?.trim()) {
  throw new Error('Reel 1 production narration is missing from the source scene record.');
}

const narrationPlan = assertCanonicalNarrationPlan(sourceScene.narration);
await mkdir(narrationCueDirectory, { recursive: true });

const controls = {
  exaggeration: 0.5,
  cfgWeight: 0.4,
  temperature: 0.8,
};
const referenceArguments = config.chatterboxReferenceAudio
  ? ['--reference-audio', config.chatterboxReferenceAudio]
  : [];

console.log(
  `Generating ${narrationPlan.cueCount} shot-aligned Chatterbox narration cues...`,
);
const renderedCues = [];
for (const cue of CANONICAL_REEL1_NARRATION_CUES) {
  const cueId = String(cue.index).padStart(2, '0');
  const textPath = join(narrationCueDirectory, `cue-${cueId}.txt`);
  const rawPath = join(narrationCueDirectory, `cue-${cueId}-raw.wav`);
  const timingsPath = join(
    narrationCueDirectory,
    `cue-${cueId}-timings.json`,
  );
  const pacedPath = join(narrationCueDirectory, `cue-${cueId}.wav`);

  await writeText(textPath, `${cue.text}\n`);
  await runProcess(
    config.chatterboxCommand,
    chatterboxArgs([
      config.chatterboxScript,
      '--text-file',
      textPath,
      '--output-file',
      rawPath,
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
      '--seed',
      String(20260820 + cue.index - 1),
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

  const naturalDurationSeconds = await mediaDuration(rawPath);
  const paceTempo = paceTempoForTarget(
    naturalDurationSeconds,
    cue.targetDurationSeconds,
  );
  await runProcess(
    config.ffmpegCommand,
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      rawPath,
      '-filter:a',
      `atempo=${paceTempo.toFixed(5)},aresample=48000,aformat=channel_layouts=stereo`,
      '-c:a',
      'pcm_s16le',
      pacedPath,
    ],
    { cwd: outputDirectory },
  );

  const durationSeconds = await mediaDuration(pacedPath);
  const endSeconds = cue.startSeconds + durationSeconds;
  const nextCue = CANONICAL_REEL1_NARRATION_CUES[cue.index];
  const latestEndSeconds = nextCue
    ? nextCue.startSeconds - 0.1
    : narrationPlan.titleHoldStartSeconds;
  if (endSeconds > latestEndSeconds + 0.05) {
    throw new Error(
      `Narration cue ${cue.index} ends at ${endSeconds.toFixed(2)}s, past its ${latestEndSeconds.toFixed(2)}s window. Refusing to clip or hurry canonical narration.`,
    );
  }

  const rawTimings = JSON.parse(await readFile(timingsPath, 'utf8'));
  const timings = (Array.isArray(rawTimings) ? rawTimings : [rawTimings]).map(
    (timing) => ({
      ...timing,
      cueAudioPositionSeconds:
        Number(timing.audioPositionSeconds ?? 0) / paceTempo,
      reelAudioPositionSeconds:
        cue.startSeconds + Number(timing.audioPositionSeconds ?? 0) / paceTempo,
    }),
  );

  renderedCues.push({
    ...cue,
    textPath,
    rawPath,
    timingsPath,
    pacedPath,
    naturalDurationSeconds,
    paceTempo,
    durationSeconds,
    endSeconds,
    timings,
  });
  console.log(
    `Cue ${cueId}: ${cue.startSeconds.toFixed(1)}-${endSeconds.toFixed(1)}s, natural ${naturalDurationSeconds.toFixed(2)}s, tempo ${paceTempo.toFixed(3)}x`,
  );
}

await buildNarrationMix(renderedCues);
console.log('Generating continuous canonical Reel 1 ambience bed...');
await createEditorialAmbience({
  command: config.ffmpegCommand,
  durationSeconds: REEL_DURATION_SECONDS,
  outputPath: ambiencePath,
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
    visualPath,
    '-i',
    narrationMixPath,
    '-i',
    ambiencePath,
    '-filter_complex',
    '[1:a]aresample=48000,aformat=channel_layouts=stereo[narration];' +
      '[2:a]aresample=48000,aformat=channel_layouts=stereo,volume=0.85[ambience];' +
      '[narration][ambience]amix=inputs=2:weights=1 1:normalize=0,' +
      'loudnorm=I=-16:TP=-1.5:LRA=10,aresample=48000[audio]',
    '-map',
    '0:v:0',
    '-map',
    '[audio]',
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-t',
    String(REEL_DURATION_SECONDS),
    '-movflags',
    '+faststart',
    outputPath,
  ],
  { cwd: outputDirectory },
);

const finalDurationSeconds = await mediaDuration(outputPath);
if (Math.abs(finalDurationSeconds - REEL_DURATION_SECONDS) > 0.05) {
  throw new Error(
    `Canonical Reel 1 final media must be ${REEL_DURATION_SECONDS} seconds; measured ${finalDurationSeconds.toFixed(3)}s.`,
  );
}

const spokenDurationSeconds = renderedCues.reduce(
  (total, cue) => total + cue.durationSeconds,
  0,
);
await writeJson(manifestPath, {
  schemaVersion: 3,
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
    timingAdapter: 'shot-aligned-cue-timing',
    voice: 'chatterbox-narrator',
    model: 'ResembleAI/chatterbox',
    stylePreset: 'mythic',
    referenceAudio: Boolean(config.chatterboxReferenceAudio),
    ...controls,
    clipCount: renderedCues.length,
    durationSeconds: REEL_DURATION_SECONDS,
    spokenDurationSeconds,
    targetNarrationEndSeconds: narrationPlan.targetNarrationEndSeconds,
    titleHoldStartSeconds: narrationPlan.titleHoldStartSeconds,
    mixPath: narrationMixPath,
    checksum: await sha256(narrationMixPath),
    clips: await Promise.all(
      renderedCues.map(async (cue) => ({
        index: cue.index,
        text: cue.text,
        startFrame: Math.round(cue.startSeconds * 30),
        endFrame: Math.max(
          Math.round((cue.startSeconds + cue.durationSeconds) * 30) - 1,
          Math.round(cue.startSeconds * 30),
        ),
        startSeconds: cue.startSeconds,
        endSeconds: cue.endSeconds,
        targetDurationSeconds: cue.targetDurationSeconds,
        naturalDurationSeconds: cue.naturalDurationSeconds,
        paceTempo: cue.paceTempo,
        durationSeconds: cue.durationSeconds,
        audioPath: cue.pacedPath,
        rawAudioPath: cue.rawPath,
        timingsPath: cue.timingsPath,
        checksum: await sha256(cue.pacedPath),
        timings: cue.timings,
      })),
    ),
  },
  ambience: {
    adapter: 'procedural-editorial-bed',
    role: 'continuous-water-drum-lyre-bed',
    durationSeconds: REEL_DURATION_SECONDS,
    path: ambiencePath,
    checksum: await sha256(ambiencePath),
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
console.log(`Ambience bed: ${ambiencePath}`);
console.log(`Manifest: ${manifestPath}`);

async function buildNarrationMix(cues) {
  const args = ['-y', '-hide_banner', '-loglevel', 'error'];
  for (const cue of cues) {
    args.push('-i', cue.pacedPath);
  }
  const filters = cues.map((cue, index) => {
    const delayMs = Math.round(cue.startSeconds * 1000);
    return `[${index}:a]adelay=${delayMs}:all=1[cue${index}]`;
  });
  filters.push(
    `${cues.map((_, index) => `[cue${index}]`).join('')}amix=inputs=${cues.length}:normalize=0,` +
      `apad=whole_dur=${REEL_DURATION_SECONDS},atrim=0:${REEL_DURATION_SECONDS},` +
      'loudnorm=I=-17:TP=-2:LRA=9,aresample=48000,' +
      'aformat=channel_layouts=stereo[mix]',
  );
  args.push(
    '-filter_complex',
    filters.join(';'),
    '-map',
    '[mix]',
    '-c:a',
    'pcm_s16le',
    narrationMixPath,
  );
  await runProcess(config.ffmpegCommand, args, { cwd: outputDirectory });
}

async function mediaDuration(inputPath) {
  return probeDurationSeconds({
    command: config.ffprobeCommand,
    inputPath,
    outputDirectory,
    timeoutMs: config.processTimeoutMs,
    log: async (_stream, level, message) => {
      const normalized = String(message).trim();
      if (!normalized) return;
      const method =
        level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[method](normalized);
    },
  });
}

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
