import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { newestCompletePreviewDirectory } from './verify-material-local-motion.mjs';

const PREVIEW_BASE = resolve('tmp/animation-previews');
const DEFAULT_PIXEL_CHANGE_THRESHOLD = 2;
const DEFAULT_MASK_THRESHOLD = 16;
const DEFAULT_DILATION_RADIUS = 2;
const DEFAULT_MAX_SPILL_RATIO_OF_CHANGED = 0.001;

export function evaluateContainmentComparison({
  differencePixels,
  maskPixels,
  width,
  height,
  pixelChangeThreshold = DEFAULT_PIXEL_CHANGE_THRESHOLD,
  maskThreshold = DEFAULT_MASK_THRESHOLD,
  dilationRadius = DEFAULT_DILATION_RADIUS,
  maxSpillRatioOfChanged = DEFAULT_MAX_SPILL_RATIO_OF_CHANGED,
}) {
  if (!Buffer.isBuffer(differencePixels) || !Buffer.isBuffer(maskPixels)) {
    throw new Error('Containment evaluation requires grayscale pixel buffers.');
  }
  if (differencePixels.length !== maskPixels.length) {
    throw new Error('Difference and mask buffers must contain the same number of pixels.');
  }
  if (differencePixels.length !== width * height) {
    throw new Error(
      `Containment pixel count ${differencePixels.length} does not match ${width}x${height}.`,
    );
  }

  const mask = new Uint8Array(maskPixels.length);
  for (let index = 0; index < maskPixels.length; index += 1) {
    if (maskPixels[index] > maskThreshold) mask[index] = 1;
  }
  const allowed = dilateBinaryMask(mask, width, height, dilationRadius);

  let changedPixels = 0;
  let insideChangedPixels = 0;
  let spillPixels = 0;
  let toleranceRingChangedPixels = 0;

  for (let index = 0; index < differencePixels.length; index += 1) {
    if (differencePixels[index] <= pixelChangeThreshold) continue;
    changedPixels += 1;
    if (allowed[index]) {
      insideChangedPixels += 1;
      if (!mask[index]) toleranceRingChangedPixels += 1;
    } else {
      spillPixels += 1;
    }
  }

  const spillRatioOfChanged = changedPixels ? spillPixels / changedPixels : 0;
  const spillRatioOfCanvas = spillPixels / differencePixels.length;
  return {
    pass: changedPixels > 0 && spillRatioOfChanged <= maxSpillRatioOfChanged,
    changedPixels,
    insideChangedPixels,
    spillPixels,
    toleranceRingChangedPixels,
    spillRatioOfChanged,
    spillRatioOfCanvas,
    pixelChangeThreshold,
    maskThreshold,
    dilationRadius,
    maxSpillRatioOfChanged,
  };
}

