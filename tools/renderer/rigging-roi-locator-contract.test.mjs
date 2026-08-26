import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateNormalizedRiggingBox,
  isRiggingLocatorRequest,
} from '../animation/src/rigging-roi-locator-contract.mjs';

test('accepts a bounded normalized rigging ROI', () => {
  const result = evaluateNormalizedRiggingBox({
    xMin: 0.12,
    yMin: 0.08,
    xMax: 0.31,
    yMax: 0.63,
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.box, {
    xMin: 0.12,
    yMin: 0.08,
    xMax: 0.31,
    yMax: 0.63,
  });
});

test('rejects 0..1000 or pixel-like coordinates instead of silently rescaling them', () => {
  const result = evaluateNormalizedRiggingBox({
    xMin: 120,
    yMin: 80,
    xMax: 310,
    yMax: 630,
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /normalized decimals between 0 and 1/i);
});

test('rejects reversed or degenerate normalized bounds', () => {
  const result = evaluateNormalizedRiggingBox({
    xMin: 0.4,
    yMin: 0.2,
    xMax: 0.3,
    yMax: 0.5,
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /positive width and height/i);
});

test('identifies only the structured rigging locator request', () => {
  assert.equal(
    isRiggingLocatorRequest({
      format: {
        properties: {
          target: { properties: { bboxNormalized: { type: 'object' } } },
        },
      },
      messages: [{ role: 'user', content: 'target: rigging-cluster' }],
    }),
    true,
  );
  assert.equal(
    isRiggingLocatorRequest({
      format: { properties: { verdict: { type: 'string' } } },
      messages: [{ role: 'user', content: 'review rigging-cluster media' }],
    }),
    false,
  );
});
