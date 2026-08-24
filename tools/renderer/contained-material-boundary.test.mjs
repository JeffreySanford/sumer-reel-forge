import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateContainmentComparison } from '../scripts/verify-contained-material-boundary.mjs';

function pixels(values) {
  return Buffer.from(values);
}

test('contained-material boundary accepts motion inside the allowed mask', () => {
  const width = 5;
  const height = 5;
  const difference = new Array(width * height).fill(0);
  const mask = new Array(width * height).fill(0);
  difference[12] = 20;
  mask[12] = 255;

  const result = evaluateContainmentComparison({
    differencePixels: pixels(difference),
    maskPixels: pixels(mask),
    width,
    height,
    dilationRadius: 0,
  });

  assert.equal(result.pass, true);
  assert.equal(result.spillPixels, 0);
  assert.equal(result.changedPixels, 1);
});

test('contained-material boundary tolerates antialias spill inside dilation radius', () => {
  const width = 5;
  const height = 5;
  const difference = new Array(width * height).fill(0);
  const mask = new Array(width * height).fill(0);
  mask[12] = 255;
  difference[13] = 20;

  const result = evaluateContainmentComparison({
    differencePixels: pixels(difference),
    maskPixels: pixels(mask),
    width,
    height,
    dilationRadius: 1,
  });

  assert.equal(result.pass, true);
  assert.equal(result.spillPixels, 0);
  assert.equal(result.toleranceRingChangedPixels, 1);
});

test('contained-material boundary rejects material motion outside tolerance', () => {
  const width = 7;
  const height = 7;
  const difference = new Array(width * height).fill(0);
  const mask = new Array(width * height).fill(0);
  mask[24] = 255;
  difference[0] = 30;
  difference[24] = 30;

  const result = evaluateContainmentComparison({
    differencePixels: pixels(difference),
    maskPixels: pixels(mask),
    width,
    height,
    dilationRadius: 1,
    maxSpillRatioOfChanged: 0.001,
  });

  assert.equal(result.pass, false);
  assert.equal(result.spillPixels, 1);
  assert.equal(result.changedPixels, 2);
});
