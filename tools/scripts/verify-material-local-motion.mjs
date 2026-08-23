import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const PREVIEW_BASE = resolve('tmp/animation-previews');
const DEFAULT_MIN_MEAN_DIFF = 0.05;
const DEFAULT_MIN_CHANGED_RATIO = 0.001;
const DEFAULT_PIXEL_CHANGE_THRESHOLD = 2;

export const MATERIAL_MOTION_PRESETS = new Set([
  'waterPulse',
  'smokeDrift',
  'heavyPhysical',
  'riggingTension',
  'clothLag',
  'breathing',
  'numinousDrift',
  'blinkOnce',
]);

export function selectMaterialTargets(scene, candidateIds) {
  const candidateSet = new Set(candidateIds);
  const targets = [];
  for (const shot of scene?.shots ?? []) {
    for (const layer of shot.layers ?? []) {
      const presets = Array.isArray(layer.motionPresets) ? layer.motionPresets : [];
      const activePresets = presets.filter((preset) => MATERIAL_MOTION_PRESETS.has(preset));
      if (!candidateSet.has(layer.id) || !activePresets.length) continue;
      targets.push({
        shotId: shot.shotId,
        layerId: layer.id,
        role: layer.role ?? null,
        material: layer.material ?? null,
        activePresets,
      });
    }
  }
  return targets;
}

export function evaluateMaterialDifferential(comparisons, thresholds) {
  const requiredPassingFrames = Math.max(1, Math.ceil(comparisons.length * 0.4));
  const passingFrames = comparisons.filter(
    (comparison) =>
      comparison.meanAbsoluteDifference >= thresholds.minMeanDiff &&
      comparison.changedPixelRatio >= thresholds.minChangedRatio,
  ).length;
  return {
    pass: passingFrames >= requiredPassingFrames,
    passingFrames,
    requiredPassingFrames,
    peakMeanAbsoluteDifference: comparisons.reduce(
      (best, comparison) => Math.max(best, comparison.meanAbsoluteDifference),
      0,
    ),
    peakChangedPixelRatio: comparisons.reduce(
      (best, comparison) => Math.max(best, comparison.changedPixelRatio),
      0,
    ),
  };
}

