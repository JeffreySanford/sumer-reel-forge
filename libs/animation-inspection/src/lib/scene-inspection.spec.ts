import { describe, expect, it } from 'vitest';
import type { ResolvedSceneInspectionInput } from './inspection-types';
import {
  buildSceneInspection,
  serializeDiagnosticBundle,
} from './scene-inspection';

function fixture(): ResolvedSceneInspectionInput {
  return {
    schemaVersion: 'resolved-scene-v3:1',
    canonicalFormVersion: 'scene-canonical-form:v1',
    hashAlgorithm: 'sha256',
    sourceSceneId: 'scene:ch01:r01:s03:foundation',
    sourceSceneRevision: 1,
    sourceSceneHash: 'sha256:source',
    resolvedSceneHash: 'sha256:resolved',
    frame: {
      fps: 30,
      durationFrames: 210,
      width: 1080,
      height: 1920,
    },
    historicalSources: [
      {
        id: 'etcsl-1.1.4',
        recordRevision: 'v1',
        recordHash: 'sha256:source-114',
        adaptation: 'close-paraphrase',
        confidence: 'high',
      },
      {
        id: 'etcsl-1.1.3',
        recordRevision: 'v1',
        recordHash: 'sha256:source-113',
        adaptation: 'composite-adaptation',
        confidence: 'high',
      },
    ],
    visualEvidence: [
      {
        id: 'visual:bm:standard-of-ur:1928-1010-3:v1',
        recordRevision: 'v1',
        recordHash: 'sha256:evidence',
        rightsMode: 'metadata-only',
        confidence: 'high',
      },
    ],
    assets: [
      {
        id: 'asset:fixture:stag-runtime',
        revision: 'v1',
        kind: 'data',
        logicalPath: 'fixtures/stag.json',
        contentHash: 'sha256:stag',
        sourceAssetIds: [],
      },
      {
        id: 'asset:fixture:enki-runtime',
        revision: 'v1',
        kind: 'data',
        logicalPath: 'fixtures/enki.json',
        contentHash: 'sha256:enki',
        sourceAssetIds: ['asset:fixture:enki-source'],
      },
    ],
    runtimes: [
      {
        id: 'runtime:fake:prop',
        runtime: 'fake',
        version: '1.0.0',
        adapterVersion: '1.0.0',
        definitionId: 'runtime-def:stag',
        capabilities: ['world-state', '2d-transform'],
      },
      {
        id: 'runtime:fake:actor',
        runtime: 'fake',
        version: '1.0.0',
        adapterVersion: '1.0.0',
        definitionId: 'runtime-def:enki',
        capabilities: ['2d-transform'],
      },
    ],
    semanticSeeds: [
      {
        targetId: 'prop:stag-of-absu',
        channel: 'transform.travel',
        purpose: 'phase',
        algorithmVersion: 1,
        value: 200,
      },
      {
        targetId: 'actor-instance:enki:s03',
        channel: 'face.blink',
        purpose: 'timing',
        algorithmVersion: 1,
        value: 100,
      },
    ],
    qaContract: {
      requiredInvariants: [
        {
          id: 'qa:identity:enki',
          category: 'identity',
          description: 'Enki identity remains bound.',
          blocking: true,
        },
        {
          id: 'qa:motion:frame-authority',
          category: 'motion',
          description: 'Integer frame authority remains in force.',
          blocking: true,
        },
      ],
      benchmarkStates: [
        { id: 'START', frame: 0, description: 'Start.' },
        { id: 'BLINK_CLOSED', frame: 101, description: 'Closed blink.' },
        { id: 'END', frame: 209, description: 'End.' },
      ],
      humanReviewRequired: true,
    },
    semanticScene: {
      camera: [
        {
          id: 'camera:main',
          runtime: { id: 'runtime:fake:camera' },
        },
      ],
      environments: [
        {
          id: 'environment:gulf-water',
          definitionId: 'environment-definition:gulf-water',
          runtime: { id: 'runtime:fake:environment' },
        },
      ],
      actors: [
        {
          id: 'actor-instance:enki:s03',
          actorDefinitionId: 'actor:enki',
          runtime: { id: 'runtime:fake:actor' },
        },
      ],
      props: [
        {
          id: 'prop:stag-of-absu',
          definitionId: 'prop-definition:stag-of-absu',
          runtime: { id: 'runtime:fake:prop' },
        },
      ],
      materials: [],
      effects: [],
      crowds: [],
      herds: [],
      simulations: [],
      worldStates: [
        {
          id: 'world-state:gulf-water',
          stateDefinitionId: 'state:gulf-water',
        },
      ],
    },
  };
}

