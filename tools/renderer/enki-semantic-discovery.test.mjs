import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const SCRIPT = new URL('../scripts/shot03-enki-semantic-discovery.mjs', import.meta.url);

async function source() {
  return readFile(SCRIPT, 'utf8');
}

test('semantic discovery consumes the latest passing actor-prep packet', async () => {
  const text = await source();
  assert.match(text, /actor-prep\/enki\/v1/);
  assert.match(text, /packetReceipt\.pass !== true/);
  assert.match(text, /definition digest changed/i);
  assert.match(text, /reference bytes no longer match the accepted source receipt/i);
});

test('semantic discovery performs two independent locator passes', async () => {
  const text = await source();
  assert.match(text, /20260827/);
  assert.match(text, /20260828/);
  assert.match(text, /buildSemanticConsensus/);
  assert.match(text, /modelInvocations: 2/);
});

test('semantic discovery is localization-only and does not generate pixels', async () => {
  const text = await source();
  assert.match(text, /localization only/i);
  assert.match(text, /noPixelGeneration: true/);
  assert.match(text, /generatedPixels: false/);
  assert.doesNotMatch(text, /ComfyUI|SAM3_Detect|KSampler|SaveImage/);
});

test('semantic discovery keeps canonical and actor-prep mutation disabled', async () => {
  const text = await source();
  assert.match(text, /canonicalAssetsMutated: false/);
  assert.match(text, /actorPrepDefinitionMutated: false/);
  assert.match(text, /promotionAllowed: false/);
  assert.match(text, /Human review is required/);
});

test('semantic discovery requests exact anatomy semantics without hidden reconstruction', async () => {
  const text = await source();
  for (const term of [
    'region:enki:head',
    'region:enki:face',
    'region:enki:eye-left',
    'region:enki:eye-right',
    'region:enki:hand-left',
    'region:enki:hand-right',
    'anchor:enki:gaze-origin',
    'anchor:enki:torso-root',
  ]) {
    assert.ok(text.includes(term), `missing semantic request ${term}`);
  }
  assert.match(text, /do not infer a hidden point/i);
  assert.match(text, /anatomical left\/right, not the viewer/i);
});

test('semantic discovery emits a standalone review overlay and stops before segmentation', async () => {
  const text = await source();
  assert.match(text, /semantic-discovery-review\.svg/);
  assert.match(text, /HUMAN_SEMANTIC_LOCATION_REVIEW/);
  assert.match(text, /source-pixel region extraction\/segmentation only/);
  assert.match(text, /do not lower thresholds or begin segmentation automatically/i);
});
