import { expect, test } from '@playwright/test';

const HOST_CAPABILITIES = {
  schemaVersion: 1,
  source: 'startup-profile',
  profileGeneratedAt: new Date(0).toISOString(),
  observedAt: new Date(0).toISOString(),
  host: 'animation-qa-host',
  platform: 'win32',
  arch: 'x64',
  cpu: { model: 'Intel Test i9', logicalCount: 24, averageReportedMhz: 3200 },
  memory: { totalGb: 64, freeGb: 32 },
  disk: { totalGb: 1000, freeGb: 600 },
  gpu: {
    nvidiaSmiAvailable: true,
    devices: [
      {
        vendor: 'NVIDIA',
        index: 0,
        name: 'NVIDIA RTX Test',
        memoryTotalMb: 10240,
        driverVersion: '999.1',
      },
    ],
  },
  media: {
    ffmpegAvailable: true,
    encoders: { h264Nvenc: true, hevcNvenc: true, av1Nvenc: false },
  },
  ollama: { baseUrl: 'http://localhost:11434', online: true, models: ['qwen3:8b'] },
  comfyui: {
    baseUrl: 'http://127.0.0.1:8188',
    online: true,
    detail: 'Online on NVIDIA RTX Test',
    layerWorkflowPath: null,
    layerWorkflowReady: false,
  },
  runtimePlan: {
    tier: 'workstation',
    remotion: {
      parallelRenders: 2,
      concurrencyPerRender: 7,
      hardwareAcceleration: 'if-possible',
      gl: 'angle',
      source: 'autodetected',
    },
    ai: {
      nvidiaCudaAvailable: true,
      ollamaOnline: true,
      ollamaReviewConcurrency: 2,
      comfyConcurrency: 1,
      comfyVramMode: 'normalvram',
      chatterboxDevice: 'cuda',
    },
    encoding: {
      ffmpegAvailable: true,
      nvencAvailable: true,
      preferredH264Encoder: 'h264_nvenc',
    },
    reserves: { logicalCpuReserved: 4, estimatedMemoryGbReserved: 13 },
  },
  software: [],
  projections: [],
};

const READY_INVENTORY = {
  schemaVersion: 1,
  baseUrl: 'http://127.0.0.1:8188',
  observedAt: new Date(0).toISOString(),
  online: true,
  error: null,
  nodeCount: 6,
  nodeTypes: [
    'LoadImage',
    'CheckpointLoaderSimple',
    'CLIPTextEncode',
    'SAM3_Detect',
    'JoinImageWithAlpha',
    'SaveImage',
  ],
  layerNodeTypes: ['SAM3_Detect', 'JoinImageWithAlpha'],
  resources: [
    {
      nodeType: 'CheckpointLoaderSimple',
      inputName: 'ckpt_name',
      values: ['sam3.1_multiplex_fp16.safetensors'],
    },
  ],
  families: {
    segmentation: ['SAM3_Detect'],
    matting: ['JoinImageWithAlpha'],
    backgroundRemoval: [],
    depth: [],
    inpaint: [],
  },
};

function readyLayer({
  id,
  role,
  material,
  laneId,
  generatorFamily,
  qaFamily,
  motionPresets = [],
  coverageAdvisory = null,
}: {
  id: string;
  role: string;
  material: string;
  laneId: string;
  generatorFamily: string;
  qaFamily: string;
  motionPresets?: string[];
  coverageAdvisory?: string | null;
}) {
  return {
    id,
    path: `blessings-of-sumer/${id}.png`,
    role,
    material,
    required: true,
    hasAlpha: role !== 'background',
    motionPresets,
    state: 'approved',
    reviewStatus: 'approved',
    reviewNotes: ['Human-approved benchmark.', `${qaFamily} QA PASS.`],
    qaEvidenceRecorded: true,
    coverageAdvisory,
    fileExists: true,
    dimensions: { width: 941, height: 1672 },
    sourceDimensions: { width: 941, height: 1672 },
    dimensionsMatchSource: true,
    sha256: `sha256:${'a'.repeat(64)}`,
    checksumMatches: true,
    ready: true,
    lane: {
      id: laneId,
      generatorFamily,
      qaFamily,
      notes: ['Preserve source pixels.', 'Human review remains the final gate.'],
    },
    decisions: [
      {
        id: 'project-human-approval-final-gate',
        state: 'approved',
        scopeType: 'project',
        path: 'review.humanApprovalRequired',
        value: true,
        rationale: 'Technical QA cannot approve artistic publication quality.',
      },
    ],
  };
}

