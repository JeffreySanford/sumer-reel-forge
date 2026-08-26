import {
  compileSceneV3,
  sha256Canonical,
  type CompilerValidationResult,
  type ResolvedRuntimeBinding,
  type RuntimeReferenceLike,
  type SceneCompilerDependencies,
} from '@sumer-reel-forge/animation-compiler';
import {
  validateSceneV3,
  type RuntimeReference,
  type SceneV3,
  type TransformDefinition,
} from '@sumer-reel-forge/animation-contracts';
import { deriveSemanticSeed } from '@sumer-reel-forge/animation-frame';
import {
  AnimationRuntimeRegistry,
  FakeRuntimeAdapter,
  type RuntimeCapability,
  type RuntimeType,
} from '@sumer-reel-forge/animation-runtime';
import {
  getKnownHistoricalSource,
  getVisualEvidence,
} from '@sumer-reel-forge/historical-sources';

export const FOUNDATION_FIXTURE_ID =
  'fixture:scene-v3:enki-helm-foundation:v1' as const;

export const FOUNDATION_ASSET_SHA256 = {
  'asset:fixture:enki-source':
    'ec7481978bafe143f7c711d86e6b56c8feb762527580f1c90a4322fb0b418ea3',
  'asset:fixture:enki-runtime':
    '80c33e45ac76862fab972793a4d30fbe63dd39f78ba8415723d9fa9172ecdf51',
  'asset:fixture:stag-runtime':
    '4985c805d42d36ab07cf6c9f77edcc65960bc2f7ef13797f914479e311f32f04',
} as const;

function constantVec3(x: number, y: number, z: number) {
  return { type: 'constant' as const, value: { x, y, z } };
}

function transform(
  x = 0,
  y = 0,
  z = 0,
  parentId?: string,
): TransformDefinition {
  return {
    position: constantVec3(x, y, z),
    rotation: constantVec3(0, 0, 0),
    scale: constantVec3(1, 1, 1),
    ...(parentId ? { parentId } : {}),
  };
}

function fakeRuntime(id: string, definitionId: string): RuntimeReference {
  return {
    id,
    runtime: 'fake',
    runtimeVersion: '1.0.0',
    definitionId,
  };
}

