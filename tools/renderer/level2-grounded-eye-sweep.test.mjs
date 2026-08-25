import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const path = 'tools/scripts/shot03-level2-enki-blink-grounded-sweep.mjs';

async function source() {
  return readFile(path, 'utf8');
}

test('grounded blink sweep consumes the trusted Qwen eye boxes instead of legacy eye alpha', async () => {
  const text = await source();
  assert.match(text, /mappedEyeBoxes/);
  assert.match(text, /buildGroundedEyeEditMask/);
  assert.match(text, /legacy canonical eye alpha is replacement provenance only and is NOT used for localization or masking/i);
  assert.match(text, /legacyCanonicalEyeAlphaUsed !== false/);
  assert.match(text, /sam3Used !== false/);
  assert.doesNotMatch(text, /alphaMaskFromRgba\(context\.currentStateRgba/);
  assert.doesNotMatch(text, /deriveEnkiUpperFaceRoi/);
});

test('grounded blink sweep binds every candidate to the exact grounding report', async () => {
  const text = await source();
  assert.match(text, /groundingReportPath: context\.grounding\.reportPath/);
  assert.match(text, /groundingReportChecksum: context\.grounding\.checksum/);
  assert.match(text, /groundedEyeBoxes: context\.grounding\.report\.mappedEyeBoxes/);
  assert.match(text, /sourceAuthority !== 'editorial-v1'/);
  assert.match(text, /report\.semanticPass !== true/);
});

test('grounded blink sweep requires structural closed-eye semantics identity and clean seams', async () => {
  const text = await source();
  assert.match(text, /analyzeGroundedEyeState/);
  assert.match(text, /evaluateClosedEyeSemantic/);
  assert.match(text, /eyeStateProof\.pass/);
  assert.match(text, /semanticEyeStateProof\.pass/);
  assert.match(text, /semanticEyeStateProof\.identityStable === true/);
  assert.match(text, /semanticEyeStateProof\.patchSeamVisible === false/);
  assert.match(text, /No iris, pupil, sclera, eyeball opening, catchlight or open-eye highlight may remain/);
});

test('grounded blink sweep remains candidate-only and human gated', async () => {
  const text = await source();
  assert.match(text, /canonicalMutated: false/);
  assert.match(text, /automaticPromotionAllowed: false/);
  assert.match(text, /humanIdentityReviewRequired: true/);
  assert.match(text, /explicitReplacementPromotionRequired: true/);
  assert.match(text, /rendering normal-speed human audition/i);
  assert.doesNotMatch(text, /writeFile\(MANIFEST_PATH/);
});
