import { expect, test } from '@playwright/test';
import {
  CHAPTER_ONE_SUMMARY,
  DEFAULT_NARRATION_SETTINGS,
  REEL_ONE,
} from '@sumer-reel-forge/reel-core';

const HOME_HOST = {
  schemaVersion: 1,
  source: 'startup-profile',
  profileGeneratedAt: new Date(0).toISOString(),
  observedAt: new Date(0).toISOString(),
  host: 'studio-home-test-host',
  platform: 'win32',
  arch: 'x64',
  cpu: { model: 'Intel Test Workstation', logicalCount: 24, averageReportedMhz: 3200 },
  memory: { totalGb: 64, freeGb: 40 },
  disk: { totalGb: 1000, freeGb: 500 },
  gpu: {
    nvidiaSmiAvailable: true,
    devices: [{ vendor: 'NVIDIA', name: 'NVIDIA RTX Test', memoryTotalMb: 10240 }],
  },
  media: { ffmpegAvailable: true, encoders: { h264Nvenc: true } },
  ollama: { baseUrl: 'http://localhost:11434', online: true, models: ['qwen3:8b'] },
  comfyui: {
    baseUrl: 'http://127.0.0.1:8188',
    online: true,
    detail: 'Online',
    layerWorkflowReady: true,
  },
  runtimePlan: {
    tier: 'workstation',
    ai: { nvidiaCudaAvailable: true, comfyConcurrency: 1 },
    encoding: { ffmpegAvailable: true, nvencAvailable: true, preferredH264Encoder: 'h264_nvenc' },
  },
  software: [],
  projections: [
    { id: 'scene-v2', title: 'Scene V2', status: 'ready', summary: 'Ready', basis: [] },
    { id: 'layers', title: 'Layers', status: 'ready', summary: 'Ready', basis: [] },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.route('**/api/chapters/1/reels', async (route) =>
    route.fulfill({ json: CHAPTER_ONE_SUMMARY }),
  );
  await page.route('**/api/runtime/capabilities', async (route) =>
    route.fulfill({ json: HOME_HOST }),
  );
});

test('opens on the Studio home and navigates project to chapter', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /Build stories into living reels/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Blessings of Sumer' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Enki and the World Order' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Chapter 2' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Chapter 3' })).toBeVisible();
  await expect(page.getByText('NVIDIA RTX Test', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Host System' })).toBeVisible();

  // The old reel workspace must not be mounted behind the new application home.
  await expect(page.getByLabel('Chapter one reel outline')).toHaveCount(0);

  await page.getByRole('link', { name: /Open Blessings of Sumer/i }).click();
  await expect(page).toHaveURL(/\/projects\/blessings-of-sumer$/);
  await expect(page.getByRole('heading', { name: 'Blessings of Sumer', level: 1 })).toBeVisible();

  await page.getByRole('link', { name: 'Open Chapter 1' }).click();
  await expect(page).toHaveURL(/\/projects\/blessings-of-sumer\/chapters\/1$/);
  await expect(page.getByRole('heading', { name: 'Enki and the World Order', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Voyage Begins' })).toBeVisible();
});

test('keeps the existing reel workspace as a focused routed view', async ({ page }) => {
  await mockReelWorkspace(page);
  await page.goto('/reels/1/overview');

  await expect(page.getByLabel('Chapter one reel outline')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Voyage Begins' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Studio Home' })).toBeVisible();

  await page.getByRole('link', { name: 'Studio Home' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: /Build stories into living reels/i })).toBeVisible();
  await expect(page.getByLabel('Chapter one reel outline')).toHaveCount(0);
});

async function mockReelWorkspace(page: import('@playwright/test').Page): Promise<void> {
  await page.route(
    '**/api/projects/blessings-of-sumer/chapters/1/narration',
    async (route) => route.fulfill({ json: DEFAULT_NARRATION_SETTINGS }),
  );
  await page.route('**/api/chapters/1/reels/1', async (route) =>
    route.fulfill({ json: REEL_ONE }),
  );
  await page.route('**/api/render-jobs**', async (route) => route.fulfill({ json: [] }));
  await page.route('**/api/generated-assets**', async (route) => route.fulfill({ json: [] }));
  await page.route('**/api/planning/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/capabilities')) {
      await route.fulfill({
        json: {
          defaultProvider: 'deterministic',
          providers: [
            { id: 'deterministic', available: true, text: true, vision: false, structuredOutput: true },
          ],
        },
      });
      return;
    }
    await route.fulfill({ json: null });
  });
}
