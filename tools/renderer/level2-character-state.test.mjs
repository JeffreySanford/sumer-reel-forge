import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const manifestPath =
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json';
const workflowPath =
  'tools/renderer/workflows/shot03-character-state-inpaint-api.json';
const entrypointPath = 'tools/scripts/shot03-level2-enki-blink.mjs';
const implementationPath = 'tools/scripts/shot03-level2-enki-blink-v2.mjs';
const enginePath = 'tools/scripts/shot03-level2-enki-blink-v2-engine.mjs';
const localizationPath =
  'tools/animation/src/level2-character-state-localization.mjs';

async function text(path) {
  return readFile(path, 'utf8');
}

test('Shot 3 blink remains a source-preserving character-state layer before or after human promotion', async () => {
  const manifest = JSON.parse(await text(manifestPath));
  const shot = manifest.shots.find((item) => item.sourceShotNumber === 3);
  assert.ok(shot);
  const blink = shot.layers.find((item) => item.id === 'shot03-enki-eyes-v1');
  assert.ok(blink);
  assert.equal(blink.role, 'character-state');
  assert.equal(blink.material, 'skin');
  assert.deepEqual(blink.motionPresets, ['blinkOnce']);
  assert.ok(['planned', 'approved'].includes(blink.state));
  if (blink.state === 'planned') {
    assert.equal(blink.review?.status, 'pending');
  } else {
    assert.equal(blink.review?.status, 'approved');
    assert.match(blink.sha256 ?? '', /^sha256:[a-f0-9]{64}$/i);
  }
});

test('Shot 3 blink workflow is localized conservative inpainting rather than whole-face regeneration', async () => {
  const workflow = JSON.parse(await text(workflowPath));
  assert.equal(workflow['3']?.inputs?.ckpt_name, 'sd-v1-5-inpainting.safetensors');
  assert.equal(workflow['6']?.class_type, 'VAEEncodeForInpaint');
  assert.equal(workflow['6']?.inputs?.grow_mask_by, 4);
  assert.equal(workflow['7']?.inputs?.denoise, 0.42);
  assert.match(
    workflow['4']?.inputs?.text ?? '',
    /same man|same.*face|exact existing painted face/i,
  );
  assert.match(workflow['4']?.inputs?.text ?? '', /closed.*blink|eyelids.*closed/i);
  assert.match(workflow['5']?.inputs?.text ?? '', /different face|changed identity/i);
});

test('Shot 3 blink lane constrains SAM to approved upper-face geometry before inpaint', async () => {
  const entrypoint = await text(entrypointPath);
  const source = await text(enginePath);
  const localization = await text(localizationPath);

  assert.match(entrypoint, /shot03-level2-enki-blink-v2\.mjs/);
  assert.match(await text(implementationPath), /shot03-level2-enki-blink-v2-engine\.mjs/);
  assert.match(source, /ENKI_BODY_ID = 'shot03-enki-body-v1'/);
  assert.match(source, /verifyStoredChecksum/);
  assert.match(source, /semantic-overlay-sam3-api\.json/);
  assert.match(source, /shot03-character-state-inpaint-api\.json/);
  assert.match(source, /deriveEnkiUpperFaceRoi/);
  assert.match(source, /constrainSamEyeMask/);
  assert.match(source, /validateEyeLocalization/);
  assert.match(source, /meaningfulComponentCount/);
  assert.match(source, /compactSupportRatio/);
  assert.doesNotMatch(source, /eyeBandFillRatio < 0\.01/);
  assert.match(source, /outsideEnkiRatio/);
  assert.match(source, /normalizedCenterYWithinBody/);
  assert.match(source, /changedPixelRatio/);
  assert.match(source, /meanRgbDiff/);
  assert.match(source, /humanReviewRequired: true/);
  assert.match(source, /automaticPromotionAllowed: false/);
  assert.match(source, /Canonical|canonical|manifestMutated: false/);
  assert.match(source, /--layer=shot03-rigging-v1/);
  assert.match(source, /--layer=shot03-enki-eyes-v1/);
  assert.match(localization, /eyeBand/);
  assert.match(localization, /outsideBodyRejected/);
  assert.match(localization, /outsideBandRejected/);
});
