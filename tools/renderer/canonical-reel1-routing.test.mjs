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

test('canonical Reel 1 preserves eight approved shot timings plus one explicit 30-frame Shot 5 to 6 handoff', async () => {
  const source = await text('tools/scripts/render-canonical-reel1-scene-v2.ts');
  const compositionSource = await text('tools/animation/src/CanonicalReel1.tsx');
  assert.match(source, /assetResolution\.mode !== 'layered'/);
  assert.match(source, /approvedAnimationFrames \+ handoffHoldFrames !== REEL_DURATION_FRAMES/);
  assert.match(source, /afterShotNumber:\s*5/);
  assert.match(source, /durationFrames:\s*30/);
  assert.match(source, /'CanonicalReel1'/);
  assert.match(source, /approved-animation-v1-canonical-assets/);
  assert.match(compositionSource, /<Freeze frame=\{approvedDurationFrames - 1\}>/);
  assert.match(compositionSource, /Only the explicit 30-frame Shot 5→6 handoff is allowed/);

  const scenes = [];
  let approvedDurationFrames = 0;
  for (const [index, path] of scenePaths.entries()) {
    const scene = await json(path);
    assert.equal(scene.schemaVersion, 2);
    assert.equal(scene.shots.length, 1);
    assert.equal(scene.shots[0].sourceShotNumber, index + 1);
    assert.equal(scene.shots[0].startFrame, 0);
    assert.equal(typeof scene.shots[0].sourceStartFrame, 'number');
    approvedDurationFrames += scene.shots[0].durationFrames;
    scenes.push(scene);
  }
  assert.equal(approvedDurationFrames, 1770);

  const holds = [];
  for (const [index, scene] of scenes.entries()) {
    const shot = scene.shots[0];
    const nextStartFrame =
      index + 1 < scenes.length
        ? scenes[index + 1].shots[0].sourceStartFrame
        : 1800;
    const slotDurationFrames = nextStartFrame - shot.sourceStartFrame;
    const holdFrames = slotDurationFrames - shot.durationFrames;
    assert.ok(slotDurationFrames >= shot.durationFrames);
    if (holdFrames > 0) {
      holds.push({ sourceShotNumber: shot.sourceShotNumber, holdFrames });
    }
  }
  assert.deepEqual(holds, [{ sourceShotNumber: 5, holdFrames: 30 }]);
  assert.equal(approvedDurationFrames + holds[0].holdFrames, 1800);
});

test('canonical Reel 1 assembler is safe under tsx CommonJS transform and has no top-level await', async () => {
  const source = await text('tools/scripts/render-canonical-reel1-scene-v2.ts');
  assert.match(source, /async function main\(\)/);
  assert.match(source, /main\(\)\.catch/);
  assert.doesNotMatch(source, /^await\s/m);
});

test('Remotion registers a dedicated canonical Reel 1 composition', async () => {
  const indexSource = await text('tools/animation/src/index.tsx');
  const compositionSource = await text('tools/animation/src/CanonicalReel1.tsx');
  assert.match(indexSource, /id="CanonicalReel1"/);
  assert.match(indexSource, /component=\{CanonicalReel1\}/);
  assert.match(indexSource, /emptyCanonicalReel1Props/);
  assert.match(compositionSource, /SceneV2ResolvedBenchmark/);
  assert.match(compositionSource, /THE VOYAGE BEGINS/);
  assert.match(compositionSource, /BLESSINGS OF SUMER/);
});
