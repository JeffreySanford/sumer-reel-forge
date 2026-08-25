import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const path = 'tools/scripts/shot03-level2-enki-blink-deterministic.mjs';

async function source() {
  return readFile(path, 'utf8');
}

test('deterministic closed-eye lane avoids generative image models and preserves canonical assets', async () => {
  const text = await source();
  assert.match(text, /no generative image model is used/);
  assert.match(text, /synthesizeDeterministicClosedEyeState/);
  assert.match(text, /canonicalMutated: false/);
  assert.match(text, /automaticPromotionAllowed: false/);
  assert.doesNotMatch(text, /ComfyUI/);
  assert.doesNotMatch(text, /writeFile\(MANIFEST_PATH/);
});

test('deterministic closed-eye lane requires structural, semantic, identity and seam gates before audition', async () => {
  const text = await source();
  assert.match(text, /eyeStateProof\.pass && semanticEyeStateProof\.pass && semanticArtifactPass/);
  assert.match(text, /semanticEyeStateProof\.identityStable === true/);
  assert.match(text, /semanticEyeStateProof\.patchSeamVisible === false/);
  assert.match(text, /semanticClosedEyeRequired: true/);
  assert.match(text, /semanticIdentityStableRequired: true/);
  assert.match(text, /visiblePatchSeamForbidden: true/);
});

test('deterministic closed-eye lane creates zoomed source/candidate evidence for the vision critic', async () => {
  const text = await source();
  assert.match(text, /SEMANTIC_SCALE = 8/);
  assert.match(text, /source-open-eyes-zoom\.png/);
  assert.match(text, /eyes-zoom\.png/);
  assert.match(text, /closed only when BOTH eyes are physically shut/);
  assert.match(text, /no visible iris or pupil/);
});

test('deterministic closed-eye lane reuses the existing human audition only after an eligible candidate exists', async () => {
  const text = await source();
  assert.match(text, /if \(!result\.bestCandidate\)/);
  assert.match(text, /shot03-level2-replacement-audition\.mjs/);
  assert.match(text, /no promotion performed/);
});
