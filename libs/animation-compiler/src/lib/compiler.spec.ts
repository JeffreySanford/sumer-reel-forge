import { compileSceneV3 } from './compiler';
import type {
  RuntimeReferenceLike,
  SceneCompilerDependencies,
  SceneCompilerInput,
} from './types';

interface TestScene extends SceneCompilerInput {
  readonly runtimeReferences: readonly RuntimeReferenceLike[];
  readonly performances: readonly { id: string; frame: number }[];
}

const HASH_A = `sha256:${'a'.repeat(64)}`;
const HASH_B = `sha256:${'b'.repeat(64)}`;
const HASH_C = `sha256:${'c'.repeat(64)}`;
const HASH_D = `sha256:${'d'.repeat(64)}`;

function scene(overrides: Partial<TestScene> = {}): TestScene {
  return {
    schemaVersion: '3',
    id: 'scene:test:compiler',
    revision: 1,
    fps: 30,
    durationFrames: 90,
    width: 1080,
    height: 1920,
    seed: 12345,
    historicalSourceIds: ['source:b', 'source:a'],
    visualEvidenceIds: ['evidence:b', 'evidence:a'],
    assets: [
      {
        id: 'asset:b',
        kind: 'image',
        logicalPath: 'assets\\boat.png',
        sha256: HASH_B,
        revision: '1',
      },
      {
        id: 'asset:a',
        kind: 'rig',
        logicalPath: '.\\actors\\enki\\rig.riv',
        sha256: HASH_A,
        revision: '2',
        sourceAssetIds: ['asset:b'],
      },
    ],
    runtimeReferences: [
      {
        id: 'runtime:fake:hero',
        runtime: 'fake',
        runtimeVersion: '1.0.0',
        definitionId: 'definition:enki:v1',
      },
    ],
    performances: [
      { id: 'performance:first', frame: 10 },
      { id: 'performance:second', frame: 20 },
    ],
    qa: {
      requiredInvariants: ['qa:identity:v1'],
      humanReviewRequired: true,
    },
    ...overrides,
  };
}

function dependencies(
  overrides: Partial<SceneCompilerDependencies<TestScene>> = {},
): SceneCompilerDependencies<TestScene> {
  return {
    validateScene: () => ({ valid: true, issues: [] }),
    resolveHistoricalSource: (id) => ({
      id,
      recordRevision: 1,
      recordHash: id === 'source:a' ? HASH_A : HASH_B,
      adaptation: 'direct-source',
      confidence: 'high',
    }),
    resolveVisualEvidence: (id) => ({
      id,
      recordRevision: 1,
      recordHash: id === 'evidence:a' ? HASH_C : HASH_D,
      rightsMode: 'metadata-only',
      confidence: 'high',
    }),
    collectRuntimeReferences: (input) => input.runtimeReferences,
    resolveRuntime: (reference) => ({
      id: reference.id,
      runtime: reference.runtime,
      version: reference.runtimeVersion,
      adapterVersion: 'adapter-v1',
      definitionId: reference.definitionId,
      capabilities: ['storybook', 'exact-frame-seek'],
    }),
    validateCapabilities: () => ({ valid: true, issues: [] }),
    deriveSemanticSeeds: () => [
      {
        targetId: 'actor:enki:instance',
        channel: 'face.blink',
        purpose: 'timing',
        algorithmVersion: 1,
        value: 123456789,
      },
    ],
    ...overrides,
  };
}