async function main() {
  const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
  const shotLabel = String(options.shotNumber).padStart(2, '0');
  const previewRoot = resolve(PREVIEW_BASE, `shot${shotLabel}-layered-preview`);
  const previewDirectory = options.previewDir
    ? resolve(options.previewDir)
    : newestCompletePreviewDirectory(previewRoot, options.shotNumber);

  const previewManifestPath = join(previewDirectory, 'preview-manifest.json');
  const propsPath = join(previewDirectory, 'scene-v2-candidate-props.json');
  const materialQaPath = join(previewDirectory, 'material-motion-qa.json');
  const publicDirectory = join(previewDirectory, 'public');

  for (const path of [previewManifestPath, propsPath, materialQaPath]) {
    if (!existsSync(path)) throw new Error(`Required containment evidence not found: ${path}`);
  }

  const previewManifest = JSON.parse(readFileSync(previewManifestPath, 'utf8'));
  const originalProps = JSON.parse(readFileSync(propsPath, 'utf8'));
  const materialQa = JSON.parse(readFileSync(materialQaPath, 'utf8'));
  if (previewManifest.sourceShotNumber !== options.shotNumber) {
    throw new Error(
      `Preview is for Shot ${previewManifest.sourceShotNumber ?? 'unknown'}, not Shot ${options.shotNumber}.`,
    );
  }

  const width = Number(previewManifest.renderCanvas?.width ?? originalProps.scene?.width);
  const height = Number(previewManifest.renderCanvas?.height ?? originalProps.scene?.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error('Containment QA requires valid render dimensions.');
  }

  const targetReports = [];
  const containedTargets = (materialQa.targets ?? []).filter((target) => {
    const layer = findLayer(originalProps.scene, target.layerId);
    return (
      layer?.role === 'water' &&
      layer?.material === 'water' &&
      String(layer?.anchor ?? '').includes('water-basin') &&
      (target.activePresets ?? []).includes('waterPulse')
    );
  });

  console.log(`Shot ${options.shotNumber} contained-material boundary QA`);
  console.log(`Preview: ${previewDirectory}`);
  console.log(
    `Policy: target motion must remain inside the camera-matched source alpha with ${options.dilationRadius}px antialias tolerance; spill <= ${(options.maxSpillRatioOfChanged * 100).toFixed(3)}% of materially changed pixels.`,
  );

  if (!containedTargets.length) {
    const report = {
      schemaVersion: 1,
      verificationType: 'camera-matched-contained-material-boundary',
      generatedAt: new Date().toISOString(),
      sourceShotNumber: options.shotNumber,
      previewDirectory,
      applicable: false,
      pass: true,
      targets: [],
      interpretation:
        'No required material-local target is a contained water-basin layer, so boundary containment is not applicable.',
    };
    const reportPath = join(previewDirectory, 'contained-material-boundary-qa.json');
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log('[skip] no contained water-basin material targets');
    console.log(`Report: ${reportPath}`);
    return;
  }

  const evidenceRoot = join(previewDirectory, 'contained-material-boundary-qa');
  mkdirSync(evidenceRoot, { recursive: true });

  for (const target of containedTargets) {
    const layer = findLayer(originalProps.scene, target.layerId);
    const targetDirectory = join(evidenceRoot, safeName(target.layerId));
    mkdirSync(targetDirectory, { recursive: true });
    const maskPropsPath = join(targetDirectory, 'mask-props.json');
    writeFileSync(
      maskPropsPath,
      `${JSON.stringify({ scene: originalProps.scene, layerId: target.layerId }, null, 2)}\n`,
      'utf8',
    );

    console.log('');
    console.log(`Target ${target.layerId} · ${layer.anchor}`);
    const comparisons = [];
    for (const comparison of target.comparisons ?? []) {
      const frame = Number(comparison.frame);
      if (!Number.isInteger(frame) || frame < 0) {
        throw new Error(`Invalid material QA frame for ${target.layerId}.`);
      }
      if (!comparison.differencePath || !existsSync(comparison.differencePath)) {
        throw new Error(
          `Material-local difference evidence is missing for ${target.layerId} frame ${frame}.`,
        );
      }

      const label = `${String(frame).padStart(4, '0')}-${safeName(comparison.id ?? `frame-${frame}`)}`;
      const maskPath = join(targetDirectory, `${label}-allowed-mask.png`);
      renderMaskStill({
        propsPath: maskPropsPath,
        publicDirectory,
        frame,
        outputPath: maskPath,
      });

      const differencePixels = readGrayPixels(comparison.differencePath, width, height);
      const maskPixels = readGrayPixels(maskPath, width, height);
      const evaluation = evaluateContainmentComparison({
        differencePixels,
        maskPixels,
        width,
        height,
        pixelChangeThreshold: options.pixelChangeThreshold,
        maskThreshold: options.maskThreshold,
        dilationRadius: options.dilationRadius,
        maxSpillRatioOfChanged: options.maxSpillRatioOfChanged,
      });
      comparisons.push({
        id: comparison.id ?? null,
        frame,
        progress: comparison.progress ?? null,
        differencePath: comparison.differencePath,
        maskPath,
        ...evaluation,
      });
      console.log(
        `  [${evaluation.pass ? 'ok' : 'fail'}] ${comparison.id ?? frame}: spill ${evaluation.spillPixels}/${evaluation.changedPixels} changed pixels (${(evaluation.spillRatioOfChanged * 100).toFixed(4)}%)`,
      );
    }

    const pass = comparisons.length > 0 && comparisons.every((comparison) => comparison.pass);
    targetReports.push({
      layerId: target.layerId,
      material: target.material,
      role: target.role,
      anchor: layer.anchor,
      pass,
      comparisons,
      evidenceDirectory: targetDirectory,
    });
  }

  const pass = targetReports.every((target) => target.pass);
  const report = {
    schemaVersion: 1,
    verificationType: 'camera-matched-contained-material-boundary',
    generatedAt: new Date().toISOString(),
    sourceShotNumber: options.shotNumber,
    previewDirectory,
    applicable: true,
    pass,
    thresholds: {
      pixelChangeThreshold: options.pixelChangeThreshold,
      maskThreshold: options.maskThreshold,
      dilationRadius: options.dilationRadius,
      maxSpillRatioOfChanged: options.maxSpillRatioOfChanged,
    },
    targets: targetReports,
    interpretation:
      'The normal-vs-frozen material differential is compared to a same-frame alpha mask rendered through the exact Scene V2 camera transform. A small dilation tolerates raster antialiasing; materially changed pixels beyond that tolerance are treated as containment spill.',
  };
  const reportPath = join(previewDirectory, 'contained-material-boundary-qa.json');
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log('');
  console.log(`Contained-material boundary QA: ${pass ? 'PASS' : 'FAIL'}`);
  console.log(`Report: ${reportPath}`);
  if (!pass) process.exitCode = 2;
}

