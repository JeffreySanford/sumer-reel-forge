import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { evaluateClosedEyeSemantic } from '../animation/src/level2-closed-eye-semantic-proof.mjs';

const sweepPath = 'tools/scripts/shot03-level2-enki-blink-closed-sweep.mjs';

async function source() {
  return readFile(sweepPath, 'utf8');
}

test('closed-eye semantic gate accepts only confidently shut eyes with no visible eyeball detail', () => {
  const pass = evaluateClosedEyeSemantic({
    state: 'closed',
    bothEyesClosed: true,
    irisOrPupilVisible: false,
    scleraVisible: false,
    confidence: 0.91,
    identityStable: true,
    patchSeamVisible: false,
    summary: 'Both eyelids form closed creases.',
  });
  assert.equal(pass.pass, true, pass.failures.join('\n'));

  for (const review of [
    {
      state: 'open',
      bothEyesClosed: false,
      irisOrPupilVisible: true,
      scleraVisible: true,
      confidence: 0.95,
    },
    {
      state: 'ambiguous',
      bothEyesClosed: false,
      irisOrPupilVisible: false,
      scleraVisible: false,
      confidence: 0.9,
    },
    {
      state: 'closed',
      bothEyesClosed: true,
      irisOrPupilVisible: true,
      scleraVisible: false,
      confidence: 0.9,
    },
  ]) {
    assert.equal(evaluateClosedEyeSemantic(review).pass, false);
  }
});

test('closed-eye sweep strengthens generation instead of accepting changed open eyes', async () => {
  const text = await source();
  assert.match(text, /denoise: 0\.56/);
  assert.match(text, /denoise: 0\.68/);
  assert.match(text, /denoise: 0\.78/);
  assert.match(text, /No iris, pupil, sclera or visible eyeball/);
  assert.match(text, /qwen3-vl:4b-instruct/);
  assert.match(text, /evaluateClosedEyeSemantic/);
  assert.match(text, /eligibleForAudition/);
  assert.match(text, /semanticEyeStateProof/);
  assert.match(text, /closed-eye-sweep-contact-sheet\.png/);
});

test('closed-eye sweep remains candidate-only and human-gated', async () => {
  const text = await source();
  assert.match(text, /canonicalMutated: false/);
  assert.match(text, /automaticPromotionAllowed: false/);
  assert.match(text, /humanIdentityReviewRequired: true/);
  assert.match(text, /explicitReplacementPromotionRequired: true/);
  assert.match(text, /shot03-level2-replacement-audition\.mjs/);
  assert.doesNotMatch(text, /writeFile\(MANIFEST_PATH/);
});
