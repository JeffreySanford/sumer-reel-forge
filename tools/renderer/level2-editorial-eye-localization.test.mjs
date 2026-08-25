import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const path = 'tools/scripts/shot03-level2-localize-enki-eyes-editorial.mjs';

async function source() {
  return readFile(path, 'utf8');
}

test('editorial eye localization ignores the bad canonical eye-state alpha', async () => {
  const text = await source();
  assert.match(text, /localization source is immutable editorial-v1/i);
  assert.match(text, /legacyCanonicalEyeAlphaUsed: false/);
  assert.match(text, /Select only Enki\\'s two visible human eyes/);
  assert.match(text, /Do not select his horned headdress/);
  assert.doesNotMatch(text, /deriveEnkiUpperFaceRoi/);
  assert.doesNotMatch(text, /currentStateRgba/);
});

test('editorial eye localization is human-gated and never synthesizes or promotes a blink', async () => {
  const text = await source();
  assert.match(text, /humanReviewRequired: true/);
  assert.match(text, /automaticUseForBlinkSynthesis: false/);
  assert.match(text, /canonicalMutated: false/);
  assert.match(text, /no blink PNG was generated/i);
  assert.doesNotMatch(text, /shot03-level2-replacement-audition/);
  assert.doesNotMatch(text, /writeFile\(MANIFEST_PATH/);
});

test('editorial eye localization requires semantic proof that the mask is on both real eyes', async () => {
  const text = await source();
  assert.match(text, /maskOnBothEyes/);
  assert.match(text, /headdressOnly/);
  assert.match(text, /otherRegionDominates/);
  assert.match(text, /confidence.*0\.7/s);
  assert.match(text, /actual two eyes rather than his headdress/);
});
