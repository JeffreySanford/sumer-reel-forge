import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const manifestPath =
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json';
const workflowPath =
  'tools/renderer/workflows/shot03-character-state-inpaint-api.json';
const scriptPath = 'tools/scripts/shot03-level2-enki-blink.mjs';

async function text(path) {
  return readFile(path, 'utf8');
}

test('Shot 3 blink remains a planned character-state layer with deferred blinkOnce motion', async () => {
  const manifest = JSON.parse(await text(manifestPath));
  const shot = manifest.shots.find((item) => item.sourceShotNumber === 3);
  assert.ok(shot);
  const blink = shot.layers.find((item) => item.id === 'shot03-enki-eyes-v1');
  assert.ok(blink);
  assert.equal(blink.role, 'character-state');
  assert.equal(blink.material, 'skin');
  assert.deepEqual(blink.motionPresets, ['blinkOnce']);
  assert.equal(blink.state, 'planned');
  assert.equal(blink.review?.status, 'pending');
});

test('Shot 3 blink workflow is localized conservative inpainting rather than whole-face regeneration', async () => {
  const workflow = JSON.parse(await text(workflowPath));
  assert.equal(workflow['3']?.inputs?.ckpt_name, 'sd-v1-5-inpainting.safetensors');
  assert.equal(workflow['6']?.class_type, 'VAEEncodeForInpaint');
  assert.equal(workflow['6']?.inputs?.grow_mask_by, 4);
  assert.equal(workflow['7']?.inputs?.denoise, 0.42);
  assert.match(workflow['4']?.inputs?.text ?? '', /same man|same.*face|exact existing painted face/i);
  assert.match(workflow['4']?.inputs?.text ?? '', /closed.*blink|eyelids.*closed/i);
  assert.match(workflow['5']?.inputs?.text ?? '', /different face|changed identity/i);
});

test('Shot 3 blink lane uses approved Enki identity localization and deterministic identity-region QA', async () => {
  const source = await text(scriptPath);

  assert.match(source, /ENKI_BODY_ID = 'shot03-enki-body-v1'/);
  assert.match(source, /verifyStoredChecksum/);
  assert.match(source, /semantic-overlay-sam3-api\.json/);
  assert.match(source, /shot03-character-state-inpaint-api\.json/);
  assert.match(source, /validateEyeLocalization/);
  assert.match(source, /outsideEnkiRatio/);
  assert.match(source, /normalizedCenterYWithinBody/);
  assert.match(source, /changedPixelRatio/);
  assert.match(source, /meanRgbDiff/);
  assert.match(source, /humanReviewRequired: true/);
  assert.match(source, /automaticPromotionAllowed: false/);
  assert.match(source, /Canonical|canonical|manifestMutated: false/);
  assert.match(source, /--layer=shot03-rigging-v1/);
  assert.match(source, /--layer=shot03-enki-eyes-v1/);
});