describe('resolved scene inspection view models', () => {
  it('builds the scene header without interpreting runtime internals', () => {
    const inspection = buildSceneInspection(fixture(), 101);
    expect(inspection.header).toEqual({
      sceneId: 'scene:ch01:r01:s03:foundation',
      revision: 1,
      schemaVersion: 'resolved-scene-v3:1',
      frameSize: '1080×1920',
      fps: 30,
      durationFrames: 210,
      sourceCount: 2,
      visualEvidenceCount: 1,
      runtimeCount: 2,
      humanReview: 'REQUIRED',
    });
  });

  it('marks only the exact named proof state active', () => {
    const inspection = buildSceneInspection(fixture(), 101);
    expect(inspection.proofStates.map((state) => [state.id, state.active])).toEqual([
      ['START', false],
      ['BLINK_CLOSED', true],
      ['END', false],
    ]);
  });

  it('builds semantic hierarchy groups in Studio order', () => {
    const inspection = buildSceneInspection(fixture(), 101);
    expect(inspection.hierarchy.map((group) => group.label)).toEqual([
      'Camera',
      'Environment',
      'Actors',
      'Props',
      'Materials',
      'Effects',
      'Crowds',
      'Herds',
      'Simulations',
      'World states',
      'Montage',
    ]);
    expect(inspection.hierarchy[2].nodes[0]).toEqual({
      id: 'actor-instance:enki:s03',
      label: 'actor:enki',
      runtimeId: 'runtime:fake:actor',
    });
  });

  it('keeps empty semantic groups visible instead of inventing nodes', () => {
    const inspection = buildSceneInspection(fixture(), 101);
    expect(inspection.hierarchy.find((group) => group.id === 'materials')?.nodes).toEqual([]);
    expect(inspection.hierarchy.find((group) => group.id === 'montage')?.nodes).toEqual([]);
  });

  it('sorts provenance records by stable source identity', () => {
    const inspection = buildSceneInspection(fixture(), 101);
    expect(inspection.historicalSources.map((source) => source.id)).toEqual([
      'etcsl-1.1.3',
      'etcsl-1.1.4',
    ]);
    expect(inspection.visualEvidence[0]).toMatchObject({
      id: 'visual:bm:standard-of-ur:1928-1010-3:v1',
      rightsMode: 'metadata-only',
      confidence: 'high',
    });
  });

  it('does not claim QA success when only contracts are available', () => {
    const inspection = buildSceneInspection(fixture(), 101);
    expect(inspection.qaGates).toHaveLength(2);
    expect(inspection.qaGates.every((gate) => gate.status === 'NOT_RUN')).toBe(true);
  });

  it('sorts diagnostic runtimes, capabilities, assets and semantic seeds', () => {
    const inspection = buildSceneInspection(fixture(), 101);
    expect(inspection.diagnostics.runtimes.map((runtime) => runtime.id)).toEqual([
      'runtime:fake:actor',
      'runtime:fake:prop',
    ]);
    expect(inspection.diagnostics.runtimes[1].capabilities).toEqual([
      '2d-transform',
      'world-state',
    ]);
    expect(inspection.diagnostics.assets.map((asset) => asset.id)).toEqual([
      'asset:fixture:enki-runtime',
      'asset:fixture:stag-runtime',
    ]);
    expect(inspection.diagnostics.semanticSeeds.map((seed) => seed.channel)).toEqual([
      'face.blink',
      'transform.travel',
    ]);
  });

  it('serializes a copyable diagnostic bundle with the exact inspected frame', () => {
    const inspection = buildSceneInspection(fixture(), 101);
    const serialized = serializeDiagnosticBundle(inspection.diagnostics);
    expect(serialized).toContain('"frame": 101');
    expect(serialized).toContain('"resolvedSceneHash": "sha256:resolved"');
    expect(serialized).toContain('"adapterVersion": "1.0.0"');
  });

  it('reports unknown human-review state rather than assuming approval semantics', () => {
    const scene = fixture();
    const withoutQaShape = { ...scene, qaContract: {} };
    expect(buildSceneInspection(withoutQaShape, 0).header.humanReview).toBe('UNKNOWN');
  });

  it('fails explicitly when semanticScene is unavailable instead of rendering an empty hierarchy', () => {
    const scene = fixture();
    const invalid = { ...scene, semanticScene: null };
    expect(() => buildSceneInspection(invalid, 0)).toThrow(/semanticScene must be a canonical object/);
  });
});
