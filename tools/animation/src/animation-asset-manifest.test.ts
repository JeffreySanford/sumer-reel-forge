import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  isExactEditorialSourceLayer,
  resolveSceneV2Assets,
  validateAnimationAssetManifest,
  type AnimationAssetManifest,
  type AnimationAssetManifestShot,
} from './animation-asset-manifest';
import { loadSceneV2ForRender } from './scene-v2-asset-loader';
import type { SceneV2 } from './scene-v2';

const manifestPath = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const shotOneScenePath = resolve(
  'tools/animation/scenes/reel-01-shot-01-black-water-benchmark.scene-v2.json',
);
const shotTwoScenePath = resolve(
  'tools/animation/scenes/reel-01-shot-02-stag-coastline-benchmark.scene-v2.json',
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

function requireShot(
  manifest: AnimationAssetManifest,
  shotId: string,
): AnimationAssetManifestShot {
  const shot = manifest.shots.find((candidate) => candidate.shotId === shotId);
  assert.ok(shot, `Manifest is missing ${shotId}.`);
  return shot;
}

function setRequiredLayerState(
  shot: AnimationAssetManifestShot,
  state: 'planned' | 'approved',
): void {
  for (const layer of shot.layers) {
    if (!shot.activationPolicy.requiredLayerIds.includes(layer.id)) continue;
    layer.state = state;
    layer.review.status = state === 'approved' ? 'approved' : 'pending';
    if (state === 'planned') delete layer.sha256;
  }
}

test('current animation-v1 manifest is valid with approved benchmark shots', async () => {
  const manifest = await loadManifest();
  const result = validateAnimationAssetManifest(manifest);

  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.ok(manifest.shots.length >= 5);

  for (const shotId of [
    'black-water-before-dawn',
    'stag-of-the-absu-coastline',
    'enki-at-the-helm',
    'nammu-under-water',
    'traveler-shrine-hospitality',
  ]) {
    const shot = requireShot(manifest, shotId);
    assert.equal(shot.status, 'approved');
    for (const requiredId of shot.activationPolicy.requiredLayerIds) {
      const layer = shot.layers.find((candidate) => candidate.id === requiredId);
      assert.ok(layer, `Missing required layer ${requiredId}.`);
      assert.equal(layer.state, 'approved');
      assert.equal(layer.review.status, 'approved');
    }
  }
});

test('legacy Shots 1 and 2 use exact immutable editorial source-backed activation', async () => {
  const manifest = await loadManifest();

  for (const shotId of ['black-water-before-dawn', 'stag-of-the-absu-coastline']) {
    const shot = requireShot(manifest, shotId);
    const requiredId = shot.activationPolicy.requiredLayerIds[0]!;
    const layer = shot.layers.find((candidate) => candidate.id === requiredId);
    assert.ok(layer);
    assert.equal(isExactEditorialSourceLayer(shot, layer), true);
    assert.equal(layer.sha256, undefined);
    assert.equal(layer.path, shot.sourceFrame);
    assert.equal(layer.source.from, shot.sourceFrame);
    assert.deepEqual(layer.motionPresets, []);
  }
});

test('unchecksummed legacy layers lose the exemption if they stop being exact editorial references', async () => {
  const manifest = await loadManifest();
  const shot = requireShot(manifest, 'black-water-before-dawn');
  const requiredId = shot.activationPolicy.requiredLayerIds[0]!;
  const layer = shot.layers.find((candidate) => candidate.id === requiredId);
  assert.ok(layer);
  layer.source.type = 'derived';

  const result = validateAnimationAssetManifest(manifest);
  assert.equal(result.valid, false);
  assert.match(
    result.errors.join('\n'),
    /requires SHA-256 provenance unless it is an exact immutable editorial source reference/,
  );
});

test('render loader activates the source-backed Shot 1 and Shot 2 baselines', async () => {
  for (const [scenePath, shotId, layerId] of [
    [shotOneScenePath, 'black-water-before-dawn', 'shot01-editorial-source-v1'],
    [shotTwoScenePath, 'stag-of-the-absu-coastline', 'shot02-editorial-source-v1'],
  ] as const) {
    const loaded = await loadSceneV2ForRender(scenePath, resolve('assets'));
    assert.equal(loaded.assetResolution.mode, 'layered');
    assert.deepEqual(loaded.assetResolution.layeredShotIds, [shotId]);
    assert.equal(
      loaded.scene.shots[0]?.layers.some((layer) => layer.assetId === layerId),
      true,
    );
    assert.equal(
      loaded.scene.shots[0]?.layers.some(
        (layer) => layer.material === 'editorial-reference',
      ),
      true,
    );
  }
});

test('Shot 3 falls back safely when an activation set is not approved', async () => {
  const manifest = await loadManifest();
  const scene = await loadScene();
  const shot = requireShot(manifest, 'enki-at-the-helm');
  setRequiredLayerState(shot, 'planned');

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
  const shot = requireShot(manifest, 'enki-at-the-helm');
  setRequiredLayerState(shot, 'planned');
  setRequiredLayerState(shot, 'approved');

  const resolution = resolveSceneV2Assets(scene, manifest);
  assert.equal(resolution.mode, 'layered');
  assert.deepEqual(resolution.layeredShotIds, ['enki-at-the-helm']);
  assert.equal(resolution.scene.assetVersion, 'animation-v1');
  assert.equal(resolution.scene.shots[0]?.layers.length, 5);
  assert.equal(
    resolution.scene.shots[0]?.layers.some(
      (layer) => layer.assetId === 'shot03-enki-body-v1',
    ),
    true,
  );
  assert.equal(
    resolution.scene.shots[0]?.layers.some(
      (layer) => layer.material === 'editorial-reference',
    ),
    true,
  );
  assert.equal(resolution.scene.shots[0]?.performance[0]?.preset, 'breathing');
  assert.equal(resolution.scene.shots[0]?.performance[0]?.enabled, true);
  assert.equal(resolution.scene.shots[0]?.performance[1]?.preset, 'blinkOnce');
  assert.equal(resolution.scene.shots[0]?.performance[1]?.enabled, false);
});

test('approved layer state still requires explicit approved human review', async () => {
  const manifest = await loadManifest();
  const shot = requireShot(manifest, 'enki-at-the-helm');
  const requiredId = shot.activationPolicy.requiredLayerIds[0]!;
  const layer = shot.layers.find((candidate) => candidate.id === requiredId);
  assert.ok(layer);
  layer.state = 'approved';
  layer.review.status = 'pending';

  const result = validateAnimationAssetManifest(manifest);
  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /requires approved human review/);
});

