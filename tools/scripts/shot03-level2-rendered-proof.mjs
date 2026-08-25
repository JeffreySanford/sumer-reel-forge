import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve('.');
const SCENE_PATH = resolve(
  'tools/animation/scenes/reel-01-shot-03-benchmark.scene-v2.json',
);
const MANIFEST_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const ASSET_ROOT = resolve('assets');
const PROOF_ROOT = resolve('tmp/animation-previews/shot03-level2-proof');
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const OPTIONAL_LEVEL2_IDS = ['shot03-enki-eyes-v1', 'shot03-rigging-v1'];

const MOTION_FRAMES = [30, 60, 90, 120, 150];
const THRESHOLDS = {
  vessel: {
    minMeanDiff: 0.001,
    minChangedRatio: 0.0001,
    requiredPassingFrames: 3,
  },
  rigging: {
    minMeanDiff: 0.0002,
    minChangedRatio: 0.00001,
    requiredPassingFrames: 3,
  },
  blink: {
    minMeanDiff: 0.0002,
    minChangedRatio: 0.00001,
    minConsecutiveActiveFrames: 3,
    maxChangedRatio: 0.0065,
    returnChangedRatioMax: 0.000001,
  },
};

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const manifestShot = manifest.shots?.find((item) => item.sourceShotNumber === 3);
  if (!manifestShot) throw new Error('Shot 3 is missing from the animation manifest.');

  const approvedLevel2 = [];
  for (const layerId of OPTIONAL_LEVEL2_IDS) {
    const layer = manifestShot.layers?.find((item) => item.id === layerId);
    if (!layer?.path) throw new Error(`${layerId} is missing its canonical path.`);
    if (layer.state !== 'approved' || layer.review?.status !== 'approved') {
      throw new Error(`${layerId} must be human-approved before rendered Level 2 proof.`);
    }
    if (!/^sha256:[a-f0-9]{64}$/i.test(layer.sha256 ?? '')) {
      throw new Error(`${layerId} is missing checksum provenance.`);
    }
    const path = resolve(ASSET_ROOT, layer.path);
    const actual = prefixedSha(await readFile(path));
    if (normalizeSha(actual) !== normalizeSha(layer.sha256)) {
      throw new Error(`${layerId} canonical checksum does not match the manifest.`);
    }
    approvedLevel2.push({ layerId, path, checksum: actual });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDirectory = join(PROOF_ROOT, stamp);
  const canonicalDirectory = join(outputDirectory, 'canonical');
  const controlsDirectory = join(outputDirectory, 'controls');
  const evidenceDirectory = join(outputDirectory, 'evidence');
  await Promise.all([
    mkdir(canonicalDirectory, { recursive: true }),
    mkdir(controlsDirectory, { recursive: true }),
    mkdir(evidenceDirectory, { recursive: true }),
  ]);

  console.log('Shot 3 Level 2 rendered-motion proof');
  console.log('[1/5] Render canonical approved Shot 3...');
  run(
    'pnpm',
    ['exec', 'tsx', 'tools/scripts/render-scene-v2-benchmark.ts', SCENE_PATH],
    {
      env: {
        ...process.env,
        SCENE_V2_BENCHMARK_OUTPUT_DIRECTORY: canonicalDirectory,
      },
    },
  );

  const canonicalPropsPath = join(canonicalDirectory, 'scene-v2-props.json');
  const canonicalVideoPath = join(
    canonicalDirectory,
    'shot3-scene-v2-benchmark.mp4',
  );
  const canonicalProps = JSON.parse(await readFile(canonicalPropsPath, 'utf8'));
  const canonicalShot = canonicalProps.scene?.shots?.find(
    (item) => item.sourceShotNumber === 3,
  );
  if (!canonicalShot) throw new Error('Rendered canonical props do not contain Shot 3.');

  for (const layerId of OPTIONAL_LEVEL2_IDS) {
    if (!canonicalShot.layers?.some((layer) => layer.id === layerId)) {
      throw new Error(`Canonical render did not stage approved Level 2 layer ${layerId}.`);
    }
  }
  const blinkPerformance = canonicalShot.performance?.find(
    (item) => item.preset === 'blinkOnce',
  );
  if (!blinkPerformance || blinkPerformance.enabled === false) {
    throw new Error('Canonical render did not activate approved blinkOnce performance.');
  }

  console.log('[2/5] Build Level 1 and frozen-motion controls...');
  const level1Props = structuredClone(canonicalProps);
  const level1Shot = shot3(level1Props);
  level1Shot.layers = level1Shot.layers.filter(
    (layer) => !OPTIONAL_LEVEL2_IDS.includes(layer.id),
  );
  disableBlink(level1Shot);

  const vesselFrozenProps = structuredClone(canonicalProps);
  removePreset(shot3(vesselFrozenProps), 'shot03-vessel-v1', 'heavyPhysical');

  const riggingFrozenProps = structuredClone(canonicalProps);
  removePreset(shot3(riggingFrozenProps), 'shot03-rigging-v1', 'riggingTension');

  const blinkDisabledProps = structuredClone(canonicalProps);
  disableBlink(shot3(blinkDisabledProps));

  const level1PropsPath = await writeControl(
    controlsDirectory,
    'level1-control-props.json',
    level1Props,
  );
  const vesselFrozenPropsPath = await writeControl(
    controlsDirectory,
    'vessel-frozen-props.json',
    vesselFrozenProps,
  );
  const riggingFrozenPropsPath = await writeControl(
    controlsDirectory,
    'rigging-frozen-props.json',
    riggingFrozenProps,
  );
  const blinkDisabledPropsPath = await writeControl(
    controlsDirectory,
    'blink-disabled-props.json',
    blinkDisabledProps,
  );

  const level1VideoPath = join(outputDirectory, 'shot03-level1-control.mp4');
  renderVideo(level1PropsPath, level1VideoPath);
  const abVideoPath = join(outputDirectory, 'shot03-level1-vs-level2-ab.mp4');
  makeAbVideo(level1VideoPath, canonicalVideoPath, abVideoPath);

  console.log('[3/5] Prove vessel and rigging visual contribution with same-frame controls...');
  const vesselComparisons = await compareFrames({
    label: 'vessel',
    frames: MOTION_FRAMES,
    canonicalPropsPath,
    controlPropsPath: vesselFrozenPropsPath,
    evidenceDirectory,
  });
  const riggingComparisons = await compareFrames({
    label: 'rigging',
    frames: MOTION_FRAMES,
    canonicalPropsPath,
    controlPropsPath: riggingFrozenPropsPath,
    evidenceDirectory,
  });

  const vesselEvaluation = repeatableMotionEvaluation(
    vesselComparisons,
    THRESHOLDS.vessel,
  );
  const riggingEvaluation = repeatableMotionEvaluation(
    riggingComparisons,
    THRESHOLDS.rigging,
  );

  console.log('[4/5] Prove blink persistence and clean open-state return...');
  const durationFrames = canonicalProps.scene.durationFrames;
  const blinkStartFrame = clampFrame(
    Math.round(blinkPerformance.startProgress * (durationFrames - 1)),
    durationFrames,
  );
  const blinkEndFrame = clampFrame(
    Math.round(blinkPerformance.endProgress * (durationFrames - 1)),
    durationFrames,
  );
  const activeBlinkFrames = [];
  for (let frame = blinkStartFrame + 1; frame <= blinkEndFrame - 1; frame += 1) {
    activeBlinkFrames.push(frame);
  }
  const returnFrames = [
    clampFrame(blinkStartFrame - 2, durationFrames),
    clampFrame(blinkEndFrame + 2, durationFrames),
  ];
  const blinkFrames = [...new Set([...returnFrames, ...activeBlinkFrames])].sort(
    (a, b) => a - b,
  );
  const blinkComparisons = await compareFrames({
    label: 'blink',
    frames: blinkFrames,
    canonicalPropsPath,
    controlPropsPath: blinkDisabledPropsPath,
    evidenceDirectory,
  });
  const blinkEvaluation = evaluateBlink({
    comparisons: blinkComparisons,
    activeFrames: activeBlinkFrames,
    returnFrames,
    thresholds: THRESHOLDS.blink,
  });

  console.log('[5/5] Write proof report...');
  const deterministicPass =
    vesselEvaluation.pass && riggingEvaluation.pass && blinkEvaluation.pass;
  const report = {
    schemaVersion: 1,
    proofType: 'shot03-level2-rendered-motion-proof',
    generatedAt: new Date().toISOString(),
    sourceShotNumber: 3,
    scenePath: SCENE_PATH,
    manifestPath: MANIFEST_PATH,
    approvedLevel2,
    outputDirectory,
    canonical: {
      propsPath: canonicalPropsPath,
      videoPath: canonicalVideoPath,
      videoChecksum: prefixedSha(await readFile(canonicalVideoPath)),
    },
    level1Control: {
      propsPath: level1PropsPath,
      videoPath: level1VideoPath,
      videoChecksum: prefixedSha(await readFile(level1VideoPath)),
    },
    abReview: {
      videoPath: abVideoPath,
      videoChecksum: prefixedSha(await readFile(abVideoPath)),
      left: 'Level 1 control: canonical required layers with Level 2 rigging and blink removed',
      right: 'Level 2 canonical: approved rigging + blink active',
      humanPreferenceRequired: true,
      automatedPreferenceAllowed: false,
    },
    vessel: {
      controlPropsPath: vesselFrozenPropsPath,
      thresholds: THRESHOLDS.vessel,
      ...vesselEvaluation,
      comparisons: vesselComparisons,
      interpretation:
        'Normal and frozen-vessel stills use the same frame, camera, grade, atmosphere, lighting, and unrelated layer motion. The differential therefore isolates heavyPhysical vessel contribution from camera motion.',
    },
    rigging: {
      controlPropsPath: riggingFrozenPropsPath,
      thresholds: THRESHOLDS.rigging,
      ...riggingEvaluation,
      comparisons: riggingComparisons,
      lagModel: {
        expectedSeconds: 0.24,
        causalityEvidence:
          'tools/renderer/level2-rigging-causality-gate.test.mjs',
      },
      interpretation:
        'Normal and frozen-rigging stills use the same frame and camera; differential pixels prove rendered rigging contribution while the existing numerical causality gate proves the 0.24s vessel-driven lag.',
    },
    blink: {
      controlPropsPath: blinkDisabledPropsPath,
      thresholds: THRESHOLDS.blink,
      startFrame: blinkStartFrame,
      endFrame: blinkEndFrame,
      activeFrames: activeBlinkFrames,
      returnFrames,
      ...blinkEvaluation,
      comparisons: blinkComparisons,
      interpretation:
        'Same-frame blink-disabled controls cancel camera and all other motion. Multiple consecutive active frames prove persistence; zero/near-zero differential before and after the window proves clean return to the open-eye baseline. The bounded changed-pixel ratio guards against broad face changes.',
    },
    deterministicPass,
    humanReview: {
      required: true,
      normalSpeedAbRequired: true,
      questions: [
        'Is Level 2 clearly preferable to Level 1 at normal speed?',
        'Does the rigging feel attached to the vessel rather than independently oscillating?',
        'Does the blink read naturally without a face pop or patch seam?',
        'Does Enki remain visually registered to the vessel throughout the shot?',
        'Does the added motion remain restrained rather than theatrical?',
      ],
    },
  };
  const reportPath = join(outputDirectory, 'shot03-level2-rendered-proof.json');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log('');
  console.log(`[${vesselEvaluation.pass ? 'PASS' : 'REVIEW'}] vessel contribution: ${vesselEvaluation.passingFrames}/${vesselComparisons.length} beats`);
  console.log(`[${riggingEvaluation.pass ? 'PASS' : 'REVIEW'}] rigging contribution: ${riggingEvaluation.passingFrames}/${riggingComparisons.length} beats`);
  console.log(`[${blinkEvaluation.pass ? 'PASS' : 'REVIEW'}] blink: max active run ${blinkEvaluation.maxConsecutiveActiveFrames} frames · return ${blinkEvaluation.returnPass ? 'clean' : 'review'}`);
  console.log(`[INFO] A/B review: ${abVideoPath}`);
  console.log(`[INFO] proof report: ${reportPath}`);
  console.log(
    deterministicPass
      ? 'STATUS: DETERMINISTIC RENDERED PROOF PASS — human normal-speed A/B remains required.'
      : 'STATUS: REVIEW — inspect evidence before changing any threshold or animation behavior.',
  );
  if (!deterministicPass) process.exitCode = 2;
}

