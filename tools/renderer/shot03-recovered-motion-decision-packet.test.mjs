import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { validateReviewSet } from '../animation/src/animation-review-set.mjs';

const wrapperSource = readFileSync(
  new URL('../scripts/shot03-recovered-motion-decision-packet.mjs', import.meta.url),
  'utf8',
);
const packetSource = readFileSync(
  resolve('tools/scripts/animation-candidate-review-packet.mjs'),
  'utf8',
);
const reviewSet = validateReviewSet(
  JSON.parse(
    readFileSync(
      resolve('tools/animation/review-sets/shot03-recovered-motion.review-set.json'),
      'utf8',
    ),
  ),
);

test('Shot 3 decision packet wrapper delegates to generic review tooling and tracked config', () => {
  assert.match(wrapperSource, /animation-candidate-review-packet\.mjs/);
  assert.match(wrapperSource, /shot03-recovered-motion\.review-set\.json/);
  assert.doesNotMatch(wrapperSource, /pixi-shot03-recovered-character-motion-proof/);
});

test('Shot 3 review set carries the three historical motion stacks with counter-sway authoritative', () => {
  assert.deepEqual(
    reviewSet.candidates.map((candidate) => candidate.id),
    ['primary', 'counter-sway', 'breath'],
  );
  assert.equal(reviewSet.currentBaselineId, 'counter-sway');
  const baseline = reviewSet.candidates.find((candidate) => candidate.id === 'counter-sway');
  const breath = reviewSet.candidates.find((candidate) => candidate.id === 'breath');
  assert.equal(baseline.humanStatus, 'accepted');
  assert.equal(baseline.role, 'current-baseline');
  assert.equal(breath.humanStatus, 'rejected');
  assert.equal(breath.role, 'rejected-reference');
  assert.equal(breath.selectable, false);
});

test('generic decision packet consumes AI advisory evidence without granting acceptance', () => {
  assert.match(packetSource, /aiReviewPath/);
  assert.match(packetSource, /aiStatus/);
  assert.match(packetSource, /reopenRejectedReferenceAutomatically: false/);
  assert.match(packetSource, /promotionAllowed: false/);
  assert.match(packetSource, /cannot promote or reopen a human-rejected candidate/i);
});

test('Shot 3 review policy keeps abandoned lanes non-blocking and preserves existing human authority', () => {
  assert.equal(reviewSet.humanSelectionRequired, false);
  assert.equal(reviewSet.policy.normalSpeedHumanAuthority, true);
  assert.equal(reviewSet.policy.technicalGreenDoesNotOverrideHumanRejection, true);
  assert.equal(reviewSet.policy.rejectedReferencesAreNotSelectable, true);
  assert.equal(reviewSet.policy.automaticPromotionAllowed, false);
  assert.deepEqual(reviewSet.deferredOrRejectedChannels, [
    'blink',
    'water extraction',
    'rigging extraction',
    'whole-cutout breathe-calm',
  ]);
});