async function main() {
  const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
  const shotLabel = String(options.shotNumber).padStart(2, '0');
  const previewRoot = resolve(PREVIEW_BASE, `shot${shotLabel}-layered-preview`);
  const previewDirectory = options.previewDir
    ? resolve(options.previewDir)
    : newestPreviewDirectory(previewRoot, options.shotNumber);

  const previewManifestPath = join(previewDirectory, 'preview-manifest.json');
  const propsPath = join(previewDirectory, 'scene-v2-candidate-props.json');
  const publicDirectory = join(previewDirectory, 'public');
  if (!existsSync(previewManifestPath)) {
    throw new Error(`Preview manifest not found: ${previewManifestPath}`);
  }
  if (!existsSync(propsPath)) {
    throw new Error(`Scene V2 candidate props not found: ${propsPath}`);
  }
  if (!existsSync(publicDirectory)) {
    throw new Error(`Candidate public directory not found: ${publicDirectory}`);
  }

  const previewManifest = JSON.parse(readFileSync(previewManifestPath, 'utf8'));
  if (previewManifest.sourceShotNumber !== options.shotNumber) {
    throw new Error(
      `Preview is for Shot ${previewManifest.sourceShotNumber ?? 'unknown'}, not Shot ${options.shotNumber}.`,
    );
  }
  const originalProps = JSON.parse(readFileSync(propsPath, 'utf8'));
  if (!originalProps.scene?.shots?.length) {
    throw new Error('Scene V2 candidate props do not contain a scene.');
  }

  const candidateIds = (previewManifest.candidates ?? []).map((candidate) => candidate.layerId);
  const targets = selectMaterialTargets(originalProps.scene, candidateIds);
  const reviewFrames = [...(previewManifest.reviewFrames ?? [])].sort(
    (a, b) => Number(a.progress ?? 0) - Number(b.progress ?? 0),
  );
  if (reviewFrames.length < 2) {
    throw new Error('Material-local QA requires at least two review frames.');
  }

  const thresholds = {
    minMeanDiff: options.minMeanDiff,
    minChangedRatio: options.minChangedRatio,
    pixelChangeThreshold: options.pixelChangeThreshold,
  };
  const evidenceRoot = join(previewDirectory, 'material-motion-qa');
  mkdirSync(evidenceRoot, { recursive: true });

  console.log(`Shot ${options.shotNumber} material-local baseline differential QA`);
  console.log(`Preview: ${previewDirectory}`);
  console.log(
    `Mode: ${options.enforce ? 'ENFORCE' : 'CALIBRATION'} · paired Remotion stills · same camera/grade/procedural scene`,
  );
  console.log(
    `Thresholds: mean diff >= ${options.minMeanDiff}, changed pixels >= ${(options.minChangedRatio * 100).toFixed(3)}% @ >${options.pixelChangeThreshold}/255`,
  );

  if (!targets.length) {
    const report = {
      schemaVersion: 1,
      verificationType: 'same-camera-frozen-layer-material-motion',
      generatedAt: new Date().toISOString(),
      sourceShotNumber: options.shotNumber,
      previewDirectory,
      applicable: false,
      enforced: options.enforce,
      pass: true,
      thresholds,
      targets: [],
      interpretation:
        'No QA-passed required candidate layer uses a recognized material-motion preset, so no material-local differential is required.',
    };
    const reportPath = join(previewDirectory, 'material-motion-qa.json');
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log('[skip] no required animated candidate layers');
    console.log(`Report: ${reportPath}`);
    return;
  }

  const targetReports = [];
  for (const target of targets) {
    const targetDirectory = join(evidenceRoot, safeName(target.layerId));
    mkdirSync(targetDirectory, { recursive: true });
    const frozenProps = structuredClone(originalProps);
    const frozenLayer = findLayer(frozenProps.scene, target.layerId);
    if (!frozenLayer) {
      throw new Error(`Could not find ${target.layerId} in staged Scene V2 props.`);
    }
    frozenLayer.motionPresets = (frozenLayer.motionPresets ?? []).filter(
      (preset) => !MATERIAL_MOTION_PRESETS.has(preset),
    );
    const frozenPropsPath = join(targetDirectory, 'frozen-props.json');
    writeFileSync(frozenPropsPath, `${JSON.stringify(frozenProps, null, 2)}\n`, 'utf8');

    console.log('');
    console.log(
      `Target ${target.layerId} · ${target.material ?? target.role ?? 'material'} · freeze ${target.activePresets.join(', ')}`,
    );

    const comparisons = [];
    for (const reviewFrame of reviewFrames) {
      const frame = Number(reviewFrame.frame);
      if (!Number.isInteger(frame) || frame < 0) {
        throw new Error(`Invalid review frame for ${reviewFrame.id ?? 'unknown marker'}.`);
      }
      const label = `${String(frame).padStart(4, '0')}-${safeName(reviewFrame.id ?? `frame-${frame}`)}`;
      const normalPath = join(targetDirectory, `${label}-normal.png`);
      const frozenPath = join(targetDirectory, `${label}-frozen.png`);
      const differencePath = join(targetDirectory, `${label}-difference.png`);

      renderStill({
        propsPath,
        publicDirectory,
        frame,
        outputPath: normalPath,
      });
      renderStill({
        propsPath: frozenPropsPath,
        publicDirectory,
        frame,
        outputPath: frozenPath,
      });
      const comparison = measureDifference({
        normalPath,
        frozenPath,
        differencePath,
        pixelChangeThreshold: options.pixelChangeThreshold,
      });
      comparisons.push({
        id: reviewFrame.id ?? null,
        progress: reviewFrame.progress ?? null,
        frame,
        ...comparison,
      });
      console.log(
        `  ${reviewFrame.id ?? frame}: mean ${comparison.meanAbsoluteDifference.toFixed(4)} · changed ${(comparison.changedPixelRatio * 100).toFixed(4)}%`,
      );
    }

    const evaluation = evaluateMaterialDifferential(comparisons, thresholds);
    targetReports.push({
      ...target,
      pass: evaluation.pass,
      ...evaluation,
      comparisons,
      evidenceDirectory: targetDirectory,
    });
    console.log(
      `  [${evaluation.pass ? 'ok' : 'review'}] ${evaluation.passingFrames}/${comparisons.length} beats exceed provisional material-motion floor (need ${evaluation.requiredPassingFrames})`,
    );
  }

  const pass = targetReports.every((target) => target.pass);
  const report = {
    schemaVersion: 1,
    verificationType: 'same-camera-frozen-layer-material-motion',
    generatedAt: new Date().toISOString(),
    sourceShotNumber: options.shotNumber,
    previewDirectory,
    applicable: true,
    enforced: options.enforce,
    pass,
    thresholds,
    targets: targetReports,
    interpretation:
      'Each normal PNG is compared with a same-frame Scene V2 control where only that candidate layer\'s recognized motion presets are frozen. Camera, grade, framing, and unrelated procedural effects are identical in both renders, so their contribution cancels from the differential. This proves material-local visual contribution independently of aggregate camera motion; explicit alpha-boundary containment remains a separate QA concern.',
  };
  const reportPath = join(previewDirectory, 'material-motion-qa.json');
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log('');
  console.log(`Material-local differential: ${pass ? 'PASS' : 'REVIEW'}`);
  if (!options.enforce) {
    console.log(
      'Calibration mode: thresholds are provisional and do not block promotion yet. Use this human-approved benchmark to set the production floor.',
    );
  }
  console.log(`Report: ${reportPath}`);
  if (options.enforce && !pass) process.exitCode = 2;
}