describe('Scene V3 compiler', () => {
  it('resolves a production scene and binds exact portable identities', () => {
    const result = compileSceneV3(scene(), dependencies());

    expect(result.ok).toBe(true);
    expect(result.report.status).toBe('PASS');
    expect(result.report.stages.every((entry) => entry.status === 'PASS')).toBe(true);
    expect(result.resolvedScene?.assets.map((asset) => asset.id)).toEqual([
      'asset:a',
      'asset:b',
    ]);
    expect(result.resolvedScene?.assets[0]?.logicalPath).toBe('actors/enki/rig.riv');
    expect(result.resolvedScene?.historicalSources.map((source) => source.id)).toEqual([
      'source:a',
      'source:b',
    ]);
    expect(result.resolvedScene?.runtimes[0]).toMatchObject({
      runtime: 'fake',
      version: '1.0.0',
      adapterVersion: 'adapter-v1',
    });
    expect(result.resolvedScene?.resolvedSceneHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('is exactly repeatable for the same semantic production state', () => {
    const first = compileSceneV3(scene(), dependencies());
    const second = compileSceneV3(scene(), dependencies());
    expect(first.resolvedScene).toEqual(second.resolvedScene);
  });

  it('normalizes root set-like source, evidence and asset ordering', () => {
    const first = compileSceneV3(scene(), dependencies());
    const reordered = scene({
      historicalSourceIds: ['source:a', 'source:b'],
      visualEvidenceIds: ['evidence:a', 'evidence:b'],
      assets: [...scene().assets].reverse(),
    });
    const second = compileSceneV3(reordered, dependencies());
    expect(first.resolvedScene?.resolvedSceneHash).toBe(second.resolvedScene?.resolvedSceneHash);
  });

  it('normalizes Windows logical path spelling before semantic hashing', () => {
    const windows = compileSceneV3(scene(), dependencies());
    const portableScene = scene({
      assets: scene().assets.map((asset) => ({
        ...asset,
        logicalPath:
          asset.id === 'asset:a' ? 'actors/enki/rig.riv' : 'assets/boat.png',
      })),
    });
    const portable = compileSceneV3(portableScene, dependencies());
    expect(windows.resolvedScene?.resolvedSceneHash).toBe(
      portable.resolvedScene?.resolvedSceneHash,
    );
  });

  it('preserves authored-order arrays as semantic', () => {
    const first = compileSceneV3(scene(), dependencies());
    const reversed = compileSceneV3(
      scene({ performances: [...scene().performances].reverse() }),
      dependencies(),
    );
    expect(first.resolvedScene?.resolvedSceneHash).not.toBe(
      reversed.resolvedScene?.resolvedSceneHash,
    );
  });

  it('changes resolved identity when an asset hash changes', () => {
    const first = compileSceneV3(scene(), dependencies());
    const changed = compileSceneV3(
      scene({
        assets: scene().assets.map((asset) =>
          asset.id === 'asset:a' ? { ...asset, sha256: HASH_D } : asset,
        ),
      }),
      dependencies(),
    );
    expect(first.resolvedScene?.resolvedSceneHash).not.toBe(
      changed.resolvedScene?.resolvedSceneHash,
    );
  });

  it('changes resolved identity when runtime version changes', () => {
    const first = compileSceneV3(scene(), dependencies());
    const changedScene = scene({
      runtimeReferences: [
        {
          ...scene().runtimeReferences[0],
          runtimeVersion: '1.0.1',
        },
      ],
    });
    const changed = compileSceneV3(changedScene, dependencies());
    expect(first.resolvedScene?.resolvedSceneHash).not.toBe(
      changed.resolvedScene?.resolvedSceneHash,
    );
  });

  it('does not put informational compiler warnings into resolved identity', () => {
    const clean = compileSceneV3(scene(), dependencies());
    const warned = compileSceneV3(
      scene(),
      dependencies({
        validateCapabilities: () => ({
          valid: true,
          issues: [
            {
              severity: 'warning',
              code: 'contextual-evidence',
              message: 'Contextual evidence should remain visible to Studio.',
            },
          ],
        }),
      }),
    );
    expect(warned.report.issues).toHaveLength(1);
    expect(clean.resolvedScene?.resolvedSceneHash).toBe(
      warned.resolvedScene?.resolvedSceneHash,
    );
  });

  it('fails and skips downstream work after structural validation failure', () => {
    const result = compileSceneV3(
      scene(),
      dependencies({
        validateScene: () => ({
          valid: false,
          issues: [
            {
              severity: 'error',
              code: 'scene.invalid',
              message: 'Bad scene.',
            },
          ],
        }),
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.report.stages.find((entry) => entry.id === 'schema')?.status).toBe(
      'FAIL',
    );
    expect(result.report.stages.find((entry) => entry.id === 'sources')?.status).toBe(
      'SKIP',
    );
  });

  it('fails when a historical source cannot resolve', () => {
    const result = compileSceneV3(
      scene(),
      dependencies({ resolveHistoricalSource: () => undefined }),
    );
    expect(result.ok).toBe(false);
    expect(result.report.stages.find((entry) => entry.id === 'sources')?.status).toBe(
      'FAIL',
    );
    expect(result.report.stages.find((entry) => entry.id === 'canonicalize')?.status).toBe(
      'SKIP',
    );
  });

  it('fails when visual evidence cannot resolve', () => {
    const result = compileSceneV3(
      scene(),
      dependencies({ resolveVisualEvidence: () => undefined }),
    );
    expect(result.ok).toBe(false);
    expect(result.report.issues.some((issue) => issue.code === 'evidence.missing')).toBe(
      true,
    );
  });

  it('fails exact runtime version mismatches', () => {
    const result = compileSceneV3(
      scene(),
      dependencies({
        resolveRuntime: (reference) => ({
          id: reference.id,
          runtime: reference.runtime,
          version: '9.9.9',
          adapterVersion: 'adapter-v1',
          definitionId: reference.definitionId,
          capabilities: [],
        }),
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.report.issues.some((issue) => issue.code === 'runtimes.mismatch')).toBe(
      true,
    );
  });

  it('fails unmet runtime capabilities without canonicalizing', () => {
    const result = compileSceneV3(
      scene(),
      dependencies({
        validateCapabilities: () => ({
          valid: false,
          issues: [
            {
              severity: 'error',
              code: 'missing-headless',
              message: 'headless-render is required.',
            },
          ],
        }),
      }),
    );
    expect(result.ok).toBe(false);
    expect(
      result.report.issues.some(
        (issue) => issue.code === 'capabilities.missing-headless',
      ),
    ).toBe(true);
    expect(result.report.stages.find((entry) => entry.id === 'canonicalize')?.status).toBe(
      'SKIP',
    );
  });

  it('rejects invalid semantic seeds', () => {
    const result = compileSceneV3(
      scene(),
      dependencies({
        deriveSemanticSeeds: () => [
          {
            targetId: 'actor:enki:instance',
            channel: 'face.blink',
            purpose: 'timing',
            algorithmVersion: 0,
            value: 1,
          },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.report.issues.some((issue) => issue.code === 'seeds.invalid')).toBe(
      true,
    );
  });

  it('rejects undefined canonical authoring data rather than dropping it', () => {
    const result = compileSceneV3(
      scene({ experimentalOptional: undefined }),
      dependencies(),
    );
    expect(result.ok).toBe(false);
    expect(
      result.report.issues.some((issue) => issue.code === 'canonicalize.failed'),
    ).toBe(true);
  });
});
