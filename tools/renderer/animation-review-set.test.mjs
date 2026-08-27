import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateReviewSet } from '../animation/src/animation-review-set.mjs';

const config = JSON.parse(
  readFileSync(resolve('tools/animation/review-sets/shot03-recovered-motion.review-set.json'), 'utf8'),
);
const packetSource = readFileSync(resolve('tools/scripts/animation-candidate-review-packet.mjs'), 'utf8');
const montageSource = readFileSync(resolve('tools/scripts/animation-candidate-review-montage.mjs'), 'utf8');

test('Shot 3 review set freezes counter-sway as current accepted baseline', () => {
  const reviewSet = validateReviewSet(config);
  assert.equal(reviewSet.currentBaselineId, 'counter-sway');
  const baseline = reviewSet.candidates.find((candidate) => candidate.id === 'counter-sway');
  assert.equal(baseline.humanStatus, 'accepted');
  assert.equal(baseline.role, 'current-baseline');
});

test('breathing remains a non-selectable rejected reference', () => {
  const reviewSet = validateReviewSet(config);
  const breath = reviewSet.candidates.find((candidate) => candidate.id === 'breath');
  assert.equal(breath.role, 'rejected-reference');
  assert.equal(breath.humanStatus, 'rejected');
  assert.equal(breath.selectable, false);
});

test('review tooling never promotes or reopens rejected references automatically', () => {
  assert.match(packetSource, /reopenRejectedReferenceAutomatically: false/);
  assert.match(packetSource, /promotionAllowed: false/);
  assert.match(montageSource, /automaticPromotionAllowed: false/);
  assert.match(montageSource, /rejectedReferencesRemainRejected: true/);
});

test('review montage is config-driven instead of Shot 3 hard-coded', () => {
  assert.match(montageSource, /loadReviewSet\(options\.config\)/);
  assert.match(montageSource, /resolveReviewCandidates/);
  assert.doesNotMatch(montageSource, /pixi-shot03-recovered-character-motion-proof/);
});

test('review packet is config-driven and hashes evidence receipts', () => {
  assert.match(packetSource, /loadReviewSet\(options\.config\)/);
  assert.match(packetSource, /reportSha256/);
  assert.match(packetSource, /configSha256/);
});
