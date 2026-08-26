import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  createFrameContext,
} from '@sumer-reel-forge/animation-frame';
import type { FakeRuntimeDefinition } from '@sumer-reel-forge/animation-runtime';
import {
  ENKI_HELM_FOUNDATION_SCENE,
  FOUNDATION_ASSET_SHA256,
  FOUNDATION_FIXTURE_ID,
  compileFoundationScene,
  createFoundationRuntimeHarness,
} from './golden-fixture';

const fixtureUrl = (name: string) =>
  new URL(`../fixtures/${name}`, import.meta.url);

function sha256File(name: string): string {
  return createHash('sha256')
    .update(readFileSync(fileURLToPath(fixtureUrl(name))))
    .digest('hex');
}

function readJson<T>(name: string): T {
  return JSON.parse(
    readFileSync(fileURLToPath(fixtureUrl(name)), 'utf8'),
  ) as T;
}

function assetChecksums(
  assets: readonly { id: string; contentHash: string }[],
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    assets.map((asset) => [asset.id, asset.contentHash]),
  );
}

test('fixture asset references are bound to the repository bytes', () => {
  assert.equal(
    sha256File('enki-source.fixture.json'),
    FOUNDATION_ASSET_SHA256['asset:fixture:enki-source'],
  );
  assert.equal(
    sha256File('enki-runtime.fixture.json'),
    FOUNDATION_ASSET_SHA256['asset:fixture:enki-runtime'],
  );
  assert.equal(
    sha256File('stag-runtime.fixture.json'),
    FOUNDATION_ASSET_SHA256['asset:fixture:stag-runtime'],
  );
});

test('real SceneV3 compiles through provenance, runtime and seed resolution to the pinned receipt', async () => {
  const harness = createFoundationRuntimeHarness();
  const result = compileFoundationScene(harness.registry);

  assert.equal(result.ok, true);
  assert.equal(result.report.status, 'PASS');
  assert.deepEqual(result.report.issues, []);
  assert.ok(result.resolvedScene);

  const resolved = result.resolvedScene;
  assert.equal(
    resolved.sourceSceneHash,
    'sha256:c2a675b2373dd586436be4976b56682ee0455fc29d2b3227b045fa68e7a04948',
  );
  assert.equal(
    resolved.resolvedSceneHash,
    'sha256:45abb40d06397aefc1853ad0ec8debb36024ba6f15af55a38414dac8c49f4f82',
  );

  const blinkState = ENKI_HELM_FOUNDATION_SCENE.qa.benchmarkStates.find(
    (state) => state.id === 'BLINK_CLOSED',
  );
  assert.ok(blinkState);

  const definition = readJson<FakeRuntimeDefinition>(
    'enki-runtime.fixture.json',
  );
  const prepared = await harness.adapter.prepare(definition, {
    sceneId: resolved.sourceSceneId,
    sceneRevision: resolved.sourceSceneRevision,
    sceneSeed: ENKI_HELM_FOUNDATION_SCENE.seed,
    mode: 'qa',
    assetChecksums: assetChecksums(resolved.assets),
  });
  const frame = createFrameContext({
    frame: blinkState.frame,
    fps: resolved.frame.fps,
    durationFrames: resolved.frame.durationFrames,
    sceneId: resolved.sourceSceneId,
    shotId: ENKI_HELM_FOUNDATION_SCENE.story.shotId,
    sceneSeed: ENKI_HELM_FOUNDATION_SCENE.seed,
    mode: 'qa',
  });
  const runtimeState = harness.adapter.evaluate(prepared, frame);
  const runtimeEvidence = harness.adapter.collectEvidence(prepared, frame);

  assert.equal(runtimeState.proofState, 'BLINK_CLOSED');
  assert.deepEqual(runtimeState.values, {
    x: 1.01,
    y: 0,
    opacity: 1,
  });
  assert.deepEqual(runtimeEvidence.values, runtimeState.values);

  const actualReceipt = {
    receiptVersion: 1,
    receiptType: 'SCENE_V3_FOUNDATION',
    fixtureId: FOUNDATION_FIXTURE_ID,
    canonicalFormVersion: resolved.canonicalFormVersion,
    hashAlgorithm: resolved.hashAlgorithm,
    sourceSceneId: resolved.sourceSceneId,
    sourceSceneRevision: resolved.sourceSceneRevision,
    sourceSceneHash: resolved.sourceSceneHash,
    resolvedSceneHash: resolved.resolvedSceneHash,
    historicalSources: resolved.historicalSources.map((source) => ({
      id: source.id,
      recordRevision: source.recordRevision,
      recordHash: source.recordHash,
    })),
    visualEvidence: resolved.visualEvidence.map((evidence) => ({
      id: evidence.id,
      recordRevision: evidence.recordRevision,
      recordHash: evidence.recordHash,
      rightsMode: evidence.rightsMode,
    })),
    runtimes: resolved.runtimes.map((runtime) => ({
      id: runtime.id,
      runtime: runtime.runtime,
      version: runtime.version,
      adapterVersion: runtime.adapterVersion,
    })),
    semanticSeeds: resolved.semanticSeeds,
    proofFrame: {
      id: blinkState.id,
      frame: blinkState.frame,
      runtimeType: runtimeEvidence.runtimeType,
      runtimeVersion: runtimeEvidence.runtimeVersion,
      definitionId: runtimeEvidence.definitionId,
      proofState: runtimeState.proofState,
      values: runtimeState.values,
    },
    compilerStatus: result.report.status,
    compilerIssueCodes: result.report.issues.map((issue) => issue.code),
  };

  assert.deepEqual(
    actualReceipt,
    readJson('enki-helm-foundation.expected.json'),
  );

  harness.adapter.dispose(prepared);
  assert.equal(harness.adapter.wasDisposed(definition.id), true);
});

test('fresh registries and repeated compilation preserve the same resolved identity', () => {
  const first = compileFoundationScene(createFoundationRuntimeHarness().registry);
  const second = compileFoundationScene(createFoundationRuntimeHarness().registry);

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.ok(first.resolvedScene);
  assert.ok(second.resolvedScene);
  assert.equal(
    first.resolvedScene.sourceSceneHash,
    second.resolvedScene.sourceSceneHash,
  );
  assert.equal(
    first.resolvedScene.resolvedSceneHash,
    second.resolvedScene.resolvedSceneHash,
  );
  assert.deepEqual(
    first.resolvedScene.semanticSeeds,
    second.resolvedScene.semanticSeeds,
  );
});
