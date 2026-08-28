import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { resolve } from 'node:path';

const baselinePath = resolve(
  'tools/animation/scenes/reel-01-shot-01-black-water-benchmark.scene-v2.json',
);
const candidatePath = resolve(
  'tools/animation/scenes/reel-01-shot-01-black-water-level2.scene-v2.json',
);
const manifestPath = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const rendererPath = resolve('tools/animation/src/SceneV2Benchmark.tsx');

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

test('Shot 1 Level 2 candidate preserves the exact approved source while adding three runtime-backed environmental improvements', async () => {
  const [baseline, candidate, manifest, rendererSource] = await Promise.all([
    readJson(baselinePath),
    readJson(candidatePath),
    readJson(manifestPath),
    readFile(rendererPath, 'utf8'),
  ]);

  const baselineShot = baseline.shots[0];
  const candidateShot = candidate.shots[0];
  const canonicalShot = manifest.shots.find((shot) => shot.sourceShotNumber === 1);

  assert.equal(candidate.schemaVersion, 2);
  assert.equal(candidateShot.sourceShotNumber, 1);
  assert.equal(candidateShot.id, baselineShot.id);
  assert.equal(candidateShot.durationFrames, baselineShot.durationFrames);
  assert.equal(candidate.fps, baseline.fps);

  assert.equal(candidateShot.layers.length, 1);
  assert.equal(candidateShot.layers[0].assetPath, baselineShot.layers[0].assetPath);
  assert.deepEqual(candidateShot.layers[0].transform, baselineShot.layers[0].transform);
  assert.deepEqual(candidateShot.layers[0].motionPresets, []);
  assert.deepEqual(candidateShot.performance, []);

  assert.equal(candidateShot.camera.rotationFrom, 0);
  assert.equal(candidateShot.camera.rotationTo, 0);
  assert.ok(candidateShot.camera.scaleTo - candidateShot.camera.scaleFrom <= 0.02);
  assert.ok(Math.abs(candidateShot.camera.yTo - candidateShot.camera.yFrom) <= 4);

  const atmospherePresets = new Set(candidateShot.atmosphere.map((item) => item.preset));
  const lightingPresets = new Set(candidateShot.lighting.map((item) => item.preset));
  assert.equal(atmospherePresets.has('mistDrift'), true);
  assert.equal(lightingPresets.has('waterPulse'), true);

  const waterPulseRuntimeUses = rendererSource.match(/preset === 'waterPulse'/g) ?? [];
  assert.ok(
    waterPulseRuntimeUses.length >= 2,
    'waterPulse must drive both surface reflection and separate reflected-light runtime contributions',
  );
  assert.match(rendererSource, /function WaterReflection/);
  assert.match(rendererSource, /function ReflectedLight/);
  assert.match(rendererSource, /preset === 'mistDrift'/);
  assert.match(rendererSource, /function Atmosphere/);

  const newLevel2Improvements = [
    lightingPresets.has('waterPulse') && rendererSource.includes('function WaterReflection')
      ? 'black-water-surface-shimmer'
      : null,
    lightingPresets.has('waterPulse') && rendererSource.includes('function ReflectedLight')
      ? 'dawn-reflected-light-pulse'
      : null,
    atmospherePresets.has('mistDrift') && rendererSource.includes('function Atmosphere')
      ? 'dawn-mist-drift'
      : null,
  ].filter(Boolean);
  assert.deepEqual(newLevel2Improvements, [
    'black-water-surface-shimmer',
    'dawn-reflected-light-pulse',
    'dawn-mist-drift',
  ]);

  assert.equal(candidate.reviewPolicy.humanApprovalRequired, true);
  assert.equal(candidate.reviewPolicy.hardFailsBlockApproval, true);
  assert.equal(candidate.sourcePolicy.storyMutationAllowed, false);

  assert.ok(canonicalShot, 'Shot 1 must remain present in animation-v1');
  assert.deepEqual(canonicalShot.activationPolicy.requiredLayerIds, ['shot01-editorial-source-v1']);
  assert.equal(canonicalShot.layers.length, 1);
  assert.equal(canonicalShot.layers[0].path, candidateShot.layers[0].assetPath);
  assert.deepEqual(canonicalShot.layers[0].motionPresets, []);
  assert.equal(canonicalShot.layers[0].review.status, 'approved');
});

test('Shot 1 candidate stays restrained enough to preserve primordial stillness', async () => {
  const candidate = await readJson(candidatePath);
  const shot = candidate.shots[0];
  const mist = shot.atmosphere.find((item) => item.preset === 'mistDrift');
  const water = shot.lighting.find((item) => item.preset === 'waterPulse');

  assert.ok(mist.intensity > 0 && mist.intensity <= 0.1);
  assert.ok(water.intensityFrom >= 0 && water.intensityFrom <= 0.05);
  assert.ok(water.intensityTo > water.intensityFrom && water.intensityTo <= 0.08);
  assert.ok(shot.camera.settleFromProgress >= 0.85);
  assert.match(shot.emotionalPurpose, /primordial stillness/i);
  assert.match(shot.emotionalPurpose, /three independently reviewable environmental improvements/i);
});
