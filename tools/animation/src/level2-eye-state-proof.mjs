import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  analyzeEyeSeedComponents,
  deriveEnkiUpperFaceRoi,
} from './level2-character-state-localization.mjs';

export const DEFAULT_EYE_STATE_THRESHOLDS = Object.freeze({
  alphaThreshold: 16,
  opaqueThreshold: 224,
  minInEyeBandAlphaRatio: 0.98,
  minEyeBandFillRatio: 0.01,
  minOpaqueEyeBandFillRatio: 0.004,
  minCompositeChangedEyeBandRatio: 0.006,
  minStrongChangedEyeBandRatio: 0.002,
  minMeanDifferenceOnChangedPixels: 6,
  minMeaningfulComponents: 1,
  maxMeaningfulComponents: 2,
});

export function analyzeEyeStateAsset({
  bodyPath,
  statePath,
  referencePath,
  ffmpeg = process.env.FFMPEG_COMMAND ?? 'ffmpeg',
  thresholds = DEFAULT_EYE_STATE_THRESHOLDS,
}) {
  const bodyBytes = readFileSync(bodyPath);
  const stateBytes = readFileSync(statePath);
  const referenceBytes = readFileSync(referencePath);
  const dimensions = readPngDimensions(bodyBytes, 'Enki body');
  assertSameDimensions(
    dimensions,
    readPngDimensions(stateBytes, 'closed-eye state'),
    'closed-eye state',
  );
  assertSameDimensions(
    dimensions,
    readPngDimensions(referenceBytes, 'editorial reference'),
    'editorial reference',
  );

  const bodyRgba = extractRgba(bodyPath, dimensions, ffmpeg);
  const stateRgba = extractRgba(statePath, dimensions, ffmpeg);
  const referenceRgba = extractRgba(referencePath, dimensions, ffmpeg);
  const roi = deriveEnkiUpperFaceRoi({ bodyRgba, dimensions });
  const alphaMask = new Uint8Array(dimensions.width * dimensions.height);

  let selectedAlphaPixels = 0;
  let inEyeBandSelectedPixels = 0;
  let opaqueInEyeBandPixels = 0;
  let outsideEyeBandSelectedPixels = 0;
  let minX = dimensions.width;
  let minY = dimensions.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < dimensions.height; y += 1) {
    for (let x = 0; x < dimensions.width; x += 1) {
      const pixel = y * dimensions.width + x;
      const alpha = stateRgba[pixel * 4 + 3];
      alphaMask[pixel] = alpha;
      if (alpha <= thresholds.alphaThreshold) continue;
      selectedAlphaPixels += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      if (insideBounds(x, y, roi.eyeBand)) {
        inEyeBandSelectedPixels += 1;
        if (alpha >= thresholds.opaqueThreshold) opaqueInEyeBandPixels += 1;
      } else {
        outsideEyeBandSelectedPixels += 1;
      }
    }
  }

  const eyeBandArea = boundsArea(roi.eyeBand);
  let compositeChangedInEyeBandPixels = 0;
  let strongChangedInEyeBandPixels = 0;
  let changedDifferenceSum = 0;

  for (let y = roi.eyeBand.minY; y <= roi.eyeBand.maxY; y += 1) {
    for (let x = roi.eyeBand.minX; x <= roi.eyeBand.maxX; x += 1) {
      const pixel = y * dimensions.width + x;
      const offset = pixel * 4;
      const alpha = stateRgba[offset + 3] / 255;
      let channelDifference = 0;
      for (let channel = 0; channel < 3; channel += 1) {
        const source = referenceRgba[offset + channel];
        const state = stateRgba[offset + channel];
        const composite = state * alpha + source * (1 - alpha);
        channelDifference += Math.abs(composite - source);
      }
      const meanDifference = channelDifference / 3;
      if (meanDifference > 2) {
        compositeChangedInEyeBandPixels += 1;
        changedDifferenceSum += meanDifference;
      }
      if (meanDifference >= 8) strongChangedInEyeBandPixels += 1;
    }
  }

  const meaningfulFloor = Math.max(
    2,
    Math.floor(inEyeBandSelectedPixels * 0.05),
  );
  const meaningfulComponents = analyzeEyeSeedComponents(
    alphaMask,
    dimensions,
    roi.eyeBand,
    thresholds.alphaThreshold,
  ).filter((component) => component.selected >= meaningfulFloor);

  const metrics = {
    dimensions,
    bodyBounds: roi.bodyBounds,
    headBounds: roi.headBounds,
    eyeBand: roi.eyeBand,
    eyeBandArea,
    alphaBounds:
      selectedAlphaPixels > 0 ? { minX, minY, maxX, maxY } : null,
    selectedAlphaPixels,
    inEyeBandSelectedPixels,
    opaqueInEyeBandPixels,
    outsideEyeBandSelectedPixels,
    inEyeBandAlphaRatio: selectedAlphaPixels
      ? inEyeBandSelectedPixels / selectedAlphaPixels
      : 0,
    eyeBandFillRatio: eyeBandArea
      ? inEyeBandSelectedPixels / eyeBandArea
      : 0,
    opaqueEyeBandFillRatio: eyeBandArea
      ? opaqueInEyeBandPixels / eyeBandArea
      : 0,
    compositeChangedInEyeBandPixels,
    compositeChangedEyeBandRatio: eyeBandArea
      ? compositeChangedInEyeBandPixels / eyeBandArea
      : 0,
    strongChangedInEyeBandPixels,
    strongChangedEyeBandRatio: eyeBandArea
      ? strongChangedInEyeBandPixels / eyeBandArea
      : 0,
    meanDifferenceOnChangedPixels: compositeChangedInEyeBandPixels
      ? changedDifferenceSum / compositeChangedInEyeBandPixels
      : 0,
    meaningfulComponentCount: meaningfulComponents.length,
    meaningfulComponents,
  };

  return {
    ...evaluateEyeStateMetrics(metrics, thresholds),
    metrics,
    thresholds,
  };
}

