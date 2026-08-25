import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_EYE_STATE_THRESHOLDS,
  evaluateEyeStateMetrics,
} from '../animation/src/level2-eye-state-proof.mjs';

function metrics(overrides = {}) {
  return {
    selectedAlphaPixels: 900,
    inEyeBandAlphaRatio: 0.995,
    eyeBandFillRatio: 0.025,
    opaqueEyeBandFillRatio: 0.012,
    compositeChangedEyeBandRatio: 0.018,
    strongChangedEyeBandRatio: 0.009,
    meanDifferenceOnChangedPixels: 18,
    meaningfulComponentCount: 2,
    ...overrides,
  };
}

test('eye-state readability gate accepts a registered visibly different closed-eye state', () => {
  const result = evaluateEyeStateMetrics(metrics());
  assert.equal(result.pass, true, result.failures.join('\n'));
});

test('eye-state readability gate rejects the known false-pass signature', () => {
  const result = evaluateEyeStateMetrics(
    metrics({
      selectedAlphaPixels: 420,
      eyeBandFillRatio: 0.016,
      opaqueEyeBandFillRatio: 0.0021,
      compositeChangedEyeBandRatio: 0.00205,
      strongChangedEyeBandRatio: 0.0011,
      meanDifferenceOnChangedPixels: 11,
    }),
  );

  assert.equal(result.pass, false);
  assert.match(result.failures.join('\n'), /meaningful opaque eyelid area/);
  assert.match(result.failures.join('\n'), /changes too little of the eye band/);
  assert.match(result.failures.join('\n'), /strong eye-region change/);
});

test('eye-state readability gate rejects alpha outside the derived eye band', () => {
  const result = evaluateEyeStateMetrics(
    metrics({ inEyeBandAlphaRatio: 0.72 }),
  );
  assert.equal(result.pass, false);
  assert.match(result.failures.join('\n'), /must remain inside Enki eye band/);
});

test('final closed-eye state requires stronger coverage than sparse localization seeds', () => {
  assert.ok(DEFAULT_EYE_STATE_THRESHOLDS.minEyeBandFillRatio >= 0.01);
  assert.ok(DEFAULT_EYE_STATE_THRESHOLDS.minOpaqueEyeBandFillRatio > 0);
  assert.ok(DEFAULT_EYE_STATE_THRESHOLDS.minCompositeChangedEyeBandRatio > 0);
});
