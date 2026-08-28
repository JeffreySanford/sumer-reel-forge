import { expect, test } from '@playwright/test';
import {
  CHAPTER_ONE_SUMMARY,
  DEFAULT_NARRATION_SETTINGS,
  REEL_ONE,
} from '@sumer-reel-forge/reel-core';

const HOST_CAPABILITIES = {
  schemaVersion: 1,
  source: 'startup-profile',
  profileGeneratedAt: new Date(0).toISOString(),
  observedAt: new Date(0).toISOString(),
  host: 'reel-forge-test-host',
  platform: 'win32',
  arch: 'x64',
  cpu: {
    model: 'Intel Test i9',
    logicalCount: 24,
    averageReportedMhz: 3200,
  },
  memory: { totalGb: 64, freeGb: 42 },
  disk: { totalGb: 1000, freeGb: 500 },
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
  ollama: {
    baseUrl: 'http://localhost:11434',
    online: true,
    models: ['qwen3:8b', 'qwen3-vl:4b-instruct'],
  },
  comfyui: {
    baseUrl: 'http://127.0.0.1:8188',
    online: true,
    detail: 'Online on NVIDIA RTX Test',
    layerWorkflowPath: 'D:/workflows/layer-candidates.json',
    layerWorkflowReady: true,
  },
  runtimePlan: {
    tier: 'workstation',
    remotion: {
      parallelRenders: 2,
      concurrencyPerRender: 8,
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
    reserves: {
      logicalCpuReserved: 4,
      estimatedMemoryGbReserved: 13,
    },
  },
  software: [
    {
      id: 'node',
      label: 'Node.js',
      status: 'ready',
      detail: 'Application runtime',
      version: 'v22',
    },
    {
      id: 'remotion',
      label: 'Remotion',
      status: 'ready',
      detail: 'Deterministic animation renderer',
      version: '4.0.515',
    },
    {
      id: 'ollama',
      label: 'Ollama',
      status: 'ready',
      detail: '2 local model(s) reachable',
    },
    {
      id: 'comfyui',
      label: 'ComfyUI',
      status: 'ready',
      detail: 'Online on NVIDIA RTX Test',
    },
    {
      id: 'comfyui-layer-workflow',
      label: 'ComfyUI Layer Workflow',
      status: 'ready',
      detail: 'Candidate workflow available',
    },
    {
      id: 'cuda',
      label: 'NVIDIA / CUDA',
      status: 'ready',
      detail: 'NVIDIA driver detected',
    },
    {
      id: 'nvenc',
      label: 'NVENC',
      status: 'ready',
      detail: 'Hardware H.264 encoding is available',
    },
  ],
  projections: [
    {
      id: 'scene-v2-rendering',
      title: 'Scene V2 cinematic rendering',
      status: 'ready',
      summary: '2 render processes with about 8 Remotion workers each.',
      basis: ['Remotion', 'FFmpeg', 'CPU/RAM runtime plan'],
    },
    {
      id: 'nvidia-gpu-acceleration',
      title: 'NVIDIA GPU acceleration',
      status: 'ready',
      summary:
        'NVIDIA RTX Test is available for CUDA workloads with 10.0 GB VRAM.',
      basis: ['nvidia-smi', 'GPU/VRAM', 'NVIDIA driver'],
    },
    {
      id: 'animation-layer-generation',
      title: 'Animation-layer pipeline',
      status: 'ready',
      summary:
        'GPU acceleration and ComfyUI are ready; plan 1 generation job at a time in normalvram mode.',
      basis: [
        'NVIDIA GPU acceleration',
        'ComfyUI reachability',
        'Dedicated layer workflow',
      ],
    },
  ],
};

test('shows host hardware, software, and projected capabilities', async ({
  page,
}) => {
  await mockStudioStartup(page);
  await page.route('**/api/runtime/capabilities', async (route) => {
    await route.fulfill({ json: HOST_CAPABILITIES });
  });

  await page.goto('/system');

  await expect(
    page.getByRole('heading', { name: 'Host System' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'reel-forge-test-host' }),
  ).toBeVisible();
  const hostHardwareSummary = page.getByLabel('Host hardware summary');

  await expect(
    hostHardwareSummary.getByText('NVIDIA RTX Test', { exact: true }),
  ).toBeVisible();

  await expect(
    hostHardwareSummary.getByText('64 GB', { exact: true }),
  ).toBeVisible();

  const liveGpuRuntime = page.getByLabel('Live GPU runtime status');

  await expect(
    liveGpuRuntime.getByText('NVIDIA RTX Test', { exact: true }),
  ).toBeVisible();

  await expect(liveGpuRuntime.getByText('FREE', { exact: true })).toBeVisible();
  await expect(page.getByText('64 GB', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: 'What should be possible on this host',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'NVIDIA GPU acceleration' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Animation-layer pipeline' }),
  ).toBeVisible();
  await expect(
    page.getByText('Host ready for GPU candidate generation'),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Studio Home' }).click();
  await expect(page).toHaveURL(/\/$/);
});

async function mockStudioStartup(
  page: import('@playwright/test').Page,
): Promise<void> {
  await page.route(
    '**/api/projects/blessings-of-sumer/chapters/1/narration',
    async (route) => route.fulfill({ json: DEFAULT_NARRATION_SETTINGS }),
  );
  await page.route('**/api/chapters/1/reels', async (route) => {
    await route.fulfill({ json: CHAPTER_ONE_SUMMARY });
  });
  await page.route('**/api/chapters/1/reels/1', async (route) => {
    await route.fulfill({ json: REEL_ONE });
  });
  await page.route('**/api/render-jobs**', async (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route('**/api/generated-assets**', async (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route('**/api/runtime/gpu-status', async (route) => {
    await route.fulfill({
      json: {
        schemaVersion: 1,
        observedAt: new Date(0).toISOString(),
        lease: {
          state: 'FREE',
          reason: 'No active GPU lease.',
          directory: 'tmp/runtime/gpu-ai.lock',
          metadata: null,
        },
        nvidia: {
          available: true,
          devices: [
            {
              index: 0,
              name: 'NVIDIA RTX Test',
              memoryTotalMb: 10240,
              memoryUsedMb: 2048,
              memoryFreeMb: 8192,
              utilizationGpuPercent: 5,
              driverVersion: '999.1',
            },
          ],
        },
        ollama: {
          baseUrl: 'http://localhost:11434',
          reachable: true,
          loadedModels: [],
        },
        comfyui: {
          baseUrl: 'http://127.0.0.1:8188',
          reachable: true,
          devices: [
            {
              name: 'cuda:0 NVIDIA RTX Test',
              type: 'cuda',
              vramTotalBytes: 10737418240,
              vramFreeBytes: 8589934592,
              torchVramTotalBytes: 536870912,
              torchVramFreeBytes: 503316480,
            },
          ],
          system: {
            comfyuiVersion: '0.test',
            pytorchVersion: 'test',
          },
        },
      },
    });
  });
  await page.route('**/api/planning/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/capabilities')) {
      await route.fulfill({
        json: {
          defaultProvider: 'deterministic',
          providers: [
            {
              id: 'deterministic',
              available: true,
              text: true,
              vision: false,
              structuredOutput: true,
            },
          ],
        },
      });
      return;
    }
    await route.fulfill({ json: null });
  });
}