export function evaluateEyeStateMetrics(
  metrics,
  thresholds = DEFAULT_EYE_STATE_THRESHOLDS,
) {
  const failures = [];
  if (!metrics.selectedAlphaPixels) {
    failures.push('closed-eye state alpha is empty');
  }
  if (metrics.inEyeBandAlphaRatio < thresholds.minInEyeBandAlphaRatio) {
    failures.push(
      `closed-eye alpha must remain inside Enki eye band; ${(metrics.inEyeBandAlphaRatio * 100).toFixed(2)}% is in-band`,
    );
  }
  if (metrics.eyeBandFillRatio < thresholds.minEyeBandFillRatio) {
    failures.push(
      `closed-eye alpha coverage is too sparse; ${(metrics.eyeBandFillRatio * 100).toFixed(3)}% of eye band`,
    );
  }
  if (metrics.opaqueEyeBandFillRatio < thresholds.minOpaqueEyeBandFillRatio) {
    failures.push(
      `closed-eye state lacks a meaningful opaque eyelid area; ${(metrics.opaqueEyeBandFillRatio * 100).toFixed(3)}% of eye band`,
    );
  }
  if (
    metrics.compositeChangedEyeBandRatio <
    thresholds.minCompositeChangedEyeBandRatio
  ) {
    failures.push(
      `closed-eye composite changes too little of the eye band; ${(metrics.compositeChangedEyeBandRatio * 100).toFixed(3)}%`,
    );
  }
  if (
    metrics.strongChangedEyeBandRatio < thresholds.minStrongChangedEyeBandRatio
  ) {
    failures.push(
      `closed-eye composite lacks enough strong eye-region change; ${(metrics.strongChangedEyeBandRatio * 100).toFixed(3)}%`,
    );
  }
  if (
    metrics.meanDifferenceOnChangedPixels <
    thresholds.minMeanDifferenceOnChangedPixels
  ) {
    failures.push(
      `closed-eye changed pixels are too weak; mean difference ${metrics.meanDifferenceOnChangedPixels.toFixed(2)}`,
    );
  }
  if (
    metrics.meaningfulComponentCount < thresholds.minMeaningfulComponents ||
    metrics.meaningfulComponentCount > thresholds.maxMeaningfulComponents
  ) {
    failures.push(
      `closed-eye alpha must resolve to ${thresholds.minMeaningfulComponents}-${thresholds.maxMeaningfulComponents} meaningful eye components; found ${metrics.meaningfulComponentCount}`,
    );
  }
  return { pass: failures.length === 0, failures };
}

function extractRgba(path, dimensions, ffmpeg) {
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
      'rgba',
      'pipe:1',
    ],
    { encoding: null, maxBuffer: 32 * 1024 * 1024 },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `Could not decode ${path}: ${String(result.stderr ?? '').trim()}`,
    );
  }
  const expected = dimensions.width * dimensions.height * 4;
  if (result.stdout.length !== expected) {
    throw new Error(
      `Decoded ${path} to ${result.stdout.length} RGBA bytes; expected ${expected}.`,
    );
  }
  return new Uint8Array(result.stdout);
}

function readPngDimensions(bytes, label) {
  if (
    bytes.length < 24 ||
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47
  ) {
    throw new Error(`${label} is not a PNG.`);
  }
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

function assertSameDimensions(expected, actual, label) {
  if (expected.width !== actual.width || expected.height !== actual.height) {
    throw new Error(
      `${label} is ${actual.width}x${actual.height}; expected ${expected.width}x${expected.height}.`,
    );
  }
}

function insideBounds(x, y, bounds) {
  return (
    x >= bounds.minX &&
    x <= bounds.maxX &&
    y >= bounds.minY &&
    y <= bounds.maxY
  );
}

function boundsArea(bounds) {
  return (bounds.maxX - bounds.minX + 1) * (bounds.maxY - bounds.minY + 1);
}
