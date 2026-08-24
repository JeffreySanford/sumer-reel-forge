import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateMaterialCalibrations } from '../scripts/review-animation-shot.mjs';

const calibrationLibrary = {
  schemaVersion: 1,
  calibrations: [
    {
      id: 'contained-water-shot05-v1',
      motionPreset: 'waterPulse',
      material: 'water',
      appliesTo: {
        scope: 'benchmark-exact',
        sourceShotNumbers: [5],
        layerIds: ['shot05-welcome-water-v1'],
      },
      productionFloor: {
        minMeanDiff: 1.0,
        minChangedRatio: 0.05,
        minPassingRatio: 0.6,
        pixelChangeThreshold: 2,
      },
    },
  ],
};

function materialQa(comparisons, overrides = {}) {
  return {
    applicable: true,
    sourceShotNumber: 5,
    thresholds: { pixelChangeThreshold: 2 },
    targets: [
      {
        layerId: 'shot05-welcome-water-v1',
        material: 'water',
        activePresets: ['waterPulse'],
        comparisons,
      },
    ],
    ...overrides,
  };
}

const passingBeat = {
  meanAbsoluteDifference: 1.5,
  changedPixelRatio: 0.07,
};
const weakBeat = {
  meanAbsoluteDifference: 0.4,
  changedPixelRatio: 0.02,
};

test('calibrated water gate requires a majority of five review beats', () => {
  const result = evaluateMaterialCalibrations(
    materialQa([passingBeat, passingBeat, weakBeat, weakBeat, weakBeat]),
    calibrationLibrary,
  );

  assert.equal(result.pass, false);
  assert.equal(result.calibratedTargets[0].passingFrames, 2);
  assert.equal(result.calibratedTargets[0].requiredPassingFrames, 3);
});

test('calibrated water gate accepts three of five beats above the production floor', () => {
  const result = evaluateMaterialCalibrations(
    materialQa([passingBeat, passingBeat, passingBeat, weakBeat, weakBeat]),
    calibrationLibrary,
  );

  assert.equal(result.pass, true);
  assert.equal(result.calibratedTargets[0].passingFrames, 3);
  assert.equal(result.calibratedTargets[0].requiredPassingFrames, 3);
});

test('uncalibrated materials remain advisory instead of inheriting water thresholds', () => {
  const result = evaluateMaterialCalibrations(
    {
      applicable: true,
      sourceShotNumber: 8,
      thresholds: { pixelChangeThreshold: 2 },
      targets: [
        {
          layerId: 'future-smoke-v1',
          material: 'smoke',
          activePresets: ['smokeDrift'],
          comparisons: [weakBeat, weakBeat, weakBeat],
        },
      ],
    },
    calibrationLibrary,
  );

  assert.equal(result.pass, true);
  assert.equal(result.calibratedTargets.length, 0);
  assert.equal(result.uncalibratedTargets.length, 1);
  assert.equal(result.uncalibratedTargets[0].blocking, false);
});

test('Shot 5 contained-water floor does not leak into older water benchmarks', () => {
  const result = evaluateMaterialCalibrations(
    {
      applicable: true,
      sourceShotNumber: 3,
      thresholds: { pixelChangeThreshold: 2 },
      targets: [
        {
          layerId: 'shot03-water-v1',
          material: 'water',
          activePresets: ['waterPulse'],
          comparisons: [weakBeat, weakBeat, weakBeat, weakBeat, weakBeat],
        },
        {
          layerId: 'shot04-mid-current-v1',
          material: 'water',
          activePresets: ['waterPulse', 'numinousDrift'],
          comparisons: [weakBeat, weakBeat, weakBeat, weakBeat, weakBeat],
        },
      ],
    },
    calibrationLibrary,
  );

  assert.equal(result.pass, true);
  assert.equal(result.calibratedTargets.length, 0);
  assert.equal(result.uncalibratedTargets.length, 2);
  assert.equal(result.uncalibratedTargets.every((target) => target.blocking === false), true);
});

test('an unscoped calibration is ignored rather than becoming a global gate', () => {
  const unsafeLibrary = {
    schemaVersion: 1,
    calibrations: [
      {
        id: 'unsafe-water-floor',
        motionPreset: 'waterPulse',
        material: 'water',
        productionFloor: {
          minMeanDiff: 1.0,
          minChangedRatio: 0.05,
          minPassingRatio: 0.6,
          pixelChangeThreshold: 2,
        },
      },
    ],
  };

  const result = evaluateMaterialCalibrations(
    materialQa([weakBeat, weakBeat, weakBeat, weakBeat, weakBeat]),
    unsafeLibrary,
  );

  assert.equal(result.pass, true);
  assert.equal(result.calibratedTargets.length, 0);
  assert.equal(result.uncalibratedTargets.length, 1);
});
