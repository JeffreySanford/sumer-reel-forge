import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { validateReviewSet } from '../animation/src/animation-review-set.mjs';

const wrapperSource = readFileSync(
  new URL('../scripts/shot03-recovered-motion-review-montage.mjs', import.meta.url),
  'utf8',
);
const montageSource = readFileSync(
  resolve('tools/scripts/animation-candidate-review-montage.mjs'),
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

test('Shot 3 montage wrapper delegates to generic review tooling and tracked config', () => {
  assert.match(wrapperSource, /animation-candidate-review-montage\.mjs/);
  assert.match(wrapperSource, /shot03-recovered-motion\.review-set\.json/);
  assert.doesNotMatch(wrapperSource, /hstack=inputs=3/);
});

test('generic review montage renders configured candidates without changing acceptance', () => {
  assert.match(montageSource, /includeInMontage/);
  assert.match(montageSource, /hstack=inputs=\$\{candidates\.length\}/);
  assert.match(montageSource, /automaticPromotionAllowed: false/);
  assert.match(montageSource, /rejectedReferencesRemainRejected: true/);
  assert.match(montageSource, /Human normal-speed judgment remains authoritative/);
  assert.deepEqual(
    reviewSet.candidates.filter((candidate) => candidate.includeInMontage !== false).map((candidate) => candidate.id),
    ['primary', 'counter-sway', 'breath'],
  );
});

test('Shot 3 montage retains rejected and deferred channels as comparison evidence only', () => {
  const breath = reviewSet.candidates.find((candidate) => candidate.id === 'breath');
  assert.equal(breath.role, 'rejected-reference');
  assert.equal(breath.humanStatus, 'rejected');
  assert.equal(breath.selectable, false);
  assert.deepEqual(reviewSet.deferredOrRejectedChannels, [
    'blink',
    'water extraction',
    'rigging extraction',
    'whole-cutout breathe-calm',
  ]);
  assert.match(montageSource, /presence does not reopen them as candidates/i);
});

test('generic montage emits review-set-derived video, contact sheet, index, and receipt', () => {
  assert.match(montageSource, /\$\{reviewSet\.reviewSetId\}-montage\.mp4/);
  assert.match(montageSource, /\$\{reviewSet\.reviewSetId\}-contact-sheet\.png/);
  assert.match(montageSource, /\$\{reviewSet\.reviewSetId\}-index\.md/);
  assert.match(montageSource, /\$\{reviewSet\.reviewSetId\}-montage\.json/);
});
