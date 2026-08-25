import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const previewPath = 'tools/scripts/render-shot03-level2-candidate-preview.ts';
const riggingWrapperPath = 'tools/scripts/shot03-level2-rigging.mjs';
const manifestPath =
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json';
const productionLanesPath = 'tools/animation/production-lanes-v1.json';

async function text(path) {
  return readFile(path, 'utf8');
}

test('Shot 3 Level 2 audition stages approved canonical baseline plus explicit optional candidates without promotion', async () => {
  const source = await text(previewPath);

  assert.match(source, /At least one --layer=<optional-layer-id> is required/);
  assert.match(source, /verifyCanonicalChecksum/);
  assert.match(source, /TEMPORARY LEVEL 2 AUDITION ONLY/);
  assert.match(source, /canonical animation-v1 manifest remains unchanged/);
  assert.match(source, /candidatesPromoted: false/);
  assert.match(source, /animationV1Modified: false/);
  assert.match(source, /Canonical animation-v1 assets and manifest were NOT modified/);
});

test('Shot 3 Level 2 audition preserves the repository sha256: checksum format exactly once', async () => {
  const source = await text(previewPath);

  assert.match(source, /sha256: candidate\.checksum/);
  assert.match(source, /const expected = String\(layer\.sha256\)\.toLowerCase\(\)/);
  assert.match(source, /const actual = \(await sha256\(path\)\)\.toLowerCase\(\)/);
  assert.doesNotMatch(source, /`sha256:\$\{candidate\.checksum\}`/);
  assert.doesNotMatch(source, /replace\(\/\^sha256:\//);
});

test('Shot 3 Level 2 rigging uses the source-preserving foreground extraction lane before or after human promotion', async () => {
  const [manifest, productionLanes, wrapper] = await Promise.all([
    text(manifestPath).then(JSON.parse),
    text(productionLanesPath).then(JSON.parse),
    text(riggingWrapperPath),
  ]);
  const shot = manifest.shots.find((item) => item.sourceShotNumber === 3);
  assert.ok(shot);
  const rigging = shot.layers.find((item) => item.id === 'shot03-rigging-v1');
  assert.ok(rigging);
  assert.equal(rigging.role, 'foreground-occluder');
  assert.equal(rigging.hasAlpha, true);
  assert.deepEqual(rigging.motionPresets, ['riggingTension']);
  assert.ok(['planned', 'approved'].includes(rigging.state));
  if (rigging.state === 'approved') {
    assert.equal(rigging.review?.status, 'approved');
    assert.match(rigging.sha256 ?? '', /^sha256:[a-f0-9]{64}$/i);
  }

  const lane = productionLanes.lanes.find(
    (item) => item.id === 'foreground-source-extraction',
  );
  assert.ok(lane);
  assert.equal(lane.match.role, 'foreground-occluder');
  assert.equal(lane.match.hasAlpha, true);
  assert.equal(lane.generator.family, 'sam3-semantic-overlay');
  assert.equal(lane.qa.requireSourceRgbUnderAlpha, true);
  assert.equal(lane.qa.humanReviewRequired, true);

  assert.match(wrapper, /shot03-rigging-v1/);
  assert.match(wrapper, /semantic-overlay-sam3-api\.json/);
  assert.match(wrapper, /verify-semantic-overlay-candidate\.mjs/);
  assert.match(wrapper, /render-shot03-level2-candidate-preview\.ts/);
});
