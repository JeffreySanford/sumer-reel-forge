import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const scenePath = (shot, slug) =>
  resolve(`tools/animation/scenes/reel-01-shot-${shot}-${slug}-benchmark.scene-v2.json`);
const contractPath = (shot) =>
  resolve(`tools/animation/shot-contracts/reel-01-shot-${shot}.json`);
const manifestPath = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

test('Shot 6 is a restrained practical-values montage, not a floating icon effect', async () => {
  const scene = await readJson(scenePath('06', 'values'));
  const contract = await readJson(contractPath('06'));
  const shot = scene.shots[0];

  assert.equal(scene.schemaVersion, 2);
  assert.equal(shot.id, 'water-bread-truth-justice-freedom');
  assert.equal(shot.sourceShotNumber, 6);
  assert.equal(shot.durationFrames, 240);
  assert.equal(shot.camera.preset, 'slowPush');
  assert.equal(shot.camera.scaleTo, 1.018);
  assert.deepEqual(shot.performance, []);
  assert.deepEqual(contract.shot.activationPolicy.requiredLayerIds, [
    'shot06-values-base-v1',
    'shot06-practical-symbols-v1',
  ]);
  const symbols = contract.shot.layers.find(
    (layer) => layer.id === 'shot06-practical-symbols-v1',
  );
  assert.ok(symbols);
  assert.match(symbols.review.notes.join('\n'), /restrained parallax/i);
  assert.match(symbols.review.notes.join('\n'), /floating icon carousel/i);
});

test('Shot 7 makes Dilmun an environmental reveal without character performance', async () => {
  const scene = await readJson(scenePath('07', 'dilmun-reveal'));
  const contract = await readJson(contractPath('07'));
  const shot = scene.shots[0];

  assert.equal(scene.schemaVersion, 2);
  assert.equal(shot.id, 'dilmun-reveal');
  assert.equal(shot.sourceShotNumber, 7);
  assert.equal(shot.durationFrames, 270);
  assert.equal(shot.camera.preset, 'riseReveal');
  assert.equal(shot.camera.rotationTo, 0);
  assert.deepEqual(shot.performance, []);
  assert.equal(shot.atmosphere[0]?.preset, 'mistDrift');
  assert.deepEqual(contract.shot.activationPolicy.requiredLayerIds, [
    'shot07-dilmun-base-v1',
  ]);
  assert.match(
    contract.shot.layers[0]?.review?.notes?.join('\n') ?? '',
    /camera movement and atmosphere/i,
  );
});

test('Shot 8 defers boat motion until the isolated boat exists and keeps title text deterministic', async () => {
  const scene = await readJson(scenePath('08', 'landfall-title'));
  const contract = await readJson(contractPath('08'));
  const shot = scene.shots[0];

  assert.equal(scene.schemaVersion, 2);
  assert.equal(shot.id, 'boat-approaches-land-title');
  assert.equal(shot.sourceShotNumber, 8);
  assert.equal(shot.durationFrames, 210);
  assert.equal(shot.camera.preset, 'slowPush');
  assert.equal(shot.transitionOut, 'reel-end-title-fade');
  assert.equal(shot.performance[0]?.preset, 'boatBob');
  assert.equal(shot.performance[0]?.enabled, false);
  assert.equal(shot.performance[0]?.deferredUntilAssetId, 'shot08-boat-v1');
  assert.deepEqual(contract.shot.activationPolicy.requiredLayerIds, [
    'shot08-landfall-base-v1',
    'shot08-boat-v1',
  ]);
  assert.equal(contract.shot.titlePolicy.rasterizeIntoCandidateAssets, false);
  assert.equal(contract.shot.titlePolicy.motion, 'stable-fade');
});

test('Shots 6 through 8 are admitted to animation-v1 as draft planned work without fake assets or approval', async () => {
  const manifest = await readJson(manifestPath);

  for (const shotNumber of [6, 7, 8]) {
    const label = String(shotNumber).padStart(2, '0');
    const contract = await readJson(contractPath(label));
    const manifestShot = manifest.shots.find(
      (shot) => shot.sourceShotNumber === shotNumber,
    );

    assert.ok(manifestShot, `animation-v1 must include Shot ${shotNumber}.`);
    assert.equal(manifestShot.status, 'draft');
    assert.equal(manifestShot.shotId, contract.shot.shotId);
    assert.equal(manifestShot.sourceFrame, contract.shot.sourceFrame);
    assert.deepEqual(
      manifestShot.activationPolicy.requiredLayerIds,
      contract.shot.activationPolicy.requiredLayerIds,
    );
    assert.deepEqual(
      manifestShot.layers.map((layer) => layer.id),
      contract.shot.layers.map((layer) => layer.id),
    );

    for (const layer of manifestShot.layers) {
      assert.equal(layer.state, 'planned');
      assert.equal(layer.review?.status, 'pending');
      assert.equal(layer.sha256, undefined);
    }
  }
});
