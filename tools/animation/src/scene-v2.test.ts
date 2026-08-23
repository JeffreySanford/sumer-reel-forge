import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  validateSceneV2,
  type SceneV2,
} from './scene-v2';

const scenePath = resolve(
  'tools/animation/scenes/reel-01-shot-03-benchmark.scene-v2.json',
);

async function loadScene(): Promise<SceneV2> {
  return JSON.parse(await readFile(scenePath, 'utf8')) as SceneV2;
}

test('Shot 3 benchmark Scene V2 passes deterministic policy', async () => {
  const scene = await loadScene();
  const result = validateSceneV2(scene);

  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(scene.shots[0]?.camera.scaleTo, 1.024);
  assert.match(result.warnings.join('\n'), /defers 2 performance preset/);
});

test('Shot 3 benchmark rejects camera movement above 3 percent', async () => {
  const scene = await loadScene();
  scene.shots[0]!.camera.scaleTo = 1.04;
  const result = validateSceneV2(scene);

  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /camera scale delta 4\.00% exceeds 3%/);
});

test('Scene V2 cannot waive human approval', async () => {
  const scene = await loadScene();
  scene.reviewPolicy.humanApprovalRequired = false;
  const result = validateSceneV2(scene);

  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /requires human approval/);
});

test('Scene V2 cannot mutate story text', async () => {
  const scene = await loadScene();
  scene.sourcePolicy.storyMutationAllowed = true;
  const result = validateSceneV2(scene);

  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /may not mutate story text/);
});
