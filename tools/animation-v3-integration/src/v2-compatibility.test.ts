import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  canonicalize,
  compileSceneV3,
  type SceneCompilerDependencies,
} from '@sumer-reel-forge/animation-compiler';
import {
  validateSceneV3,
  type SceneV3,
} from '@sumer-reel-forge/animation-contracts';
import type { SceneV2, SceneV2Layer } from '@sumer-reel-forge/scene-v2';
import {
  adaptSceneV2ToV3,
  SCENE_V2_COMPATIBILITY_VERSION,
  type SceneV2CompatibilityOptions,
} from './v2-compatibility';

const sourceFixtureUrl = new URL(
  '../../animation/scenes/reel-01-shot-03-benchmark.scene-v2.json',
  import.meta.url,
);

function readSourceFixture(): SceneV2 {
  return JSON.parse(
    readFileSync(fileURLToPath(sourceFixtureUrl), 'utf8'),
  ) as SceneV2;
}

function testBinding(layer: SceneV2Layer) {
  return {
    sha256: createHash('sha256')
      .update(`compatibility-test-binding:${layer.assetId}:${layer.assetPath}`)
      .digest('hex'),
    revision: 'compatibility-test-v1',
    kind: 'image' as const,
  };
}

function options(
  overrides: Partial<SceneV2CompatibilityOptions> = {},
): SceneV2CompatibilityOptions {
  return {
    sceneRevision: 1,
    sceneSeed: 31003,
    manuscriptRevision: 'original-pre-ai-manuscript',
    layeredV2RuntimeVersion: '2.0.0-compat',
    resolveAsset: (layer) => testBinding(layer),
    ...overrides,
  };
}

function runtimeReferences(scene: SceneV3) {
  return [
    ...scene.camera.map((item) => item.runtime),
    ...scene.props.map((item) => item.runtime),
  ];
}

function compilerDependencies(): SceneCompilerDependencies<SceneV3> {
  return {
    validateScene: validateSceneV3,
    resolveHistoricalSource: () => undefined,
    resolveVisualEvidence: () => undefined,
    collectRuntimeReferences: runtimeReferences,
    resolveRuntime(reference) {
      if (
        reference.runtime !== 'layered-v2' ||
        reference.runtimeVersion !== '2.0.0-compat'
      ) {
        return undefined;
      }
      return {
        id: reference.id,
        runtime: reference.runtime,
        version: reference.runtimeVersion,
        adapterVersion: 'scene-v2-compatibility:v1',
        definitionId: reference.definitionId,
        capabilities: ['2d-transform'],
      };
    },
    deriveSemanticSeeds: () => [],
  };
}

test('real Shot 3 Scene V2 adapts to valid Scene V3 without timing or source-policy drift', () => {
  const source = readSourceFixture();
  const before = JSON.stringify(source);
  const adapted = adaptSceneV2ToV3(source, options());

  assert.equal(JSON.stringify(source), before);
  assert.equal(
    adapted.compatibility.compatibilityVersion,
    SCENE_V2_COMPATIBILITY_VERSION,
  );
  assert.equal(adapted.compatibility.sourceSceneId, source.sceneId);
  assert.deepEqual(adapted.compatibility.sourceSnapshot, canonicalize(source));
  assert.deepEqual(adapted.compatibility.timings, [
    {
      shotId: 'enki-at-the-helm',
      sourceShotNumber: 3,
      sourceStartFrame: 390,
      startFrame: 0,
      durationFrames: 210,
      endFrame: 210,
    },
  ]);
  assert.equal(adapted.compatibility.warnings.length, 1);
  assert.match(adapted.compatibility.warnings[0], /defers 2 performance preset/);

  assert.equal(adapted.scene.fps, source.fps);
  assert.equal(adapted.scene.durationFrames, source.durationFrames);
  assert.equal(adapted.scene.width, source.width);
  assert.equal(adapted.scene.height, source.height);
  assert.equal(adapted.scene.qa.humanReviewRequired, true);
  assert.deepEqual(
    adapted.scene.qa.benchmarkStates.map((state) => [state.id, state.frame]),
    [
      ['v2:opening', 0],
      ['v2:quarter', 52],
      ['v2:hero', 105],
      ['v2:handoff-prep', 157],
      ['v2:end', 209],
    ],
  );

  const validation = validateSceneV3(adapted.scene);
  assert.equal(validation.valid, true, JSON.stringify(validation.issues, null, 2));
});

