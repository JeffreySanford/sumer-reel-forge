import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const path = 'tools/scripts/shot03-level2-enki-blink-replacement.mjs';

async function source() {
  return readFile(path, 'utf8');
}

test('replacement lane preserves approved canonical state and writes candidates only under tmp', async () => {
  const text = await source();

  assert.match(text, /must remain approved and checksum-backed while a replacement candidate is generated/);
  assert.match(text, /verifyChecksum\(currentStateBytes, layer\.sha256, LAYER_ID\)/);
  assert.match(text, /tmp\/animation-assets\/candidates\/chapter-01-reel-01-animation-v1/);
  assert.match(text, /canonicalMutated: false/);
  assert.match(text, /automaticPromotionAllowed: false/);
  assert.match(text, /explicitReplacementPromotionRequired: true/);
  assert.doesNotMatch(text, /writeFile\(MANIFEST_PATH/);
});

test('replacement lane reuses approved eye alpha as a trusted seed and expands it with replacement-specific bounds', async () => {
  const text = await source();

  assert.match(text, /alphaMaskFromRgba\(context\.currentStateRgba/);
  assert.match(text, /source: 'current approved closed-eye alpha only'/);
  assert.match(text, /TARGET_EYE_BAND_FILL = 0\.015/);
  assert.match(text, /MAX_EYE_BAND_FILL = 0\.03/);
  assert.match(text, /expandTrustedEyeSeedMask/);
  assert.match(text, /minSeedInBandRatio: 0\.98/);
  assert.match(text, /maxHorizontalRadius: 24/);
  assert.match(text, /maxVerticalRadius: 10/);
  assert.doesNotMatch(text, /dilateEyeMaskWithinConstraints/);
});

test('replacement candidate must pass the stronger eye-state proof before promotion can be considered', async () => {
  const text = await source();

  assert.match(text, /analyzeEyeStateAsset/);
  assert.match(text, /statePath: candidatePath/);
  assert.match(text, /referencePath: context\.editorialPath/);
  assert.match(text, /CANDIDATE QA PASS — human visual review required before any replacement promotion/);
  assert.match(text, /CANDIDATE BLOCKED — do not promote or alter the canonical asset/);
});

test('replacement inpaint remains source-authoritative and mask-bounded', async () => {
  const text = await source();

  assert.match(text, /sole identity authority/);
  assert.match(text, /trusted eye\/eyelid editing region/);
  assert.match(text, /Do not alter any unmasked facial feature/);
  assert.match(text, /editorial-eye-source-crop\.png/);
  assert.match(text, /replacement-eye-mask-crop\.png/);
});
