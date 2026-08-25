import assert from 'node:assert/strict';
import test from 'node:test';

import {
  analyzeEyeSeedComponents,
  analyzeGrayMask,
  constrainSamEyeMask,
  deriveEnkiUpperFaceRoi,
  dilateEyeMaskWithinConstraints,
  eyeBandFillRatio,
} from '../animation/src/level2-character-state-localization.mjs';

function rgba(width, height, alpha = 0) {
  const value = new Uint8Array(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    value[pixel * 4 + 3] = alpha;
  }
  return value;
}

function fillAlpha(buffer, width, bounds, alpha = 255) {
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      buffer[(y * width + x) * 4 + 3] = alpha;
    }
  }
}

test('upper-face ROI is derived from approved character alpha instead of the whole canvas', () => {
  const dimensions = { width: 200, height: 300 };
  const body = rgba(dimensions.width, dimensions.height);
  fillAlpha(body, dimensions.width, { minX: 70, minY: 40, maxX: 130, maxY: 250 });

  const roi = deriveEnkiUpperFaceRoi({ bodyRgba: body, dimensions });

  assert.ok(roi.crop.height < 120, `face crop unexpectedly tall: ${roi.crop.height}`);
  assert.ok(roi.crop.width < 120, `face crop unexpectedly wide: ${roi.crop.width}`);
  assert.ok(roi.eyeBand.minY >= roi.headBounds.minY);
  assert.ok(roi.eyeBand.maxY <= roi.headBounds.maxY);
});

test('SAM eye mask is clipped to approved Enki alpha and deterministic eye band', () => {
  const dimensions = { width: 200, height: 300 };
  const body = rgba(dimensions.width, dimensions.height);
  fillAlpha(body, dimensions.width, { minX: 70, minY: 40, maxX: 130, maxY: 250 });
  const roi = deriveEnkiUpperFaceRoi({ bodyRgba: body, dimensions });
  const samDimensions = { width: roi.crop.width, height: roi.crop.height };
  const sam = rgba(samDimensions.width, samDimensions.height, 255);

  const constrained = constrainSamEyeMask({
    samRgba: sam,
    samDimensions,
    crop: roi.crop,
    bodyRgba: body,
    dimensions,
    eyeBand: roi.eyeBand,
  });
  const expanded = dilateEyeMaskWithinConstraints({
    mask: constrained.mask,
    bodyRgba: body,
    dimensions,
    eyeBand: roi.eyeBand,
    radius: 1,
  });
  const analysis = analyzeGrayMask(expanded, dimensions);

  assert.ok(analysis.selected > 0);
  assert.ok(analysis.bounds.minX >= roi.eyeBand.minX);
  assert.ok(analysis.bounds.maxX <= roi.eyeBand.maxX);
  assert.ok(analysis.bounds.minY >= roi.eyeBand.minY);
  assert.ok(analysis.bounds.maxY <= roi.eyeBand.maxY);
  assert.ok(constrained.outsideBandRejected > 0);
});

test('sparse valid SAM seed grows to a minimal eyelid patch without escaping eye constraints', () => {
  const dimensions = { width: 200, height: 300 };
  const body = rgba(dimensions.width, dimensions.height);
  fillAlpha(body, dimensions.width, { minX: 70, minY: 40, maxX: 130, maxY: 250 });
  const roi = deriveEnkiUpperFaceRoi({ bodyRgba: body, dimensions });
  const seed = new Uint8Array(dimensions.width * dimensions.height);
  const seedX = Math.round((roi.eyeBand.minX + roi.eyeBand.maxX) / 2);
  const seedY = Math.round((roi.eyeBand.minY + roi.eyeBand.maxY) / 2);
  seed[seedY * dimensions.width + seedX] = 255;

  const expanded = dilateEyeMaskWithinConstraints({
    mask: seed,
    bodyRgba: body,
    dimensions,
    eyeBand: roi.eyeBand,
    radius: 1,
  });
  const analysis = analyzeGrayMask(expanded, dimensions);
  const fill = eyeBandFillRatio(expanded, dimensions, roi.eyeBand);

  assert.ok(fill >= 0.01, `adaptive eyelid patch remained too sparse: ${fill}`);
  assert.ok(fill < 0.1, `adaptive eyelid patch became too broad: ${fill}`);
  assert.ok(analysis.bounds.minX >= roi.eyeBand.minX);
  assert.ok(analysis.bounds.maxX <= roi.eyeBand.maxX);
  assert.ok(analysis.bounds.minY >= roi.eyeBand.minY);
  assert.ok(analysis.bounds.maxY <= roi.eyeBand.maxY);
});

test('large painted-face eye band scales sparse semantic seeds into compact horizontal eyelid patches', () => {
  const dimensions = { width: 941, height: 1672 };
  const body = rgba(dimensions.width, dimensions.height);
  fillAlpha(body, dimensions.width, {
    minX: 310,
    minY: 220,
    maxX: 650,
    maxY: 1320,
  });
  const roi = deriveEnkiUpperFaceRoi({ bodyRgba: body, dimensions });
  const seed = new Uint8Array(dimensions.width * dimensions.height);
  const bandWidth = roi.eyeBand.maxX - roi.eyeBand.minX + 1;
  const bandHeight = roi.eyeBand.maxY - roi.eyeBand.minY + 1;
  const y = Math.round((roi.eyeBand.minY + roi.eyeBand.maxY) / 2);
  const leftX = Math.round(roi.eyeBand.minX + bandWidth * 0.38);
  const rightX = Math.round(roi.eyeBand.minX + bandWidth * 0.62);
  seed[y * dimensions.width + leftX] = 255;
  seed[y * dimensions.width + rightX] = 255;

  const components = analyzeEyeSeedComponents(
    seed,
    dimensions,
    roi.eyeBand,
  );
  assert.equal(components.length, 2);

  const expanded = dilateEyeMaskWithinConstraints({
    mask: seed,
    bodyRgba: body,
    dimensions,
    eyeBand: roi.eyeBand,
    radius: 1,
  });
  const fill = eyeBandFillRatio(expanded, dimensions, roi.eyeBand);
  const analysis = analyzeGrayMask(expanded, dimensions);

  assert.ok(fill >= 0.01, `large-scale eyelid patch remained too sparse: ${fill}`);
  assert.ok(fill < 0.08, `large-scale eyelid patch became too broad: ${fill}`);
  assert.ok(
    analysis.bounds.maxY - analysis.bounds.minY + 1 < bandHeight * 0.5,
    'eyelid patch became vertically face-like instead of compact',
  );
  assert.ok(analysis.bounds.minX >= roi.eyeBand.minX);
  assert.ok(analysis.bounds.maxX <= roi.eyeBand.maxX);
});