test('compatibility scene binds the complete V2 source hash while preserving exact camera semantics', () => {
  const source = readSourceFixture();
  const adapted = adaptSceneV2ToV3(source, options());
  const hash = adapted.compatibility.sourceSceneHash.replace(/^sha256:/, '');

  const runtimeDefinitions = new Set(
    runtimeReferences(adapted.scene).map((runtime) => runtime.definitionId),
  );
  assert.deepEqual([...runtimeDefinitions], [`compat:v2-scene:${hash}`]);

  const camera = adapted.scene.camera[0];
  assert.equal(camera.startFrame, 0);
  assert.equal(camera.endFrame, 210);
  assert.equal(camera.transform.position.type, 'expression');
  assert.equal(camera.transform.scale.type, 'expression');
  assert.equal(camera.transform.rotation.type, 'expression');
  if (
    camera.transform.position.type !== 'expression' ||
    camera.transform.scale.type !== 'expression' ||
    camera.transform.rotation.type !== 'expression'
  ) {
    throw new Error('Expected V2 compatibility camera expressions.');
  }
  assert.deepEqual(camera.transform.position.parameters, {
    preset: 'slowPush',
    easing: 'cinematicSlow',
    settleFromProgress: 0.82,
    sourceStartFrame: 0,
    sourceDurationFrames: 210,
    xFrom: 0,
    xTo: -5,
    yFrom: 0,
    yTo: -7,
    zFrom: 0,
    zTo: 0,
  });
  assert.equal(camera.transform.scale.parameters.scaleFrom, 1);
  assert.equal(camera.transform.scale.parameters.scaleTo, 1.024);
  assert.equal(camera.transform.rotation.parameters.rotationFrom, 0);
  assert.equal(camera.transform.rotation.parameters.rotationTo, 0);

  const asset = adapted.scene.assets[0];
  assert.equal(
    asset.logicalPath,
    'blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-03.png',
  );
  assert.equal(asset.revision, 'compatibility-test-v1');
  assert.equal(adapted.scene.props[0].assetId, asset.id);
  assert.deepEqual(
    adapted.scene.worldStates.map((state) => [state.startFrame, state.endFrame]),
    [[0, 210]],
  );
});

test('adapted Shot 3 compiles through the Scene V3 compiler with identical frame bounds', () => {
  const source = readSourceFixture();
  const adapted = adaptSceneV2ToV3(source, options());
  const first = compileSceneV3(adapted.scene, compilerDependencies());
  const second = compileSceneV3(
    adaptSceneV2ToV3(readSourceFixture(), options()).scene,
    compilerDependencies(),
  );

  assert.equal(first.ok, true, JSON.stringify(first.report.issues, null, 2));
  assert.equal(second.ok, true, JSON.stringify(second.report.issues, null, 2));
  assert.ok(first.resolvedScene);
  assert.ok(second.resolvedScene);
  assert.deepEqual(first.resolvedScene.frame, {
    fps: 30,
    durationFrames: 210,
    width: 1080,
    height: 1920,
  });
  assert.equal(
    first.resolvedScene.sourceSceneHash,
    second.resolvedScene.sourceSceneHash,
  );
  assert.equal(
    first.resolvedScene.resolvedSceneHash,
    second.resolvedScene.resolvedSceneHash,
  );
});

test('a valid V2 camera semantic change changes both compatibility and resolved V3 identity', () => {
  const baseline = readSourceFixture();
  const changed = readSourceFixture();
  changed.shots[0].camera.settleFromProgress = 0.8;

  const baselineAdapted = adaptSceneV2ToV3(baseline, options());
  const changedAdapted = adaptSceneV2ToV3(changed, options());
  assert.notEqual(
    baselineAdapted.compatibility.sourceSceneHash,
    changedAdapted.compatibility.sourceSceneHash,
  );

  const baselineCompiled = compileSceneV3(
    baselineAdapted.scene,
    compilerDependencies(),
  );
  const changedCompiled = compileSceneV3(
    changedAdapted.scene,
    compilerDependencies(),
  );
  assert.equal(baselineCompiled.ok, true);
  assert.equal(changedCompiled.ok, true);
  assert.ok(baselineCompiled.resolvedScene);
  assert.ok(changedCompiled.resolvedScene);
  assert.notEqual(
    baselineCompiled.resolvedScene.resolvedSceneHash,
    changedCompiled.resolvedScene.resolvedSceneHash,
  );
});

test('compatibility refuses to invent an immutable asset binding', () => {
  const source = readSourceFixture();
  assert.throws(
    () =>
      adaptSceneV2ToV3(
        source,
        options({ resolveAsset: () => undefined }),
      ),
    /has no immutable compatibility asset binding/,
  );
});

test('compatibility rejects a V2 source that permits story mutation', () => {
  const source = readSourceFixture();
  source.sourcePolicy.storyMutationAllowed = true;
  assert.throws(
    () => adaptSceneV2ToV3(source, options()),
    /Scene V2 may not mutate story text/,
  );
});
