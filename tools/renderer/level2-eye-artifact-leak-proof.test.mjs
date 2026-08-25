import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzeRenderedEyeBoxes,
  analyzeTransparentEyeLayerAppearance,
  mapSourceEyeBoxesToRender,
} from '../animation/src/level2-eye-artifact-leak-proof.mjs';

function rgbaFixture(width, height, painter) {
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      const offset = pixel * 4;
      const [r, g, b, a = 255] = painter(x, y);
      rgba[offset] = r;
      rgba[offset + 1] = g;
      rgba[offset + 2] = b;
      rgba[offset + 3] = a;
    }
  }
  return rgba;
}

test('transparent eye artifact proof rejects a flat cyan debug patch', () => {
  const dimensions = { width: 64, height: 32 };
  const stateRgba = rgbaFixture(dimensions.width, dimensions.height, (x, y) => {
    const inPatch = x >= 8 && x < 56 && y >= 8 && y < 24;
    return inPatch ? [142, 198, 211, 255] : [0, 0, 0, 0];
  });
  const result = analyzeTransparentEyeLayerAppearance({ stateRgba, dimensions });
  assert.equal(result.pass, false);
  assert.equal(result.metrics.cyanLeak, true);
  assert.ok(result.failures.some((failure) => /cyan\/debug-like/i.test(failure)));
});

test('transparent eye artifact proof accepts textured warm eyelid pixels', () => {
  const dimensions = { width: 64, height: 32 };
  const stateRgba = rgbaFixture(dimensions.width, dimensions.height, (x, y) => {
    const inPatch = x >= 8 && x < 56 && y >= 8 && y < 24;
    if (!inPatch) return [0, 0, 0, 0];
    return [156 + ((x * 7 + y * 3) % 34), 103 + ((x * 5 + y * 2) % 28), 70 + ((x * 3 + y * 7) % 22), 255];
  });
  const result = analyzeTransparentEyeLayerAppearance({ stateRgba, dimensions });
  assert.equal(result.pass, true, result.failures.join('; '));
  assert.equal(result.metrics.cyanLeak, false);
  assert.equal(result.metrics.flatLeak, false);
});

test('rendered eye proof rejects near-uniform mask-colored boxes', () => {
  const dimensions = { width: 160, height: 90 };
  const eyeBoxes = [
    { x: 45, y: 30, width: 22, height: 12 },
    { x: 92, y: 30, width: 22, height: 12 },
  ];
  const rgba = rgbaFixture(dimensions.width, dimensions.height, (x, y) => {
    const inEye = eyeBoxes.some((box) => x >= box.x && x < box.x + box.width && y >= box.y && y < box.y + box.height);
    return inEye ? [150, 201, 213, 255] : [159, 106, 73, 255];
  });
  const result = analyzeRenderedEyeBoxes({ rgba, dimensions, eyeBoxes });
  assert.equal(result.pass, false);
  assert.equal(result.metrics.cyanLeak, true);
});

test('source eye boxes map into the expected Shot 3 render neighborhood', () => {
  const mapped = mapSourceEyeBoxesToRender({
    eyeBoxes: [
      { x: 422, y: 337, width: 57, height: 30 },
      { x: 507, y: 337, width: 57, height: 30 },
    ],
    sourceDimensions: { width: 941, height: 1672 },
    renderDimensions: { width: 1080, height: 1920 },
  });
  assert.equal(mapped.length, 2);
  assert.ok(mapped[0].x > 430 && mapped[0].x < 540);
  assert.ok(mapped[0].y > 300 && mapped[0].y < 420);
  assert.ok(mapped[1].x > mapped[0].x + 60);
});
