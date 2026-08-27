import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateRiggingRoiCandidate,
  RIGGING_ROI_THRESHOLDS,
} from '../animation/src/rigging-roi-structure.mjs';

function crop(overrides = {}) {
  return {
    strongAlphaPixels: 1600,
    strongCoverage: 0.08,
    strongBboxFill: 0.12,
    significantComponentCount: 4,
    topEightComponentShare: 0.97,
    anyStrongTouchesEdge: false,
    ...overrides,
  };
}

function fidelity(overrides = {}) {
  return {
    strongMismatchRatio: 0,
    ...overrides,
  };
}

test('accepts a source-faithful thin rigging cluster', () => {
  const result = evaluateRiggingRoiCandidate({
    cropAnalysis: crop(),
    sourceFidelity: fidelity(),
  });
  assert.equal(result.pass, true, result.failures.join('\n'));
  assert.equal(result.risk, 'LOW');
});

test('rejects the known sparse-fragment failure family', () => {
  const result = evaluateRiggingRoiCandidate({
    cropAnalysis: crop({
      strongAlphaPixels: 90,
      strongCoverage: 0.001,
      significantComponentCount: 22,
      topEightComponentShare: 0.52,
    }),
    sourceFidelity: fidelity(),
  });
  assert.equal(result.pass, false);
  assert.equal(result.risk, 'HIGH');
  assert.match(result.failures.join('\n'), /too sparse/i);
  assert.match(result.failures.join('\n'), /fragmented/i);
  assert.match(result.failures.join('\n'), /scattered alpha/i);
});

test('rejects crop clipping even when the alpha otherwise looks healthy', () => {
  const result = evaluateRiggingRoiCandidate({
    cropAnalysis: crop({ anyStrongTouchesEdge: true }),
    sourceFidelity: fidelity(),
  });
  assert.equal(result.pass, false);
  assert.match(result.failures.join('\n'), /ROI edge/i);
});

test('rejects a blob-like scene selection rather than calling it rigging', () => {
  const result = evaluateRiggingRoiCandidate({
    cropAnalysis: crop({
      strongCoverage: 0.5,
      strongBboxFill: 0.7,
    }),
    sourceFidelity: fidelity(),
  });
  assert.equal(result.pass, false);
  assert.match(result.failures.join('\n'), /too much of its ROI/i);
  assert.match(result.failures.join('\n'), /blob-like/i);
});

test('rejects generated pixels that no longer match the editorial source', () => {
  const result = evaluateRiggingRoiCandidate({
    cropAnalysis: crop(),
    sourceFidelity: fidelity({
      strongMismatchRatio: RIGGING_ROI_THRESHOLDS.maxSourceMismatchRatio + 0.001,
    }),
  });
  assert.equal(result.pass, false);
  assert.match(result.failures.join('\n'), /preserve source RGB/i);
});
