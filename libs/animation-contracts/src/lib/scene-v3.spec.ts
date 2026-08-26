import type { SceneV3 } from './scene-v3';
import { validateSceneV3 } from './validation';

const constantVec3 = (x: number, y: number, z: number) => ({
  type: 'constant' as const,
  value: { x, y, z },
});

function transform(parentId?: string) {
  return {
    position: constantVec3(0, 0, 0),
    rotation: constantVec3(0, 0, 0),
    scale: constantVec3(1, 1, 1),
    ...(parentId ? { parentId } : {}),
  };
}

function runtime(id = 'runtime:fake:hero') {
  return {
    id,
    runtime: 'fake' as const,
    runtimeVersion: '1.0.0',
    definitionId: 'definition:test',
  };
}

function minimalScene(): SceneV3 {
  return {
    schemaVersion: '3',
    id: 'scene:ch01:r01:s03',
    revision: 1,
    story: {
      projectId: 'project:blessings-of-sumer',
      chapterId: 'chapter:01',
      reelId: 'reel:01',
      shotId: 'shot:03',
      manuscriptRevision: 'paper-v1',
    },
    historicalSourceIds: ['etcsl-1.1.3'],
    visualEvidenceIds: [],
    assets: [
      {
        id: 'asset:enki:rig:v1',
        kind: 'rig',
        logicalPath: 'blessings-of-sumer/enki/rig-v1.riv',
        sha256: 'a'.repeat(64),
        revision: 'v1',
      },
    ],
    fps: 30,
    durationFrames: 150,
    width: 1080,
    height: 1920,
    seed: 20260825,
    camera: [],
    actors: [
      {
        id: 'actor:enki:shot03',
        actorDefinitionId: 'actor-definition:enki',
        runtime: runtime(),
        rigAssetId: 'asset:enki:rig:v1',
        sourceAssetIds: [],
        transform: transform(),
        depthMode: '2d',
      },
    ],
    props: [],
    environments: [],
    performances: [
      {
        id: 'performance:enki:blink:v1',
        actorId: 'actor:enki:shot03',
        channel: 'face.blink',
        clipId: 'clip:enki:blink-natural:v1',
        startFrame: 95,
        endFrame: 106,
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
          id: 'qa:enki:identity',
          category: 'identity',
          description: 'Enki identity remains source-faithful.',
          blocking: true,
        },
      ],
      benchmarkStates: [
        { id: 'state:blink:closed', frame: 101, description: 'Eyes closed.' },
      ],
      humanReviewRequired: true,
    },
  };
}

function errorCodes(scene: SceneV3): string[] {
  return validateSceneV3(scene).issues
    .filter((issue) => issue.severity === 'error')
    .map((issue) => issue.code);
}

describe('Scene V3 contract validation', () => {
  it('accepts a minimal deterministic authoring scene', () => {
    expect(validateSceneV3(minimalScene())).toEqual({ valid: true, issues: [] });
  });

  it('rejects a schema version mismatch', () => {
    const scene = {
      ...minimalScene(),
      schemaVersion: '2',
    } as unknown as SceneV3;
    expect(errorCodes(scene)).toContain('scene-v3.schema-version.unsupported');
  });

  it('rejects duplicate semantic ids', () => {
    const scene = minimalScene();
    scene.actors = [...scene.actors, { ...scene.actors[0] }];
    expect(errorCodes(scene)).toContain('scene-v3.id.duplicate');
  });

  it('rejects missing actor references from performance tracks', () => {
    const scene = minimalScene();
    scene.performances = [
      { ...scene.performances[0], actorId: 'actor:missing:one' },
    ];
    expect(errorCodes(scene)).toContain('scene-v3.performance.actor.missing');
  });

  it('rejects missing asset references', () => {
    const scene = minimalScene();
    scene.actors = [{ ...scene.actors[0], rigAssetId: 'asset:missing:rig:v1' }];
    expect(errorCodes(scene)).toContain('scene-v3.asset-reference.missing');
  });

  it('rejects absolute workstation asset paths', () => {
    const scene = minimalScene();
    scene.assets = [{ ...scene.assets[0], logicalPath: 'D:\\assets\\enki.riv' }];
    expect(errorCodes(scene)).toContain('scene-v3.asset.logical-path.invalid');
  });

  it('rejects invalid half-open frame ranges', () => {
    const scene = minimalScene();
    scene.performances = [{ ...scene.performances[0], startFrame: 106, endFrame: 106 }];
    expect(errorCodes(scene)).toContain('scene-v3.frame-range.invalid');
  });

  it('rejects unversioned runtime references', () => {
    const scene = minimalScene();
    scene.actors = [
      { ...scene.actors[0], runtime: { ...scene.actors[0].runtime, runtimeVersion: '' } },
    ];
    expect(errorCodes(scene)).toContain('scene-v3.runtime.version.required');
  });

  it('rejects a missing material target', () => {
    const scene = minimalScene();
    scene.materials = [
      {
        id: 'material:water:test:v1',
        runtime: runtime('runtime:fake:material'),
        targetId: 'environment:missing:water',
        materialDefinitionId: 'material-definition:water',
        parameters: {},
        startFrame: 0,
        endFrame: 150,
      },
    ];
    expect(errorCodes(scene)).toContain('scene-v3.material.target.missing');
  });

  it('rejects parent cycles', () => {
    const scene = minimalScene();
    scene.props = [
      {
        id: 'prop:test:a',
        definitionId: 'prop-definition:a',
        runtime: runtime('runtime:fake:prop'),
        assetId: 'asset:enki:rig:v1',
        transform: transform('actor:enki:shot03'),
      },
    ];
    scene.actors = [
      { ...scene.actors[0], transform: transform('prop:test:a') },
    ];
    expect(errorCodes(scene)).toContain('scene-v3.parent.cycle');
  });

  it('rejects unknown QA categories at the runtime boundary', () => {
    const scene = minimalScene();
    scene.qa.requiredInvariants = [
      { ...scene.qa.requiredInvariants[0], category: 'vibes' as never },
    ];
    expect(errorCodes(scene)).toContain('scene-v3.qa.category.unknown');
  });

  it('rejects overlapping montage segments', () => {
    const scene = minimalScene();
    scene.montage = {
      id: 'montage:city-growth:v1',
      segments: [
        { id: 'segment:one', startFrame: 0, endFrame: 80 },
        { id: 'segment:two', startFrame: 70, endFrame: 120 },
      ],
    };
    expect(errorCodes(scene)).toContain('scene-v3.montage.overlap');
  });

  it('rejects QA benchmark frames outside the scene', () => {
    const scene = minimalScene();
    scene.qa.benchmarkStates = [
      { id: 'state:bad', frame: 150, description: 'Outside half-open scene range.' },
    ];
    expect(errorCodes(scene)).toContain('scene-v3.qa.frame.invalid');
  });
});
