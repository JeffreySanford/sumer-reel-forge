import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzeGroundedEyeState,
  buildGroundedEyeEditMask,
} from '../animation/src/level2-grounded-eye-mask.mjs';

const dimensions = { width: 941, height: 1672 };
const verifiedBoxes = [
  { x: 422, y: 337, width: 57, height: 30 },
  { x: 507, y: 337, width: 57, height: 30 },
];

test('grounded eye mask builds two compact edit regions from verified editorial eye boxes', () => {
  const result = buildGroundedEyeEditMask({ eyeBoxes: verifiedBoxes, dimensions });
  assert.equal(result.metrics.eyeBoxes.length, 2);
  assert.equal(result.metrics.eyeBoxes[0].x, 422);
  assert.equal(result.metrics.eyeBoxes[1].x, 507);
  assert.ok(result.metrics.fillRatio > 0.6);
  assert.ok(result.metrics.fillRatio < 1);
  assert.ok(result.metrics.bounds.minY < 337);
  assert.ok(result.metrics.bounds.maxY > 366);
});

test('grounded eye mask never paints the old horn localization region', () => {
  const result = buildGroundedEyeEditMask({ eyeBoxes: verifiedBoxes, dimensions });
  let selectedAboveFaceEyes = 0;
  for (let y = 0; y < 200; y += 1) {
    for (let x = 0; x < dimensions.width; x += 1) {
      if (result.mask[y * dimensions.width + x] > 0) selectedAboveFaceEyes += 1;
    }
  }
  assert.equal(selectedAboveFaceEyes, 0);
});

test('grounded eye state proof requires opaque bounded and visibly changed eye pixels', () => {
  const maskResult = buildGroundedEyeEditMask({ eyeBoxes: verifiedBoxes, dimensions });
  const pixels = dimensions.width * dimensions.height;
  const reference = new Uint8Array(pixels * 4);
  const state = new Uint8Array(pixels * 4);
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const offset = pixel * 4;
    reference[offset] = 120;
    reference[offset + 1] = 90;
    reference[offset + 2] = 70;
    reference[offset + 3] = 255;
    if (maskResult.mask[pixel] > 0) {
      state[offset] = 70;
      state[offset + 1] = 50;
      state[offset + 2] = 40;
      state[offset + 3] = 255;
    }
  }
  const proof = analyzeGroundedEyeState({
    referenceRgba: reference,
    stateRgba: state,
    editMask: maskResult.mask,
    dimensions,
    boxArea: maskResult.metrics.boxArea,
  });
  assert.equal(proof.pass, true);
  assert.equal(proof.metrics.outsideMaskAlphaPixels, 0);
  assert.ok(proof.metrics.strongChangedEyeBandRatio > 0.4);
});

test('grounded eye state proof rejects alpha outside verified eye mask', () => {
  const maskResult = buildGroundedEyeEditMask({ eyeBoxes: verifiedBoxes, dimensions });
  const pixels = dimensions.width * dimensions.height;
  const reference = new Uint8Array(pixels * 4);
  const state = new Uint8Array(pixels * 4);
  const roguePixel = 100 * dimensions.width + 100;
  state[roguePixel * 4 + 3] = 255;
  const proof = analyzeGroundedEyeState({
    referenceRgba: reference,
    stateRgba: state,
    editMask: maskResult.mask,
    dimensions,
    boxArea: maskResult.metrics.boxArea,
  });
  assert.equal(proof.pass, false);
  assert.equal(proof.metrics.outsideMaskAlphaPixels, 1);
});
