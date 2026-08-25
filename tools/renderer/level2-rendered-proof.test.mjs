import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  BLINK_CLOSE_FRACTION,
  BLINK_HOLD_END_FRACTION,
  blinkOnceOpacity,
} from '../animation/src/level2-blink-motion.mjs';

const proofPath = 'tools/scripts/shot03-level2-rendered-proof.mjs';
const benchmarkPath = 'tools/scripts/render-scene-v2-benchmark.ts';
const indexPath = 'tools/animation/src/index.tsx';
const resolvedRendererPath = 'tools/animation/src/SceneV2ResolvedBenchmark.tsx';

async function text(path) {
  return readFile(path, 'utf8');
}

test('Shot 3 Level 2 rendered proof uses the canonical resolved Scene V2 runtime', async () => {
  const [proof, benchmark, index] = await Promise.all([
    text(proofPath),
    text(benchmarkPath),
    text(indexPath),
  ]);

  assert.match(proof, /render-scene-v2-benchmark\.ts/);
  assert.match(proof, /SCENE_V2_BENCHMARK_OUTPUT_DIRECTORY/);
  assert.match(benchmark, /'SceneV2Benchmark'/);
  assert.match(index, /id="SceneV2Benchmark"/);
  assert.match(index, /component=\{SceneV2ResolvedBenchmark\}/);
});

test('rendered proof is read-only with respect to canonical animation assets', async () => {
  const proof = await text(proofPath);

  assert.match(proof, /state !== 'approved'/);
  assert.match(proof, /review\?\.status !== 'approved'/);
  assert.match(proof, /canonical checksum does not match the manifest/);
  assert.match(proof, /tmp\/animation-previews\/shot03-level2-proof/);
  assert.doesNotMatch(proof, /copyFile\(/);
  assert.doesNotMatch(proof, /rename\(/);
  assert.doesNotMatch(proof, /writeFile\(MANIFEST_PATH/);
});

test('rendered proof isolates vessel and rigging from identical same-frame controls', async () => {
  const proof = await text(proofPath);

  assert.match(proof, /vessel-frozen-props\.json/);
  assert.match(
    proof,
    /removePreset\(shot3\(vesselFrozenProps\), 'shot03-vessel-v1', 'heavyPhysical'\)/,
  );
  assert.match(proof, /rigging-frozen-props\.json/);
  assert.match(
    proof,
    /removePreset\(\s*shot3\(riggingFrozenProps\),\s*'shot03-rigging-v1',\s*'riggingTension',\s*\)/,
  );
  assert.match(proof, /same frame, camera, grade, atmosphere, lighting/);
  assert.match(
    proof,
    /existing numerical causality gate proves the 0\.24s vessel-driven lag/,
  );
});

test('rendered proof requires a persistent bounded blink and clean open-state return', async () => {
  const proof = await text(proofPath);

  assert.match(proof, /blink-disabled-props\.json/);
  assert.match(proof, /minConsecutiveActiveFrames: 3/);
  assert.match(proof, /minReadableChangedRatio: 0\.00025/);
  assert.match(proof, /maxChangedRatio: 0\.0065/);
  assert.match(proof, /returnChangedRatioMax: 0\.000001/);
  assert.match(proof, /maxConsecutiveActiveFrames/);
  assert.match(proof, /returnPass/);
  assert.match(proof, /readablePass/);
  assert.match(proof, /Multiple consecutive active frames prove persistence/);
});

test('blinkOnce runtime has a fast close, real full-opacity hold, and clean reopen', async () => {
  const renderer = await text(resolvedRendererPath);
  assert.match(renderer, /blinkOnceOpacity/);
  assert.doesNotMatch(
    renderer,
    /Math\.pow\(Math\.sin\(local \* Math\.PI\), 2\)/,
  );
  assert.ok(BLINK_CLOSE_FRACTION <= 0.25, 'Blink close must remain fast.');
  assert.ok(
    BLINK_HOLD_END_FRACTION - BLINK_CLOSE_FRACTION >= 0.45,
    'Blink must reserve a substantial middle interval for a fully closed hold.',
  );

  const durationFrames = 210;
  const startProgress = 0.46;
  const endProgress = 0.51;
  const opacities = Array.from({ length: durationFrames }, (_unused, frame) =>
    blinkOnceOpacity({
      progress: frame / (durationFrames - 1),
      startProgress,
      endProgress,
      intensity: 1,
    }),
  );
  const fullyClosedFrames = opacities
    .map((opacity, frame) => ({ opacity, frame }))
    .filter(({ opacity }) => opacity >= 0.999)
    .map(({ frame }) => frame);

  assert.ok(
    fullyClosedFrames.length >= 3,
    `Expected at least three fully opaque closed-eye frames, found ${fullyClosedFrames.length}.`,
  );
  assert.equal(
    opacities[Math.round(startProgress * (durationFrames - 1)) - 2],
    0,
  );
  assert.equal(
    opacities[Math.round(endProgress * (durationFrames - 1)) + 2],
    0,
  );
});

test('Level 1 versus Level 2 A/B remains a human preference gate', async () => {
  const proof = await text(proofPath);

  assert.match(proof, /shot03-level1-control\.mp4/);
  assert.match(proof, /shot03-level1-vs-level2-ab\.mp4/);
  assert.match(proof, /humanPreferenceRequired: true/);
  assert.match(proof, /automatedPreferenceAllowed: false/);
  assert.match(proof, /human normal-speed A\/B remains required/);
});
