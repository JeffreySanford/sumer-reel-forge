import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const path = 'tools/scripts/shot03-level2-localize-enki-eyes-editorial.mjs';

async function source() {
  return readFile(path, 'utf8');
}

test('editorial eye grounding ignores bad canonical eye alpha and SAM3', async () => {
  const text = await source();
  assert.match(text, /localization source is immutable editorial-v1/i);
  assert.match(text, /legacyCanonicalEyeAlphaUsed: false/);
  assert.match(text, /sam3Used: false/);
  assert.match(text, /legacy canonical eye alpha and SAM3 are NOT used/);
  assert.doesNotMatch(text, /deriveEnkiUpperFaceRoi/);
  assert.doesNotMatch(text, /currentStateRgba/);
  assert.doesNotMatch(text, /semantic-overlay-sam3-api/);
});

test('editorial eye grounding is two-stage face then eye localization', async () => {
  const text = await source();
  assert.match(text, /locateFace\(context\.editorialPath\)/);
  assert.match(text, /locateEyes\(faceCropPath\)/);
  assert.match(text, /Coordinates are integers normalized 0\.\.1000 relative to the supplied image/);
  assert.match(text, /Coordinates are integers normalized 0\.\.1000 relative to this FACE CROP/);
  assert.match(text, /actual exposed human face, not his horned headdress/);
  assert.match(text, /actual visible eye openings and immediate eyelids only/);
});

test('editorial eye grounding requires geometry plus independent annotated-box verification', async () => {
  const text = await source();
  assert.match(text, /validateEyeGrounding/);
  assert.match(text, /verifyGrounding/);
  assert.match(text, /bothBoxesOnActualEyes/);
  assert.match(text, /headdressIncluded/);
  assert.match(text, /boxesTooBroad/);
  assert.match(text, /confidence.*0\.7/s);
  assert.match(text, /editorial-eye-grounding-contact-sheet\.png/);
});

test('editorial eye grounding remains human-gated and never synthesizes or promotes a blink', async () => {
  const text = await source();
  assert.match(text, /humanReviewRequired: true/);
  assert.match(text, /automaticUseForBlinkSynthesis: false/);
  assert.match(text, /canonicalMutated: false/);
  assert.match(text, /no blink PNG was generated/i);
  assert.doesNotMatch(text, /shot03-level2-replacement-audition/);
  assert.doesNotMatch(text, /writeFile\(MANIFEST_PATH/);
});
