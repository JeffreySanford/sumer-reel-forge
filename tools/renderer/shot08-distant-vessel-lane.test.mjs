import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { resolveLayerProductionLane } from '../creative/style-decisions.mjs';

const registryPath = resolve('tools/animation/shot08-distant-vessel-production-lanes.json');
const wrapperPath = resolve('tools/scripts/shot08-distant-vessel-lane.mjs');

test('Shot 8 distant vessel uses a scoped sparse QA floor without changing generic rigid-vessel policy', async () => {
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  const lane = resolveLayerProductionLane(registry, {
    id: 'shot08-boat-v1',
    role: 'major-prop',
    material: 'rigid-vessel',
    hasAlpha: true,
  });
  assert.equal(lane?.id, 'shot08-distant-vessel-extraction');
  assert.equal(lane.qa?.alphaCoverage?.minimum, 0.0005);
  assert.equal(lane.qa?.alphaCoverage?.preferredMinimum, 0.002);
  assert.equal(lane.qa?.requireSourceRgbUnderAlpha, true);
  assert.equal(lane.qa?.humanReviewRequired, true);
});

test('Shot 8 wrapper carries the same sparse mask floor into background repair and verification', async () => {
  const source = await readFile(wrapperPath, 'utf8');
  assert.match(source, /const minMaskRatio = '0\.0005'/);
  assert.match(source, /verify-semantic-overlay-candidate\.mjs/);
  assert.match(source, /repair-background-from-overlay\.mjs/);
  assert.match(source, /verify-background-repair-candidate\.mjs/);
  assert.match(source, /SPARSE_REVIEW_REQUIRED/);
  assert.match(source, /complete useful boat silhouette/);
});
