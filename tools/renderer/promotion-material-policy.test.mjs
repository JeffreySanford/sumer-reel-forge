import assert from 'node:assert/strict';
import test from 'node:test';
import { materialPromotionRejectionReason } from './promotion-material-policy.mjs';

function review(pass = true, calibratedPass = true) {
  return {
    deterministic: {
      materialLocalMotion: {
        pass,
        calibratedGate: { pass: calibratedPass },
      },
    },
  };
}

test('uncalibrated provisional material differential may remain advisory for promotion', () => {
  const reason = materialPromotionRejectionReason({
    shotNumber: 6,
    material: {
      sourceShotNumber: 6,
      verificationType: 'same-camera-frozen-layer-material-motion',
      applicable: true,
      enforced: false,
      pass: false,
    },
    review: review(true, true),
  });
  assert.equal(reason, null);
});

test('reviewed calibrated material gate remains blocking', () => {
  const reason = materialPromotionRejectionReason({
    shotNumber: 6,
    material: {
      sourceShotNumber: 6,
      verificationType: 'same-camera-frozen-layer-material-motion',
      enforced: false,
      pass: true,
    },
    review: review(false, false),
  });
  assert.match(reason, /calibrated material-local gate/);
});

test('explicitly enforced raw material QA failure remains blocking', () => {
  const reason = materialPromotionRejectionReason({
    shotNumber: 5,
    material: {
      sourceShotNumber: 5,
      verificationType: 'same-camera-frozen-layer-material-motion',
      enforced: true,
      pass: false,
    },
    review: review(true, true),
  });
  assert.match(reason, /enforced material-local differential/);
});

test('material evidence must match the promoted shot', () => {
  const reason = materialPromotionRejectionReason({
    shotNumber: 6,
    material: {
      sourceShotNumber: 5,
      verificationType: 'same-camera-frozen-layer-material-motion',
      enforced: false,
      pass: true,
    },
    review: review(true, true),
  });
  assert.match(reason, /not Shot 6/);
});