export const ENKI_HELM_FOUNDATION_SCENE: SceneV3 = {
  schemaVersion: '3',
  id: 'scene:ch01:r01:s03:foundation',
  revision: 1,
  title: 'Enki at the Helm — Scene V3 Foundation Fixture',
  story: {
    projectId: 'project:blessings-of-sumer',
    chapterId: 'chapter:01',
    reelId: 'reel:01',
    shotId: 'shot:03',
    manuscriptRevision: 'original-pre-ai-manuscript',
    narrativeThreadIds: ['ch1-eridu-nibru', 'ch1-world-order-canals'],
  },
  historicalSourceIds: ['etcsl-1.1.4', 'etcsl-1.1.3'],
  visualEvidenceIds: ['visual:bm:standard-of-ur:1928-1010-3:v1'],
  assets: [
    {
      id: 'asset:fixture:stag-runtime',
      kind: 'data',
      logicalPath:
        'tools\\animation-v3-integration\\fixtures\\stag-runtime.fixture.json',
      sha256: FOUNDATION_ASSET_SHA256['asset:fixture:stag-runtime'],
      revision: 'v1',
    },
    {
      id: 'asset:fixture:enki-source',
      kind: 'data',
      logicalPath:
        'tools/animation-v3-integration/fixtures/enki-source.fixture.json',
      sha256: FOUNDATION_ASSET_SHA256['asset:fixture:enki-source'],
      revision: 'v1',
    },
    {
      id: 'asset:fixture:enki-runtime',
      kind: 'data',
      logicalPath:
        './tools/animation-v3-integration/fixtures/enki-runtime.fixture.json',
      sha256: FOUNDATION_ASSET_SHA256['asset:fixture:enki-runtime'],
      revision: 'v1',
      sourceAssetIds: ['asset:fixture:enki-source'],
    },
  ],
  fps: 30,
  durationFrames: 210,
  width: 1080,
  height: 1920,
  seed: 31003,
  camera: [
    {
      id: 'camera:main',
      runtime: fakeRuntime(
        'runtime:fake:camera',
        'runtime-def:camera:foundation',
      ),
      startFrame: 0,
      endFrame: 210,
      transform: transform(),
      projection: 'orthographic',
    },
  ],
  actors: [
    {
      id: 'actor-instance:enki:s03',
      actorDefinitionId: 'actor:enki',
      runtime: fakeRuntime(
        'runtime:fake:actor',
        'runtime-def:enki:foundation',
      ),
      rigAssetId: 'asset:fixture:enki-runtime',
      sourceAssetIds: ['asset:fixture:enki-source'],
      transform: transform(0, 0, 2, 'prop:stag-of-absu'),
      depthMode: '2d',
    },
  ],
  props: [
    {
      id: 'prop:stag-of-absu',
      definitionId: 'prop-definition:stag-of-absu',
      runtime: fakeRuntime(
        'runtime:fake:prop',
        'runtime-def:stag:foundation',
      ),
      assetId: 'asset:fixture:stag-runtime',
      transform: transform(),
    },
  ],
  environments: [
    {
      id: 'environment:gulf-water',
      definitionId: 'environment-definition:gulf-water',
      runtime: fakeRuntime(
        'runtime:fake:environment',
        'runtime-def:gulf-water:foundation',
      ),
    },
  ],
  performances: [
    {
      id: 'performance:enki:breath',
      actorId: 'actor-instance:enki:s03',
      channel: 'body.breath',
      clipId: 'clip:enki:breathe-calm:v1',
      startFrame: 0,
      endFrame: 210,
      blendMode: 'additive',
    },
    {
      id: 'performance:enki:blink',
      actorId: 'actor-instance:enki:s03',
      channel: 'face.blink',
      clipId: 'clip:enki:blink-natural:v1',
      startFrame: 92,
      endFrame: 112,
      blendMode: 'weighted',
    },
  ],
  materials: [],
  effects: [],
  simulations: [],
  crowds: [],
  herds: [],
  worldStates: [],
  qa: {
    requiredInvariants: [
      {
        id: 'qa:identity:enki',
        category: 'identity',
        description: 'Enki identity remains bound to the source fixture.',
        blocking: true,
      },
      {
        id: 'qa:provenance:enki',
        category: 'historical-provenance',
        description: 'ETCSL and museum evidence resolve explicitly.',
        blocking: true,
      },
      {
        id: 'qa:motion:frame-authority',
        category: 'motion',
        description: 'Runtime evaluation uses the shared integer FrameContext.',
        blocking: true,
      },
    ],
    benchmarkStates: [
      { id: 'START', frame: 0, description: 'Fixture start.' },
      {
        id: 'BLINK_CLOSED',
        frame: 101,
        description: 'Named foundation proof state.',
      },
      { id: 'END_SETTLED', frame: 209, description: 'Last included frame.' },
    ],
    semanticActionIds: ['action:enki:breath', 'action:enki:blink'],
    renderProofIds: [],
    humanReviewRequired: false,
  },
};

export interface FoundationRuntimeHarness {
  readonly registry: AnimationRuntimeRegistry;
  readonly adapter: FakeRuntimeAdapter;
}

export function createFoundationRuntimeHarness(): FoundationRuntimeHarness {
  const registry = new AnimationRuntimeRegistry();
  const adapter = new FakeRuntimeAdapter();
  registry.register(adapter);
  return { registry, adapter };
}

