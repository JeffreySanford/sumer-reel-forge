import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../scripts/shot03-rigging-roi-search.mjs', import.meta.url),
  'utf8',
);

test('rigging ROI recovery targets one bounded cluster instead of the legacy full-frame rigging layer', () => {
  assert.match(source, /one coherent source-backed rigging\/rope cluster/i);
  assert.match(source, /does not cross Enki face/i);
  assert.match(source, /area > 0\.35/);
  assert.match(source, /exactly one rigging cluster/i);
});

test('rigging ROI recovery preserves candidate-only policy', () => {
  assert.match(source, /no canonical asset\/manifest mutation/i);
  assert.match(source, /automaticPromotionAllowed: false/);
  assert.match(source, /motionActivationAllowed: false/);
  assert.doesNotMatch(source, /copyFile\([^\n]*animation-v1/);
});

test('rigging ROI recovery verifies source RGB and hard-fails ROI clipping before motion', () => {
  assert.match(source, /analyzeSourceFidelity/);
  assert.match(source, /evaluateRiggingRoiCandidate/);
  assert.match(source, /anyStrongTouchesEdge/);
  assert.match(source, /Do not inpaint behind rigging and do not animate a candidate/i);
});
