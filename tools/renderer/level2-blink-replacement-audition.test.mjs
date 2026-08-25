import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const path = 'tools/scripts/shot03-level2-replacement-audition.mjs';

async function source() {
  return readFile(path, 'utf8');
}

test('replacement audition requires a QA-passed replacement before rendering', async () => {
  const text = await source();

  assert.match(text, /shot03-character-state-replacement-candidate/);
  assert.match(text, /replacementForLayerId === TARGET_LAYER_ID/);
  assert.match(text, /candidate\.eyeStateProof\?\.pass !== true/);
  assert.match(text, /No QA-passed Shot 3 closed-eye replacement candidate exists/);
});

test('replacement audition adapts metadata only under tmp and reuses the existing candidate renderer', async () => {
  const text = await source();

  assert.match(text, /candidate-run\.json/);
  assert.match(text, /character-state-replacement-eye-state-proof/);
  assert.match(text, /render-shot03-level2-candidate-preview\.ts/);
  assert.match(text, /--layer=\$\{RIGGING_LAYER_ID\}/);
  assert.match(text, /--layer=\$\{TARGET_LAYER_ID\}/);
  assert.match(text, /canonical assets remain untouched/);
  assert.doesNotMatch(text, /assets\/blessings-of-sumer/);
  assert.doesNotMatch(text, /manifest\.json/);
});

test('replacement audition never promotes candidates automatically', async () => {
  const text = await source();

  assert.match(text, /automaticPromotionAllowed: false/);
  assert.match(text, /humanReviewRequired: true/);
  assert.doesNotMatch(text, /promote-reviewed/);
  assert.doesNotMatch(text, /copyFile/);
});
