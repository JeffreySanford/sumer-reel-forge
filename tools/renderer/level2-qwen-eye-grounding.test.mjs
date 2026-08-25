import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mapCropBoxToFrame,
  normalizedBoxToPixels,
  paddedPixelCrop,
  validateEyeGrounding,
} from '../animation/src/level2-qwen-eye-grounding.mjs';

test('normalized grounding boxes map through a padded face crop into frame coordinates', () => {
  const dimensions = { width: 941, height: 1672 };
  const faceBox = { x1: 280, y1: 90, x2: 650, y2: 430 };
  const facePixels = normalizedBoxToPixels(faceBox, dimensions);
  const crop = paddedPixelCrop(facePixels, dimensions);
  const left = mapCropBoxToFrame({ x1: 180, y1: 360, x2: 350, y2: 500 }, crop);
  const right = mapCropBoxToFrame({ x1: 590, y1: 350, x2: 760, y2: 490 }, crop);
  assert.ok(left.x < right.x);
  assert.ok(left.y >= crop.y && right.y >= crop.y);
});

test('eye grounding accepts two compact horizontally separated boxes inside one face crop', () => {
  const frameDimensions = { width: 941, height: 1672 };
  const faceBox = { x1: 250, y1: 80, x2: 680, y2: 470 };
  const facePixels = normalizedBoxToPixels(faceBox, frameDimensions);
  const faceCrop = paddedPixelCrop(facePixels, frameDimensions);
  const result = validateEyeGrounding({
    faceBox,
    eyeBoxes: [
      { x1: 210, y1: 360, x2: 350, y2: 470 },
      { x1: 600, y1: 350, x2: 740, y2: 465 },
    ],
    frameDimensions,
    faceCrop,
  });
  assert.equal(result.pass, true, result.failures.join('; '));
  assert.equal(result.mappedEyes.length, 2);
});

test('eye grounding rejects crown-like vertically separated or oversized boxes', () => {
  const frameDimensions = { width: 941, height: 1672 };
  const faceBox = { x1: 250, y1: 80, x2: 680, y2: 470 };
  const facePixels = normalizedBoxToPixels(faceBox, frameDimensions);
  const faceCrop = paddedPixelCrop(facePixels, frameDimensions);
  const result = validateEyeGrounding({
    faceBox,
    eyeBoxes: [
      { x1: 40, y1: 20, x2: 500, y2: 420 },
      { x1: 550, y1: 650, x2: 980, y2: 980 },
    ],
    frameDimensions,
    faceCrop,
  });
  assert.equal(result.pass, false);
  assert.ok(result.failures.length > 0);
});