function shot3(props) {
  const shot = props.scene?.shots?.find((item) => item.sourceShotNumber === 3);
  if (!shot) throw new Error('Control props do not contain Shot 3.');
  return shot;
}

function removePreset(shot, layerId, preset) {
  const layer = shot.layers?.find((item) => item.id === layerId);
  if (!layer) throw new Error(`Control could not find ${layerId}.`);
  layer.motionPresets = (layer.motionPresets ?? []).filter((item) => item !== preset);
}

function disableBlink(shot) {
  const blink = shot.performance?.find((item) => item.preset === 'blinkOnce');
  if (!blink) throw new Error('Control could not find blinkOnce performance.');
  blink.enabled = false;
}

async function writeControl(directory, filename, value) {
  const path = join(directory, filename);
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return path;
}

function renderVideo(propsPath, outputPath) {
  run('pnpm', [
    'exec',
    'remotion',
    'render',
    resolve('tools/animation/src/index.tsx'),
    'SceneV2Benchmark',
    outputPath,
    `--props=${propsPath}`,
    `--public-dir=${ASSET_ROOT}`,
    '--codec=h264',
    '--pixel-format=yuv420p',
    '--overwrite',
    '--quiet',
  ]);
}

function renderStill(propsPath, frame, outputPath) {
  run('pnpm', [
    'exec',
    'remotion',
    'still',
    resolve('tools/animation/src/index.tsx'),
    'SceneV2Benchmark',
    outputPath,
    `--props=${propsPath}`,
    `--public-dir=${ASSET_ROOT}`,
    `--frame=${frame}`,
    '--overwrite',
    '--quiet',
  ]);
}