function findLayer(scene, layerId) {
  for (const shot of scene?.shots ?? []) {
    const layer = (shot.layers ?? []).find((candidate) => candidate.id === layerId);
    if (layer) return layer;
  }
  return undefined;
}

function renderStill({ propsPath, publicDirectory, frame, outputPath }) {
  const result = spawnSync(
    'pnpm',
    [
      'exec',
      'remotion',
      'still',
      resolve('tools/animation/src/index.tsx'),
      'SceneV2Benchmark',
      outputPath,
      `--props=${propsPath}`,
      `--public-dir=${publicDirectory}`,
      `--frame=${frame}`,
      '--overwrite',
      '--quiet',
    ],
    {
      cwd: resolve('.'),
      shell: process.platform === 'win32',
      stdio: 'inherit',
      windowsHide: true,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Remotion still render failed with exit code ${result.status ?? 1}.`);
  }
}

function measureDifference({
  normalPath,
  frozenPath,
  differencePath,
  pixelChangeThreshold,
}) {
  const ffmpeg = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
  const raw = spawnSync(
    ffmpeg,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      normalPath,
      '-i',
      frozenPath,
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
    {
      cwd: resolve('.'),
      encoding: null,
      maxBuffer: 32 * 1024 * 1024,
      windowsHide: true,
      shell: false,
    },
  );
  if (raw.error) throw raw.error;
  if (raw.status !== 0) {
    throw new Error(`ffmpeg material difference failed: ${String(raw.stderr ?? '').trim()}`);
  }
  if (!Buffer.isBuffer(raw.stdout) || !raw.stdout.length) {
    throw new Error('ffmpeg produced no material-difference pixels.');
  }

  let sum = 0;
  let changed = 0;
  for (const value of raw.stdout) {
    sum += value;
    if (value > pixelChangeThreshold) changed += 1;
  }

  const difference = spawnSync(
    ffmpeg,
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      normalPath,
      '-i',
      frozenPath,
      '-filter_complex',
      '[0:v][1:v]blend=all_mode=difference,format=rgb24',
      '-frames:v',
      '1',
      differencePath,
    ],
    {
      cwd: resolve('.'),
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
      shell: false,
    },
  );
  if (difference.error) throw difference.error;
  if (difference.status !== 0) {
    throw new Error(
      `ffmpeg material difference image failed: ${String(difference.stderr ?? '').trim()}`,
    );
  }

  return {
    normalPath,
    frozenPath,
    differencePath,
    comparedPixels: raw.stdout.length,
    meanAbsoluteDifference: sum / raw.stdout.length,
    changedPixelRatio: changed / raw.stdout.length,
  };
}

function newestPreviewDirectory(root, shotNumber) {
  if (!existsSync(root)) {
    throw new Error(
      `Shot ${shotNumber} preview root does not exist: ${root}. Run animation:shot:review or the candidate preview first.`,
    );
  }
  const directories = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  if (!directories.length) {
    throw new Error(`No Shot ${shotNumber} previews found under ${root}.`);
  }
  return directories[0];
}

function safeName(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function parseOptions(args) {
  const result = {
    shotNumber: 0,
    previewDir: undefined,
    enforce: false,
    minMeanDiff: DEFAULT_MIN_MEAN_DIFF,
    minChangedRatio: DEFAULT_MIN_CHANGED_RATIO,
    pixelChangeThreshold: DEFAULT_PIXEL_CHANGE_THRESHOLD,
  };
  for (const arg of args) {
    if (arg.startsWith('--shot=')) {
      const value = Number(arg.slice('--shot='.length));
      if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid ${arg}`);
      result.shotNumber = value;
    } else if (arg.startsWith('--preview-dir=')) {
      result.previewDir = arg.slice('--preview-dir='.length);
    } else if (arg === '--enforce') {
      result.enforce = true;
    } else if (arg.startsWith('--min-mean-diff=')) {
      result.minMeanDiff = numberOption(arg, '--min-mean-diff=');
    } else if (arg.startsWith('--min-changed-ratio=')) {
      result.minChangedRatio = numberOption(arg, '--min-changed-ratio=');
    } else if (arg.startsWith('--pixel-change-threshold=')) {
      result.pixelChangeThreshold = numberOption(arg, '--pixel-change-threshold=');
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  if (!result.shotNumber) throw new Error('--shot=<number> is required.');
  return result;
}

function numberOption(arg, prefix) {
  const value = Number(arg.slice(prefix.length));
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${prefix.slice(0, -1)} must be a non-negative number.`);
  }
  return value;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
