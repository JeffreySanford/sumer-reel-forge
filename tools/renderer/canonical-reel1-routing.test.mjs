import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const scenePaths = [
  'tools/animation/scenes/reel-01-shot-01-black-water-benchmark.scene-v2.json',
  'tools/animation/scenes/reel-01-shot-02-stag-coastline-benchmark.scene-v2.json',
  'tools/animation/scenes/reel-01-shot-03-benchmark.scene-v2.json',
  'tools/animation/scenes/reel-01-shot-04-nammu-benchmark.scene-v2.json',
  'tools/animation/scenes/reel-01-shot-05-traveler-shrine-benchmark.scene-v2.json',
  'tools/animation/scenes/reel-01-shot-06-values-benchmark.scene-v2.json',
  'tools/animation/scenes/reel-01-shot-07-dilmun-reveal-benchmark.scene-v2.json',
  'tools/animation/scenes/reel-01-shot-08-landfall-title-benchmark.scene-v2.json',
];

async function text(path) {
  return readFile(resolve(path), 'utf8');
}

async function json(path) {
  return JSON.parse(await text(path));
}

test('Reel 1 animation launcher explicitly requires the animation pipeline and canonical output', async () => {
  const source = await text('tools/scripts/render-animation-reel1.mjs');
  assert.match(source, /pipeline:\s*'animation'/);
  assert.match(source, /assertAnimationPipeline/);
  assert.match(source, /canonicalSceneV2\s*===\s*true/);
  assert.match(source, /Refusing to render or accept an editorial fallback/);
});

test('animation adapter routes production Reel 1 through canonical Scene V2 instead of procedural proof art', async () => {
  const source = await text('tools/renderer/animation-adapter.mjs');
  assert.match(source, /render-canonical-reel1-scene-v2\.ts/);
  assert.match(source, /finalize-canonical-reel1\.mjs/);
  assert.match(source, /canonicalSceneV2:\s*true/);
  assert.doesNotMatch(source, /FullReelAnimation/);
  assert.doesNotMatch(source, /render-animation-proof\.mjs/);
});

test('canonical Reel 1 assembly requires all eight approved layered Scene V2 shots and exactly 1800 frames', async () => {
  const source = await text('tools/scripts/render-canonical-reel1-scene-v2.ts');
  assert.match(source, /assetResolution\.mode !== 'layered'/);
  assert.match(source, /startFrame !== 1800/);
  assert.match(source, /'CanonicalReel1'/);
  assert.match(source, /approved-animation-v1-canonical-assets/);

  let durationFrames = 0;
  for (const [index, path] of scenePaths.entries()) {
    const scene = await json(path);
    assert.equal(scene.schemaVersion, 2);
    assert.equal(scene.shots.length, 1);
    assert.equal(scene.shots[0].sourceShotNumber, index + 1);
    assert.equal(scene.shots[0].startFrame, 0);
    durationFrames += scene.shots[0].durationFrames;
  }
  assert.equal(durationFrames, 1800);
});

test('Remotion registers a dedicated canonical Reel 1 composition', async () => {
  const indexSource = await text('tools/animation/src/index.tsx');
  const compositionSource = await text('tools/animation/src/CanonicalReel1.tsx');
  assert.match(indexSource, /id="CanonicalReel1"/);
  assert.match(indexSource, /component=\{CanonicalReel1\}/);
  assert.match(compositionSource, /SceneV2ResolvedBenchmark/);
  assert.match(compositionSource, /THE VOYAGE BEGINS/);
  assert.match(compositionSource, /BLESSINGS OF SUMER/);
});
