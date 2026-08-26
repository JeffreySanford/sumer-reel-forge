import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSceneInspection } from '@sumer-reel-forge/animation-inspection';
import {
  compileFoundationScene,
  createFoundationRuntimeHarness,
} from './golden-fixture';

test('golden resolved Scene V3 projects into the exact-frame Animation Lab inspection model', () => {
  const result = compileFoundationScene(createFoundationRuntimeHarness().registry);
  assert.equal(result.ok, true, JSON.stringify(result.report.issues, null, 2));
  assert.ok(result.resolvedScene);

  const inspection = buildSceneInspection(result.resolvedScene, 101);

  assert.equal(inspection.header.sceneId, 'scene:ch01:r01:s03:foundation');
  assert.equal(inspection.header.sourceCount, 2);
  assert.equal(inspection.header.visualEvidenceCount, 1);
  assert.equal(inspection.header.runtimeCount, 4);
  assert.equal(inspection.header.humanReview, 'NOT_REQUIRED');
  assert.equal(inspection.exactFrame.label, 'frame 101 / 210');

  const activeProofStates = inspection.proofStates.filter((state) => state.active);
  assert.deepEqual(activeProofStates.map((state) => state.id), ['BLINK_CLOSED']);

  const actors = inspection.hierarchy.find((group) => group.id === 'actors');
  assert.ok(actors);
  assert.deepEqual(actors.nodes.map((node) => node.id), ['actor-instance:enki:s03']);

  assert.equal(inspection.historicalSources.length, 2);
  assert.equal(inspection.visualEvidence.length, 1);
  assert.equal(inspection.qaGates.length, 3);
  assert.equal(inspection.qaGates.every((gate) => gate.status === 'NOT_RUN'), true);
  assert.equal(
    inspection.diagnostics.resolvedSceneHash,
    result.resolvedScene.resolvedSceneHash,
  );
});
