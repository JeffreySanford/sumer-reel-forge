import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const proofPath = 'tools/scripts/shot03-level2-rendered-proof.mjs';
const benchmarkPath = 'tools/scripts/render-scene-v2-benchmark.ts';
const indexPath = 'tools/animation/src/index.tsx';

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
  assert.match(proof, /removePreset\(shot3\(vesselFrozenProps\), 'shot03-vessel-v1', 'heavyPhysical'\)/);
  assert.match(proof, /rigging-frozen-props\.json/);
  assert.match(proof, /removePreset\(shot3\(riggingFrozenProps\), 'shot03-rigging-v1', 'riggingTension'\)/);
  assert.match(proof, /same frame, camera, grade, atmosphere, lighting/);
  assert.match(proof, /existing numerical causality gate proves the 0\.24s vessel-driven lag/);
});

test('rendered proof requires a persistent bounded blink and clean open-state return', async () => {
  const proof = await text(proofPath);

  assert.match(proof, /blink-disabled-props\.json/);
  assert.match(proof, /minConsecutiveActiveFrames: 3/);
  assert.match(proof, /maxChangedRatio: 0\.0065/);
  assert.match(proof, /returnChangedRatioMax: 0\.000001/);
  assert.match(proof, /maxConsecutiveActiveFrames/);
  assert.match(proof, /returnPass/);
  assert.match(proof, /Multiple consecutive active frames prove persistence/);
});

test('Level 1 versus Level 2 A/B remains a human preference gate', async () => {
  const proof = await text(proofPath);

  assert.match(proof, /shot03-level1-control\.mp4/);
  assert.match(proof, /shot03-level1-vs-level2-ab\.mp4/);
  assert.match(proof, /humanPreferenceRequired: true/);
  assert.match(proof, /automatedPreferenceAllowed: false/);
  assert.match(proof, /human normal-speed A\/B remains required/);
});