function runtimeReferences(scene: SceneV3): readonly RuntimeReferenceLike[] {
  return [
    ...scene.camera.map((item) => item.runtime),
    ...scene.actors.map((item) => item.runtime),
    ...scene.props.map((item) => item.runtime),
    ...scene.environments.map((item) => item.runtime),
    ...scene.materials.map((item) => item.runtime),
    ...scene.effects.map((item) => item.runtime),
  ];
}

function capabilityRequirements(
  scene: SceneV3,
): readonly {
  ownerId: string;
  runtime: RuntimeReference;
  capabilities: readonly RuntimeCapability[];
}[] {
  return [
    ...scene.camera.map((item) => ({
      ownerId: item.id,
      runtime: item.runtime,
      capabilities: ['2d-transform'] as const,
    })),
    ...scene.actors.map((item) => ({
      ownerId: item.id,
      runtime: item.runtime,
      capabilities: ['2d-transform'] as const,
    })),
    ...scene.props.map((item) => ({
      ownerId: item.id,
      runtime: item.runtime,
      capabilities: ['2d-transform'] as const,
    })),
    ...scene.environments.map((item) => ({
      ownerId: item.id,
      runtime: item.runtime,
      capabilities: ['world-state'] as const,
    })),
  ];
}

export function createFoundationCompilerDependencies(
  registry: AnimationRuntimeRegistry,
): SceneCompilerDependencies<SceneV3> {
  return {
    validateScene(scene) {
      return validateSceneV3(scene);
    },
    resolveHistoricalSource(id) {
      const source = getKnownHistoricalSource(id);
      if (!source) return undefined;
      return {
        id: source.id,
        recordRevision: 'v1',
        recordHash: sha256Canonical(source),
        adaptation: source.adaptation,
        confidence: source.confidence,
      };
    },
    resolveVisualEvidence(id) {
      const evidence = getVisualEvidence(id);
      if (!evidence) return undefined;
      return {
        id: evidence.id,
        recordRevision: evidence.revision,
        recordHash: sha256Canonical(evidence),
        rightsMode: evidence.rightsStatus,
        confidence: evidence.confidence,
      };
    },
    collectRuntimeReferences(scene) {
      return runtimeReferences(scene);
    },
    resolveRuntime(reference): ResolvedRuntimeBinding | undefined {
      const adapter = registry.resolve({
        type: reference.runtime as RuntimeType,
        version: reference.runtimeVersion,
      });
      if (!adapter) return undefined;
      return {
        id: reference.id,
        runtime: adapter.type,
        version: adapter.version,
        adapterVersion: '1.0.0',
        definitionId: reference.definitionId,
        capabilities: adapter.capabilities,
      };
    },
    validateCapabilities(scene): CompilerValidationResult {
      const issues = capabilityRequirements(scene).flatMap((requirement) => {
        const result = registry.validateRequirement({
          ownerId: requirement.ownerId,
          type: requirement.runtime.runtime,
          version: requirement.runtime.runtimeVersion,
          capabilities: requirement.capabilities,
        });
        return result.issues;
      });
      return {
        valid: !issues.some((issue) => issue.severity === 'error'),
        issues,
      };
    },
    deriveSemanticSeeds(scene) {
      const inputs = [
        {
          targetId: 'actor-instance:enki:s03',
          channel: 'body.breath',
          purpose: 'phase',
        },
        {
          targetId: 'actor-instance:enki:s03',
          channel: 'face.blink',
          purpose: 'timing',
        },
        {
          targetId: 'prop:stag-of-absu',
          channel: 'transform.travel',
          purpose: 'phase',
        },
      ] as const;
      return inputs.map((input) => ({
        ...input,
        algorithmVersion: 1,
        value: deriveSemanticSeed({
          sceneSeed: scene.seed,
          sceneId: scene.id,
          ...input,
          version: 1,
        }),
      }));
    },
  };
}

export function compileFoundationScene(registry: AnimationRuntimeRegistry) {
  return compileSceneV3(
    ENKI_HELM_FOUNDATION_SCENE,
    createFoundationCompilerDependencies(registry),
  );
}