async function compareFrames({
  label,
  frames,
  canonicalPropsPath,
  controlPropsPath,
  evidenceDirectory,
}) {
  const directory = join(evidenceDirectory, label);
  await mkdir(directory, { recursive: true });
  const comparisons = [];
  for (const frame of frames) {
    const stem = `${String(frame).padStart(4, '0')}`;
    const canonicalPath = join(directory, `${stem}-canonical.png`);
    const controlPath = join(directory, `${stem}-control.png`);
    const differencePath = join(directory, `${stem}-difference.png`);
    renderStill(canonicalPropsPath, frame, canonicalPath);
    renderStill(controlPropsPath, frame, controlPath);
    const measurement = measureDifference(
      canonicalPath,
      controlPath,
      differencePath,
    );
    comparisons.push({ frame, ...measurement });
  }
  return comparisons;
}

function measureDifference(canonicalPath, controlPath, differencePath) {
  const raw = spawnSync(
    FFMPEG,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      canonicalPath,
      '-i',
      controlPath,
      '-filter_complex',
      '[0:v][1:v]blend=all_mode=difference,format=gray',
      '-frames:v',
      '1',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'gray',
      'pipe:1',
    ],
    { cwd: ROOT, encoding: null, maxBuffer: 32 * 1024 * 1024 },
  );
  if (raw.error) throw raw.error;
  if (raw.status !== 0) {
    throw new Error(`ffmpeg difference failed: ${String(raw.stderr ?? '').trim()}`);
  }
  let sum = 0;
  let changed = 0;
  for (const value of raw.stdout) {
    sum += value;
    if (value > 2) changed += 1;
  }

  runFfmpeg([
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    canonicalPath,
    '-i',
    controlPath,
    '-filter_complex',
    '[0:v][1:v]blend=all_mode=difference,format=rgb24',
    '-frames:v',
    '1',
    differencePath,
  ]);

  return {
    canonicalPath,
    controlPath,
    differencePath,
    meanAbsoluteDifference: raw.stdout.length ? sum / raw.stdout.length : 0,
    changedPixelRatio: raw.stdout.length ? changed / raw.stdout.length : 0,
  };
}