test('Shot 4 fallback does not introduce conventional Nammu character motion', async () => {
  const manifest = await loadManifest();
  const scene = await loadScene(shotFourScenePath);
  const shot = requireShot(manifest, 'nammu-under-water');
  setRequiredLayerState(shot, 'planned');

  const resolution = resolveSceneV2Assets(scene, manifest);

  assert.equal(resolution.mode, 'fallback');
  assert.equal(
    resolution.scene.shots[0]?.performance.some(
      (item) => item.preset === 'blinkOnce',
    ),
    false,
  );
  assert.equal(
    resolution.scene.shots[0]?.performance.some(
      (item) => item.preset === 'breathing',
    ),
    false,
  );
});

test('render loader verifies the active approved Shot 3 layered assets', async () => {
  const loaded = await loadSceneV2ForRender(
    shotThreeScenePath,
    resolve('assets'),
  );

  assert.equal(loaded.assetResolution.mode, 'layered');
  assert.match(
    loaded.manifestPath ?? '',
    /animation-v1[\\/]manifest\.json$/,
  );
  assert.deepEqual(loaded.assetResolution.layeredShotIds, ['enki-at-the-helm']);
  assert.equal(
    loaded.scene.shots[0]?.layers.some(
      (layer) => layer.assetId === 'shot03-enki-body-v1',
    ),
    true,
  );
  assert.equal(
    loaded.scene.shots[0]?.layers.some(
      (layer) => layer.material === 'editorial-reference',
    ),
    true,
  );
});