const READY_PRODUCTION = {
  schemaVersion: 1,
  observedAt: new Date(0).toISOString(),
  principle: 'AI proposes. Rules constrain. Human directs.',
  manifestId: 'chapter-01-reel-01-animation-v1',
  manifestPath:
    'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
  projectSlug: 'blessings-of-sumer',
  chapterNumber: 1,
  episodeNumber: 1,
  assetVersion: 'animation-v1',
  sourceEditorialVersion: 'editorial-v1',
  laneRegistryId: 'animation-production-lanes-v1',
  styleDecisionLibraryId: 'blessings-of-sumer-animation-style-decisions-v1',
  summary: {
    shotCount: 2,
    layeredReadyCount: 2,
    approvedRequiredLayerCount: 8,
    requiredLayerCount: 8,
  },
  shots: [
    {
      shotId: 'enki-at-the-helm',
      sourceShotNumber: 3,
      status: 'approved',
      sourceFrame: 'blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-03.png',
      activationState: 'layered-ready',
      requiredLayerCount: 4,
      readyRequiredLayerCount: 4,
      optionalLayerCount: 2,
      deferredPerformanceEnabled: true,
      fallbackAssetPath: 'editorial-v1/shot-03.png',
      sourceDimensions: { width: 941, height: 1672 },
      layers: [
        readyLayer({
          id: 'shot03-background-v1',
          role: 'background',
          material: 'atmosphere-distant',
          laneId: 'masked-background-repair',
          generatorFamily: 'masked-inpainting',
          qaFamily: 'outside-preservation-plus-inside-reconstruction',
          motionPresets: ['cinematicSlow'],
        }),
        readyLayer({
          id: 'shot03-water-v1',
          role: 'water',
          material: 'water',
          laneId: 'semantic-water-overlay',
          generatorFamily: 'sam3-semantic-overlay',
          qaFamily: 'alpha-structure-then-composite-motion',
          motionPresets: ['waterPulse'],
        }),
        readyLayer({
          id: 'shot03-vessel-v1',
          role: 'major-prop',
          material: 'rigid-vessel',
          laneId: 'rigid-prop-extraction',
          generatorFamily: 'sam3-semantic-overlay',
          qaFamily: 'alpha-structure-then-composite-motion',
          motionPresets: ['heavyPhysical'],
        }),
        readyLayer({
          id: 'shot03-enki-body-v1',
          role: 'character',
          material: 'cloth-heavy',
          laneId: 'character-source-extraction',
          generatorFamily: 'sam3-semantic-overlay',
          qaFamily: 'identity-alpha-then-composite-motion',
          motionPresets: ['breathing'],
        }),
      ],
      decisions: [
        {
          id: 'shot3-approved-stillness-anchor',
          state: 'approved',
          scopeType: 'shot',
          path: 'composition.stillnessAnchor',
          value: 'enki-facial-identity',
          rationale: 'Enki remains the compositional stillness anchor.',
        },
      ],
    },
    {
      shotId: 'nammu-under-water',
      sourceShotNumber: 4,
      status: 'approved',
      sourceFrame: 'blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-04.png',
      activationState: 'layered-ready',
      requiredLayerCount: 4,
      readyRequiredLayerCount: 4,
      optionalLayerCount: 2,
      deferredPerformanceEnabled: false,
      fallbackAssetPath: 'editorial-v1/shot-04.png',
      sourceDimensions: { width: 941, height: 1672 },
      layers: [
        readyLayer({
          id: 'shot04-deep-water-v1',
          role: 'background',
          material: 'underwater-refraction',
          laneId: 'exact-source-preservation',
          generatorFamily: 'source-preservation',
          qaFamily: 'checksum-identity',
          motionPresets: ['waterPulse'],
        }),
        readyLayer({
          id: 'shot04-mid-current-v1',
          role: 'water',
          material: 'water',
          laneId: 'semantic-water-overlay',
          generatorFamily: 'sam3-semantic-overlay',
          qaFamily: 'alpha-structure-then-composite-motion',
          motionPresets: ['waterPulse', 'numinousDrift'],
          coverageAdvisory: 'SPARSE_REVIEW_REQUIRED',
        }),
        readyLayer({
          id: 'shot04-surface-refraction-v1',
          role: 'reflection',
          material: 'underwater-refraction',
          laneId: 'semantic-refraction-overlay',
          generatorFamily: 'sam3-semantic-overlay',
          qaFamily: 'alpha-structure-then-composite-motion',
          motionPresets: ['waterPulse'],
          coverageAdvisory: 'SPARSE_REVIEW_REQUIRED',
        }),
        readyLayer({
          id: 'shot04-nammu-coherence-mask-v1',
          role: 'mask',
          material: 'divine-light',
          laneId: 'environmental-coherence-mask',
          generatorFamily: 'semantic-coherence-mask',
          qaFamily: 'mask-shape-and-reveal',
          motionPresets: ['numinousDrift'],
          coverageAdvisory: 'SPARSE_REVIEW_REQUIRED',
        }),
      ],
      decisions: [
        {
          id: 'nammu-environmental-coherence',
          state: 'provisional',
          scopeType: 'shot',
          path: 'reveal.mode',
          value: 'environmental-coherence',
          rationale: 'Recognition should emerge from water and refraction.',
        },
      ],
    },
  ],
};

