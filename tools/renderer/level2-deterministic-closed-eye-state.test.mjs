import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deriveCleanSamplingRows,
  deriveEyeGroups,
  synthesizeDeterministicClosedEyeState,
} from '../animation/src/level2-deterministic-closed-eye-state.mjs';

function fixture() {
  const dimensions = { width: 80, height: 40 };
  const pixels = dimensions.width * dimensions.height;
  const referenceRgba = new Uint8Array(pixels * 4);
  for (let y = 0; y < dimensions.height; y += 1) {
    for (let x = 0; x < dimensions.width; x += 1) {
      const pixel = y * dimensions.width + x;
      const offset = pixel * 4;
      referenceRgba[offset] = 165 + Math.min(40, Math.abs(20 - y));
      referenceRgba[offset + 1] = 125 + Math.min(35, Math.abs(20 - y));
      referenceRgba[offset + 2] = 95;
      referenceRgba[offset + 3] = 255;
    }
  }
  const seedMask = new Uint8Array(pixels);
  const editMask = new Uint8Array(pixels);
  for (const cx of [27, 53]) {
    for (let y = 18; y <= 21; y += 1) {
      for (let x = cx - 4; x <= cx + 4; x += 1) {
        const pixel = y * dimensions.width + x;
        seedMask[pixel] = 255;
        const offset = pixel * 4;
        referenceRgba[offset] = 35;
        referenceRgba[offset + 1] = 28;
        referenceRgba[offset + 2] = 22;
      }
    }
    for (let y = 14; y <= 25; y += 1) {
      for (let x = cx - 10; x <= cx + 10; x += 1) {
        const dx = (x - cx) / 10;
        const dy = (y - 20) / 6;
        if (dx * dx + dy * dy <= 1) editMask[y * dimensions.width + x] = 255;
      }
    }
  }
  return {
    dimensions,
    referenceRgba,
    seedMask,
    editMask,
    eyeBand: { minX: 10, minY: 10, maxX: 69, maxY: 30 },
  };
}

function tallApertureFixture() {
  const dimensions = { width: 96, height: 64 };
  const pixels = dimensions.width * dimensions.height;
  const referenceRgba = new Uint8Array(pixels * 4);
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    referenceRgba[pixel * 4] = 182;
    referenceRgba[pixel * 4 + 1] = 137;
    referenceRgba[pixel * 4 + 2] = 104;
    referenceRgba[pixel * 4 + 3] = 255;
  }
  const seedMask = new Uint8Array(pixels);
  const editMask = new Uint8Array(pixels);
  const eyeBand = { minX: 8, minY: 8, maxX: 87, maxY: 52 };
  for (const cx of [32, 64]) {
    for (let y = 14; y <= 44; y += 1) {
      for (let x = cx - 5; x <= cx + 5; x += 1) {
        const pixel = y * dimensions.width + x;
        seedMask[pixel] = 255;
        referenceRgba[pixel * 4] = 24;
        referenceRgba[pixel * 4 + 1] = 20;
        referenceRgba[pixel * 4 + 2] = 18;
      }
    }
    for (let y = 10; y <= 48; y += 1) {
      for (let x = cx - 12; x <= cx + 12; x += 1) {
        const dx = (x - cx) / 12;
        const dy = (y - 29) / 19;
        if (dx * dx + dy * dy <= 1) editMask[y * dimensions.width + x] = 255;
      }
    }
  }
  return { dimensions, referenceRgba, seedMask, editMask, eyeBand };
}

test('trusted seed resolves into two eye groups', () => {
  const f = fixture();
  const groups = deriveEyeGroups(f.seedMask, f.dimensions, f.eyeBand);
  assert.equal(groups.length, 2);
  assert.ok(groups[0].centerX < groups[1].centerX);
});

test('deterministic closed-eye synthesis fills the bounded eye edit mask and creates eyelid seams', () => {
  const f = fixture();
  const result = synthesizeDeterministicClosedEyeState({ ...f, style: 'balanced' });
  assert.equal(result.metrics.eyeGroupCount, 2);
  assert.ok(result.metrics.selectedPixels > 200);
  assert.ok(result.metrics.seamPixels > 10);

  let alphaOutsideMask = 0;
  let changedInsideMask = 0;
  for (let pixel = 0; pixel < f.editMask.length; pixel += 1) {
    const offset = pixel * 4;
    if (f.editMask[pixel] === 0 && result.rgba[offset + 3] !== 0) alphaOutsideMask += 1;
    if (
      f.editMask[pixel] > 0 &&
      result.rgba[offset + 3] > 0 &&
      (result.rgba[offset] !== f.referenceRgba[offset] ||
        result.rgba[offset + 1] !== f.referenceRgba[offset + 1] ||
        result.rgba[offset + 2] !== f.referenceRgba[offset + 2])
    ) {
      changedInsideMask += 1;
    }
  }
  assert.equal(alphaOutsideMask, 0);
  assert.ok(changedInsideMask > 150);
});

test('deterministic closed-eye synthesis removes the dark open-eye aperture from the central seed area', () => {
  const f = fixture();
  const result = synthesizeDeterministicClosedEyeState({ ...f, style: 'soft' });
  for (const cx of [27, 53]) {
    const centerPixel = 20 * f.dimensions.width + cx;
    const offset = centerPixel * 4;
    assert.ok(result.rgba[offset] > 60, `eye center ${cx} should be repainted from surrounding skin`);
    assert.equal(result.rgba[offset + 3], 255);
  }
});

test('defined style stays bounded to the supplied edit mask', () => {
  const f = fixture();
  const result = synthesizeDeterministicClosedEyeState({ ...f, style: 'defined' });
  for (let pixel = 0; pixel < f.editMask.length; pixel += 1) {
    if (f.editMask[pixel] === 0) assert.equal(result.rgba[pixel * 4 + 3], 0);
  }
});

test('sampling rows escape a tall trusted eye aperture instead of clamping back into it', () => {
  const f = tallApertureFixture();
  const groups = deriveEyeGroups(f.seedMask, f.dimensions, f.eyeBand);
  assert.equal(groups.length, 2);
  for (const group of groups) {
    const rows = deriveCleanSamplingRows(group, f.eyeBand);
    assert.ok(rows.aboveY < group.bounds.minY || rows.belowY > group.bounds.maxY);
    assert.ok(rows.aboveY < group.bounds.minY);
    assert.ok(rows.belowY > group.bounds.maxY);
  }
});

test('tall open-eye aperture cannot contaminate deterministic eyelid fill samples', () => {
  const f = tallApertureFixture();
  const result = synthesizeDeterministicClosedEyeState({ ...f, style: 'balanced' });
  for (const cx of [32, 64]) {
    const centerPixel = 29 * f.dimensions.width + cx;
    const offset = centerPixel * 4;
    assert.ok(
      result.rgba[offset] > 120,
      `eye center ${cx} should be rebuilt from clean skin outside the 31px open-eye aperture`,
    );
  }
  for (const rows of result.metrics.samplingRows) {
    const group = result.metrics.eyeGroups.find((item) => item.centerX === rows.centerX);
    assert.ok(rows.aboveY < group.bounds.minY);
    assert.ok(rows.belowY > group.bounds.maxY);
  }
});