function findLayer(scene, layerId) {
  for (const shot of scene?.shots ?? []) {
    const layer = (shot.layers ?? []).find((candidate) => candidate.id === layerId);
    if (layer) return layer;
  }
  return undefined;
}

function renderMaskStill({ propsPath, publicDirectory, frame, outputPath }) {
  const result = spawnSync(
    'pnpm',
    [
      'exec',
      'remotion',
      'still',
      resolve('tools/animation/src/index.tsx'),
      'SceneV2ContainedMaterialMask',
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
    throw new Error(`Contained-material mask render failed with exit code ${result.status ?? 1}.`);
  }
}

function readGrayPixels(path, width, height) {
  const ffmpeg = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
  const result = spawnSync(
    ffmpeg,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      path,
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
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg grayscale read failed for ${path}: ${String(result.stderr ?? '').trim()}`);
  }
  if (!Buffer.isBuffer(result.stdout) || result.stdout.length !== width * height) {
    throw new Error(
      `Unexpected grayscale pixel count for ${path}: ${result.stdout?.length ?? 0}; expected ${width * height}.`,
    );
  }
  return result.stdout;
}

function dilateBinaryMask(mask, width, height, radius) {
  if (radius <= 0) return mask;
  const output = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!mask[index]) continue;
      const minY = Math.max(0, y - radius);
      const maxY = Math.min(height - 1, y + radius);
      const minX = Math.max(0, x - radius);
      const maxX = Math.min(width - 1, x + radius);
      for (let yy = minY; yy <= maxY; yy += 1) {
        const row = yy * width;
        for (let xx = minX; xx <= maxX; xx += 1) {
          output[row + xx] = 1;
        }
      }
    }
  }
  return output;
}

function parseOptions(args) {
  const result = {
    shotNumber: 0,
    previewDir: undefined,
    pixelChangeThreshold: DEFAULT_PIXEL_CHANGE_THRESHOLD,
    maskThreshold: DEFAULT_MASK_THRESHOLD,
    dilationRadius: DEFAULT_DILATION_RADIUS,
    maxSpillRatioOfChanged: DEFAULT_MAX_SPILL_RATIO_OF_CHANGED,
  };
  for (const arg of args) {
    if (arg.startsWith('--shot=')) {
      const value = Number(arg.slice('--shot='.length));
      if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid ${arg}`);
      result.shotNumber = value;
    } else if (arg.startsWith('--preview-dir=')) {
      result.previewDir = arg.slice('--preview-dir='.length);
    } else if (arg.startsWith('--pixel-change-threshold=')) {
      result.pixelChangeThreshold = numberOption(arg, '--pixel-change-threshold=');
    } else if (arg.startsWith('--mask-threshold=')) {
      result.maskThreshold = numberOption(arg, '--mask-threshold=');
    } else if (arg.startsWith('--dilation-radius=')) {
      result.dilationRadius = numberOption(arg, '--dilation-radius=');
    } else if (arg.startsWith('--max-spill-ratio=')) {
      result.maxSpillRatioOfChanged = numberOption(arg, '--max-spill-ratio=');
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

function safeName(value) {
  return String(value).replace(/[^a-z0-9_-]/gi, '-');
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : '';
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