function repeatableMotionEvaluation(comparisons, thresholds) {
  const passingFrames = comparisons.filter(
    (item) =>
      item.meanAbsoluteDifference >= thresholds.minMeanDiff &&
      item.changedPixelRatio >= thresholds.minChangedRatio,
  ).length;
  return {
    pass: passingFrames >= thresholds.requiredPassingFrames,
    passingFrames,
    peakMeanAbsoluteDifference: Math.max(
      0,
      ...comparisons.map((item) => item.meanAbsoluteDifference),
    ),
    peakChangedPixelRatio: Math.max(
      0,
      ...comparisons.map((item) => item.changedPixelRatio),
    ),
  };
}

function evaluateBlink({ comparisons, activeFrames, returnFrames, thresholds }) {
  const byFrame = new Map(comparisons.map((item) => [item.frame, item]));
  const activeFlags = activeFrames.map((frame) => {
    const item = byFrame.get(frame);
    return Boolean(
      item &&
        item.meanAbsoluteDifference >= thresholds.minMeanDiff &&
        item.changedPixelRatio >= thresholds.minChangedRatio &&
        item.changedPixelRatio <= thresholds.maxChangedRatio,
    );
  });
  let run = 0;
  let maxRun = 0;
  for (const active of activeFlags) {
    run = active ? run + 1 : 0;
    maxRun = Math.max(maxRun, run);
  }
  const returnComparisons = returnFrames.map((frame) => byFrame.get(frame));
  const returnPass = returnComparisons.every(
    (item) =>
      item && item.changedPixelRatio <= thresholds.returnChangedRatioMax,
  );
  const activePeakChangedPixelRatio = Math.max(
    0,
    ...activeFrames.map((frame) => byFrame.get(frame)?.changedPixelRatio ?? 0),
  );
  return {
    pass: maxRun >= thresholds.minConsecutiveActiveFrames && returnPass,
    maxConsecutiveActiveFrames: maxRun,
    returnPass,
    activePeakChangedPixelRatio,
  };
}

function makeAbVideo(level1VideoPath, level2VideoPath, outputPath) {
  runFfmpeg([
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    level1VideoPath,
    '-i',
    level2VideoPath,
    '-filter_complex',
    '[0:v][1:v]hstack=inputs=2[out]',
    '-map',
    '[out]',
    '-an',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'veryfast',
    outputPath,
  ]);
}

function runFfmpeg(args) {
  const result = spawnSync(FFMPEG, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed: ${result.stderr || result.stdout || 'unknown error'}`);
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: options.env ?? process.env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status ?? 1}.`);
  }
}

function prefixedSha(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function normalizeSha(value) {
  return String(value ?? '').replace(/^sha256:/i, '').toLowerCase();
}

function clampFrame(frame, durationFrames) {
  return Math.max(0, Math.min(durationFrames - 1, frame));
}
