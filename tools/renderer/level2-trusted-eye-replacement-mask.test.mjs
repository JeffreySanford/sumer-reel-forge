import assert from 'node:assert/strict';
import test from 'node:test';
import { expandTrustedEyeSeedMask } from '../animation/src/level2-trusted-eye-replacement-mask.mjs';

function makeMask(width, height, points) {
  const mask = new Uint8Array(width * height);
  for (const [x, y] of points) mask[y * width + x] = 255;
  return mask;
}

test('trusted eye replacement growth expands sparse in-band eyelid seeds to a bounded editing region', () => {
  const dimensions = { width: 240, height: 120 };
  const eyeBand = { minX: 20, minY: 30, maxX: 219, maxY: 89 };
  const points = [];
  for (let x = 82; x <= 92; x += 2) points.push([x, 58]);
  for (let x = 142; x <= 152; x += 2) points.push([x, 58]);
  const seedMask = makeMask(dimensions.width, dimensions.height, points);

  const result = expandTrustedEyeSeedMask({
    seedMask,
    dimensions,
    eyeBand,
    targetFillRatio: 0.015,
    maxFillRatio: 0.03,
  });

  assert.ok(result.metrics.fillRatio >= 0.015);
  assert.ok(result.metrics.fillRatio <= 0.03);
  assert.equal(result.metrics.seedInBandRatio, 1);
  assert.ok(result.metrics.selectedPixels > result.metrics.inBandSeedPixels);
  assert.ok(result.metrics.usedHorizontalRadius > 0);
  assert.ok(result.metrics.usedVerticalRadius > 0);
});

test('trusted eye replacement growth is not constrained by sparse character-body alpha', () => {
  const dimensions = { width: 200, height: 100 };
  const eyeBand = { minX: 10, minY: 20, maxX: 189, maxY: 79 };
  const seedMask = makeMask(dimensions.width, dimensions.height, [
    [70, 48],
    [72, 48],
    [128, 48],
    [130, 48],
  ]);

  const result = expandTrustedEyeSeedMask({
    seedMask,
    dimensions,
    eyeBand,
    targetFillRatio: 0.01,
    maxFillRatio: 0.03,
  });

  assert.ok(result.metrics.fillRatio >= 0.01);
});

test('trusted eye replacement growth rejects a seed that is not actually registered to the eye band', () => {
  const dimensions = { width: 100, height: 100 };
  const eyeBand = { minX: 20, minY: 20, maxX: 79, maxY: 59 };
  const seedMask = makeMask(dimensions.width, dimensions.height, [
    [40, 40],
    [42, 40],
    [5, 5],
  ]);

  assert.throws(
    () =>
      expandTrustedEyeSeedMask({
        seedMask,
        dimensions,
        eyeBand,
        targetFillRatio: 0.01,
        maxFillRatio: 0.03,
        minSeedInBandRatio: 0.98,
      }),
    /escaped the eye band/,
  );
});
