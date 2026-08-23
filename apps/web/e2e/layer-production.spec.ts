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

test('recognizes the built-in SAM3 workflow and exposes the safe layer plan', async ({
  page,
}) => {
  await page.route('**/api/runtime/capabilities', async (route) => {
    await route.fulfill({ json: HOST_CAPABILITIES });
  });
  await page.route('**/api/runtime/comfyui-inventory', async (route) => {
    await route.fulfill({ json: READY_INVENTORY });
  });

  await page.goto('/production/layers');

  await expect(page.getByRole('heading', { name: 'Layer Production' })).toBeVisible();
  await expect(page.getByText('editorial-v1 locked')).toBeVisible();
  await expect(page.getByText('NVIDIA RTX Test', { exact: true })).toBeVisible();
  await expect(page.getByText('API graph configured')).toBeVisible();
  await expect(page.getByText('Ready for zero-generation preflight')).toBeVisible();
  await expect(page.getByText('shot03-water-v1', { exact: true })).toBeVisible();
  await expect(page.getByText('shot03-vessel-v1', { exact: true })).toBeVisible();
  await expect(page.getByText('shot03-enki-body-v1', { exact: true })).toBeVisible();
  await expect(page.getByText('No automatic promotion')).toBeVisible();

  await expect(page.getByRole('button', { name: /generate/i })).toHaveCount(0);
});

test('keeps GPU generation disabled when ComfyUI is offline', async ({ page }) => {
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

  await page.goto('/production/layers');

  await expect(page.getByRole('heading', { name: 'Complete readiness gates' })).toBeVisible();
  await expect(page.getByText('GPU generation remains disabled')).toBeVisible();
  await expect(page.getByText(/Start ComfyUI on the configured local address/)).toBeVisible();
});
