import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const promotionPath = 'tools/scripts/shot03-level2-promote-reviewed.mjs';

async function source() {
  return readFile(promotionPath, 'utf8');
}

test('Shot 3 Level 2 promotion is exact-preview, exact-layer, checksum-backed and human-confirmed', async () => {
  const text = await source();

  assert.match(text, /shot03-level2-optional-layer-audition/);
  assert.match(text, /shot03-enki-eyes-v1/);
  assert.match(text, /shot03-rigging-v1/);
  assert.match(text, /APPROVE_SHOT_3_LEVEL2/);
  assert.match(text, /--apply requires an explicit --preview-dir/);
  assert.match(text, /candidate checksum no longer matches reviewed evidence/);
  assert.match(text, /QA evidence is not passing/);
  assert.match(text, /humanApprovalRequired !== true/);
  assert.match(text, /automaticPromotionAllowed: false/);
  assert.match(text, /editorialV1Modified: false/);
  assert.match(text, /DRY RUN ONLY/);
});

test('Shot 3 Level 2 promotion updates only reviewed optional layers rather than the required activation set', async () => {
  const text = await source();

  assert.match(
    text,
    /EXPECTED_LAYER_IDS = \['shot03-enki-eyes-v1', 'shot03-rigging-v1'\]/,
  );
  assert.doesNotMatch(text, /activationPolicy\?\.requiredLayerIds/);
  assert.match(text, /manifestLayer\.state = 'approved'/);
  assert.match(text, /manifestLayer\.review =/);
  assert.match(text, /manifestLayer\.sha256 = layer\.candidateChecksum/);
});
