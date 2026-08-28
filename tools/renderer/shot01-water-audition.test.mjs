import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { resolve } from 'node:path';

const candidateScenePath = resolve(
  'tools/animation/scenes/reel-01-shot-01-black-water-level2.scene-v2.json',
);
const sceneTypePath = resolve('tools/animation/src/scene-v2.ts');
const benchmarkPath = resolve('tools/animation/src/SceneV2Benchmark.tsx');
const waterRuntimePath = resolve('tools/animation/src/scene-v2-water-surface.tsx');
const auditionServicePath = resolve(
  'apps/api/src/app/forge/forge-shot01-water-audition.service.ts',
);
const forgeLabPath = resolve('apps/animation-lab/src/app/forge-lab.tsx');
const waterLabPath = resolve('apps/animation-lab/src/app/shot01-water-lab.tsx');

test('Shot 1 Forge water audition is runtime-backed, source-only, and non-canonical', async () => {
  const [
    candidateScene,
    sceneTypeSource,
    benchmarkSource,
    waterRuntimeSource,
    serviceSource,
    forgeLabSource,
    waterLabSource,
  ] = await Promise.all([
    readFile(candidateScenePath, 'utf8').then(JSON.parse),
    readFile(sceneTypePath, 'utf8'),
    readFile(benchmarkPath, 'utf8'),
    readFile(waterRuntimePath, 'utf8'),
    readFile(auditionServicePath, 'utf8'),
    readFile(forgeLabPath, 'utf8'),
    readFile(waterLabPath, 'utf8'),
  ]);

  assert.equal(candidateScene.shots[0].waterSurface, undefined);
  assert.match(sceneTypeSource, /export interface SceneV2WaterSurface/);
  for (const channel of [
    'horizontalCurrent',
    'verticalRipple',
    'flowSpeed',
    'rippleScale',
  ]) {
    assert.match(sceneTypeSource, new RegExp(`${channel}: number`));
    assert.match(serviceSource, new RegExp(`'${channel}'`));
    assert.match(waterLabSource, new RegExp(`${channel}`));
  }

  assert.match(benchmarkSource, /SceneV2WaterSurfaceMotion/);
  assert.match(waterRuntimeSource, /src=\{baseAsset\}/);
  assert.match(waterRuntimeSource, /feathered horizontal bands/i);
  assert.doesNotMatch(waterRuntimeSource, /fetch\(/);
  assert.doesNotMatch(waterRuntimeSource, /https?:\/\//);

  assert.match(serviceSource, /black-water-level2\.scene-v2\.json/);
  assert.match(serviceSource, /tmp[',\s]+['"]forge-water-auditions/);
  assert.match(serviceSource, /SCENE_V2_BENCHMARK_OUTPUT_DIRECTORY/);
  assert.match(serviceSource, /storyMutationAllowed !== false/);
  assert.match(serviceSource, /humanApprovalRequired !== true/);
  assert.match(serviceSource, /layers\.length !== 1/);

  assert.match(forgeLabSource, /\[1, 3, 4\]/);
  assert.match(forgeLabSource, /<Shot01WaterLab \/>/);
  assert.match(waterLabSource, /Render water audition/);
  assert.match(waterLabSource, /rendered-non-canonical-audition/);
  assert.match(waterLabSource, /same Scene V2\/Remotion pipeline/i);
});