async function mockProductionApis(page: import('@playwright/test').Page) {
  await page.route('**/api/runtime/capabilities', async (route) => {
    await route.fulfill({ json: HOST_CAPABILITIES });
  });
  await page.route('**/api/runtime/comfyui-inventory', async (route) => {
    await route.fulfill({ json: READY_INVENTORY });
  });
  await page.route('**/api/runtime/animation-production', async (route) => {
    await route.fulfill({ json: READY_PRODUCTION });
  });
}

test('presents approved production benchmarks from the live manifest contract', async ({
  page,
}) => {
  await mockProductionApis(page);
  await page.goto('/production/layers');

  await expect(
    page.getByRole('heading', { name: 'Animation Production', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('2/2 benchmark shots layered-ready')).toBeVisible();
  await expect(page.getByText('LAYERED READY')).toHaveCount(2);
  await expect(page.getByText('NVIDIA RTX Test', { exact: true })).toBeVisible();
  await expect(page.getByText('SAM3 lane available')).toBeVisible();
  await expect(page.getByText('masked-background-repair')).toBeVisible();
  await expect(page.getByText('Verified', { exact: true })).toBeVisible();
  await expect(page.getByText('cinematicSlow', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /SHOT 4.*Nammu Under Water/i }).click();
  await page
    .getByRole('button', { name: /Nammu Coherence Mask.*Required/i })
    .click();

  await expect(page.getByText('environmental-coherence-mask')).toBeVisible();
  await expect(page.getByText('SPARSE_REVIEW_REQUIRED')).toBeVisible();
  await expect(page.getByText('environmental-coherence', { exact: true })).toBeVisible();
  await expect(page.getByText('provisional', { exact: true })).toBeVisible();

  await expect(page.getByRole('button', { name: /promote/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /generate/i })).toHaveCount(0);
});

test('keeps approved production truth visible when the local GPU engine is offline', async ({
  page,
}) => {
  await page.route('**/api/runtime/capabilities', async (route) => {
    await route.fulfill({
      json: {
        ...HOST_CAPABILITIES,
        comfyui: {
          ...HOST_CAPABILITIES.comfyui,
          online: false,
          detail: 'Offline',
        },
      },
    });
  });
  await page.route('**/api/runtime/comfyui-inventory', async (route) => {
    await route.fulfill({
      json: {
        ...READY_INVENTORY,
        online: false,
        error: 'Connection refused',
        nodeCount: 0,
        nodeTypes: [],
        layerNodeTypes: [],
        resources: [],
        families: {
          segmentation: [],
          matting: [],
          backgroundRemoval: [],
          depth: [],
          inpaint: [],
        },
      },
    });
  });
  await page.route('**/api/runtime/animation-production', async (route) => {
    await route.fulfill({ json: READY_PRODUCTION });
  });

  await page.goto('/production/layers');

  await expect(page.getByText('2/2 benchmark shots layered-ready')).toBeVisible();
  await expect(page.getByText('Current benchmarks healthy')).toBeVisible();
  await expect(page.getByText('Offline', { exact: true })).toBeVisible();
  await expect(page.getByText('Production graph missing')).toBeVisible();
});
