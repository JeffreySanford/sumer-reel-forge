import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  resolveSceneV2Assets,
  validateAnimationAssetManifest,
  type AnimationAssetManifest,
} from './animation-asset-manifest';
import { loadSceneV2ForRender } from './scene-v2-asset-loader';
import type { SceneV2 } from './scene-v2';

const manifestPath = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const shotThreeScenePath = resolve(
  'tools/animation/scenes/reel-01-shot-03-benchmark.scene-v2.json',
);
const shotFourScenePath = resolve(
  'tools/animation/scenes/reel-01-shot-04-nammu-benchmark.scene-v2.json',
);

async function loadManifest(): Promise<AnimationAssetManifest> {
  return JSON.parse(await readFile(manifestPath, 'utf8')) as AnimationAssetManifest;
}

async function loadScene(path = shotThreeScenePath): Promise<SceneV2> {
  return JSON.parse(await readFile(path, 'utf8')) as SceneV2;
}

test('animation-v1 manifest is valid while layers remain planned', async () => {
  const manifest = await loadManifest();
  const result = validateAnimationAssetManifest(manifest);

  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(manifest.shots.length, 2);
  assert.equal(
    manifest.shots.flatMap((shot) => shot.layers).every((layer) => layer.state === 'planned'),
    true,
  );
});

test('Shot 3 stays on the approved editorial fallback until all activation layers are approved', async () => {
  const manifest = await loadManifest();
  const scene = await loadScene();
  const resolution = resolveSceneV2Assets(scene, manifest);

  assert.equal(resolution.mode, 'fallback');
  assert.deepEqual(resolution.layeredShotIds, []);
  assert.deepEqual(resolution.fallbackShotIds, ['enki-at-the-helm']);
  assert.deepEqual(resolution.unresolvedRequiredLayerIds.sort(), [
    'shot03-background-v1',
    'shot03-enki-body-v1',
    'shot03-vessel-v1',
    'shot03-water-v1',
  ]);
  assert.equal(
    resolution.scene.shots[0]?.layers[0]?.assetId,
    'shot03-editorial-v1-flat',
  );
  assert.equal(resolution.scene.shots[0]?.performance[0]?.enabled, false);
});

test('approved Shot 3 activation layers switch to layered mode and wake matching deferred performance', async () => {
  const manifest = await loadManifest();
  const scene = await loadScene();
  const shot = manifest.shots.find((candidate) => candidate.shotId === 'enki-at-the-helm');
  assert.ok(shot);

  for (const layer of shot.layers) {
    if (shot.activationPolicy.requiredLayerIds.includes(layer.id)) {
      layer.state = 'approved';
      layer.review.status = 'approved';
    }
  }

  const resolution = resolveSceneV2Assets(scene, manifest);
  assert.equal(resolution.mode, 'layered');
  assert.deepEqual(resolution.layeredShotIds, ['enki-at-the-helm']);
  assert.equal(resolution.scene.assetVersion, 'animation-v1');
  assert.equal(resolution.scene.shots[0]?.layers.length, 4);
  assert.equal(
    resolution.scene.shots[0]?.layers.some((layer) => layer.assetId === 'shot03-enki-body-v1'),
    true,
  );
  assert.equal(resolution.scene.shots[0]?.performance[0]?.preset, 'breathing');
  assert.equal(resolution.scene.shots[0]?.performance[0]?.enabled, true);
  assert.equal(resolution.scene.shots[0]?.performance[1]?.preset, 'blinkOnce');
  assert.equal(resolution.scene.shots[0]?.performance[1]?.enabled, false);
});

test('approved layer state still requires explicit approved human review', async () => {
  const manifest = await loadManifest();
  const layer = manifest.shots[0]!.layers[0]!;
  layer.state = 'approved';
  layer.review.status = 'pending';

  const result = validateAnimationAssetManifest(manifest);
  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /requires approved human review/);
});

test('Shot 4 manifest fallback does not introduce conventional Nammu character motion', async () => {
  const manifest = await loadManifest();
  const scene = await loadScene(shotFourScenePath);
  const resolution = resolveSceneV2Assets(scene, manifest);

  assert.equal(resolution.mode, 'fallback');
  assert.equal(
    resolution.scene.shots[0]?.performance.some((item) => item.preset === 'blinkOnce'),
    false,
  );
  assert.equal(
    resolution.scene.shots[0]?.performance.some((item) => item.preset === 'breathing'),
    false,
  );
});

test('render loader ignores nonexistent planned layers and verifies only active fallback assets', async () => {
  const loaded = await loadSceneV2ForRender(shotThreeScenePath, resolve('assets'));

  assert.equal(loaded.assetResolution.mode, 'fallback');
  assert.match(loaded.manifestPath ?? '', /animation-v1[\\/]manifest\.json$/);
  assert.equal(
    loaded.scene.shots[0]?.layers[0]?.assetPath,
    'blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-03.png',
  );
});
