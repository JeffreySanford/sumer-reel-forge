import type { ResolvedSceneInspectionInput } from '@sumer-reel-forge/animation-inspection';

export const GOLDEN_INSPECTION_FIXTURE: ResolvedSceneInspectionInput = {
  schemaVersion: 'resolved-scene-v3:1',
  canonicalFormVersion: 'scene-canonical-form:v1',
  hashAlgorithm: 'sha256',
  sourceSceneId: 'scene:ch01:r01:s03:foundation',
  sourceSceneRevision: 1,
  sourceSceneHash:
    'sha256:c2a675b2373dd586436be4976b56682ee0455fc29d2b3227b045fa68e7a04948',
  resolvedSceneHash:
    'sha256:45abb40d06397aefc1853ad0ec8debb36024ba6f15af55a38414dac8c49f4f82',
  frame: {
    fps: 30,
    durationFrames: 210,
    width: 1080,
    height: 1920,
  },
  historicalSources: [
    {
      id: 'etcsl-1.1.3',
      recordRevision: 'v1',
      recordHash:
        'sha256:c67a923ff03cdf03d43cf57ecdc286215d354ed30eefc5c7eb43762e632c873c',
    },
    {
      id: 'etcsl-1.1.4',
      recordRevision: 'v1',
      recordHash:
        'sha256:aea88d8ca989413b8769250c34a6ff5d6dbd4ce23317f20f25b618c7ae5da116',
    },
  ],
  visualEvidence: [
    {
      id: 'visual:bm:standard-of-ur:1928-1010-3:v1',
      recordRevision: 'v1',
      recordHash:
        'sha256:3bac3d12b131cbacc828bcde72df505dc95cc260d87aca7fa1a08e55e3734a19',
      rightsMode: 'metadata-only',
    },
  ],
  assets: [
    {
      id: 'asset:fixture:enki-source',
      revision: 'v1',
      kind: 'data',
      logicalPath:
        'tools/animation-v3-integration/fixtures/enki-source.fixture.json',
      contentHash:
        'sha256:ec7481978bafe143f7c711d86e6b56c8feb762527580f1c90a4322fb0b418ea3',
      sourceAssetIds: [],
    },
    {
      id: 'asset:fixture:enki-runtime',
      revision: 'v1',
      kind: 'data',
      logicalPath:
        'tools/animation-v3-integration/fixtures/enki-runtime.fixture.json',
      contentHash:
        'sha256:80c33e45ac76862fab972793a4d30fbe63dd39f78ba8415723d9fa9172ecdf51',
      sourceAssetIds: ['asset:fixture:enki-source'],
    },
    {
      id: 'asset:fixture:stag-runtime',
      revision: 'v1',
      kind: 'data',
      logicalPath:
        'tools/animation-v3-integration/fixtures/stag-runtime.fixture.json',
      contentHash:
        'sha256:4985c805d42d36ab07cf6c9f77edcc65960bc2f7ef13797f914479e311f32f04',
      sourceAssetIds: [],
    },
  ],
  runtimes: [
    {
      id: 'runtime:fake:actor',
      runtime: 'fake',
      version: '1.0.0',
      adapterVersion: '1.0.0',
      definitionId: 'runtime-def:enki:foundation',
      capabilities: ['2d-transform', 'world-state'],
    },
    {
      id: 'runtime:fake:camera',
      runtime: 'fake',
      version: '1.0.0',
      adapterVersion: '1.0.0',
      definitionId: 'runtime-def:camera:foundation',
      capabilities: ['2d-transform', 'world-state'],
    },
    {
      id: 'runtime:fake:environment',
      runtime: 'fake',
      version: '1.0.0',
      adapterVersion: '1.0.0',
      definitionId: 'runtime-def:gulf-water:foundation',
      capabilities: ['2d-transform', 'world-state'],
    },
    {
      id: 'runtime:fake:prop',
      runtime: 'fake',
      version: '1.0.0',
      adapterVersion: '1.0.0',
      definitionId: 'runtime-def:stag:foundation',
      capabilities: ['2d-transform', 'world-state'],
    },
  ],
  semanticSeeds: [
    {
      targetId: 'actor-instance:enki:s03',
      channel: 'body.breath',
      purpose: 'phase',
      algorithmVersion: 1,
      value: 1079719801,
    },
    {
      targetId: 'actor-instance:enki:s03',
      channel: 'face.blink',
      purpose: 'timing',
      algorithmVersion: 1,
      value: 2815321919,
    },
    {
      targetId: 'prop:stag-of-absu',
      channel: 'transform.travel',
      purpose: 'phase',
      algorithmVersion: 1,
      value: 2770206497,
    },
  ],
  qaContract: {
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
    humanReviewRequired: false,
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
    worldStates: [],
  },
};
