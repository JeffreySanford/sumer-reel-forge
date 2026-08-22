import { test, expect } from '@playwright/test';
import {
  REEL_ONE,
  CHAPTER_ONE_REELS,
  CHAPTER_ONE_SUMMARY,
} from '@sumer-reel-forge/reel-core';

test('shows the routed first reel workspace', async ({ page }) => {
  await mockOperationalRoutes(page);
  await mockReelRoutes(page);

  await page.goto('/');

  await expect(page).toHaveURL(/\/reels\/1\/overview$/);
  await expect(page.getByRole('heading', { name: 'Reel Forge' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'The Voyage Begins' }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Shots' }).click();
  await expect(page).toHaveURL(/\/reels\/1\/shots$/);
  await expect(page.getByText('8 cinematic beats')).toBeVisible();

  await page.getByRole('link', { name: 'Script' }).click();
  await expect(page.getByText('Before Sumer...')).toBeVisible();
});

test('deep links load the requested reel and tab', async ({ page }) => {
  await mockOperationalRoutes(page);
  await mockReelRoutes(page);

  await page.goto('/reels/2/shots');

  await expect(page).toHaveURL(/\/reels\/2\/shots$/);
  await expect(
    page.getByRole('heading', { name: 'The Voice Beneath the Deep' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Shots' })).toHaveClass(/active/);
});

test('contains mobile horizontal scrollers inside the viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockOperationalRoutes(page, { includeAsset: true });
  await mockReelRoutes(page);

  await page.goto('/reels/1/assets');

  await expect(page.getByRole('heading', { name: 'Reel Forge' })).toBeVisible();
  const documentWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(documentWidth).toBeLessThanOrEqual(390);
});

test('edits, copies, saves, and queues a reel workflow across tabs', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => undefined,
      },
    });
  });
  await mockReelRoutes(page);
  await mockOperationalRoutes(page);
  await page.route('**/api/chapters/1/reels/1/production', async (route) => {
    const request = route.request().postDataJSON();
    await route.fulfill({
      json: {
        ...REEL_ONE,
        ...request,
      },
    });
  });

  await page.goto('/reels/1/script');
  await page.getByLabel('Logline').fill('Playwright edited logline.');

  await page.getByRole('link', { name: 'Shots' }).click();
  await page.getByRole('button', { name: 'Copy all prompts' }).click();
  await expect(page.getByText('All prompts copied')).toBeVisible();

  await page.getByRole('button', { name: 'Save edits' }).click();
  await expect(page.getByText('Production saved')).toBeVisible();

  await page.getByRole('link', { name: 'Overview' }).click();
  await page.getByRole('button', { name: 'Storyboard', exact: true }).click();
  await expect(
    page.getByText('Queued job playwright-render-job'),
  ).toBeVisible();
});

test('approves a reel and reviews a generated shot from focused tabs', async ({
  page,
}) => {
  let productionStatus = REEL_ONE.productionStatus;
  await page.route('**/api/chapters/1/reels', async (route) => {
    await route.fulfill({ json: CHAPTER_ONE_SUMMARY });
  });
  await page.route('**/api/chapters/1/reels/1', async (route) => {
    await route.fulfill({ json: { ...REEL_ONE, productionStatus } });
  });
  await page.route('**/api/chapters/1/reels/1/status', async (route) => {
    productionStatus = route.request().postDataJSON().status;
    await route.fulfill({ json: { ...REEL_ONE, productionStatus } });
  });
  await mockOperationalRoutes(page, { includeAsset: true });

  await page.goto('/reels/1/overview');
  await page.getByRole('button', { name: 'Move to review' }).click();
  await expect(page.getByText('Reel is review')).toBeVisible();
  await page.getByRole('button', { name: 'Move to approved' }).click();
  await expect(page.getByText('Reel is approved')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Final video' })).toBeEnabled();

  await page.getByRole('link', { name: 'Assets' }).click();
  await page.getByLabel('Review notes').fill('Approved visual continuity.');
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(page.getByText('Asset approved')).toBeVisible();
});

async function mockReelRoutes(page: import('@playwright/test').Page) {
  await page.route('**/api/chapters/1/reels', async (route) => {
    await route.fulfill({ json: CHAPTER_ONE_SUMMARY });
  });
  await page.route('**/api/chapters/1/reels/*', async (route) => {
    const url = new URL(route.request().url());
    const episodeId = Number(url.pathname.split('/').at(-1));
    const episode =
      CHAPTER_ONE_REELS.find((item) => item.episode === episodeId) ?? REEL_ONE;
    await route.fulfill({ json: episode });
  });
}

async function mockOperationalRoutes(
  page: import('@playwright/test').Page,
  options: { includeAsset?: boolean } = {},
) {
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
    if (url.pathname.endsWith('/runs/latest')) {
      await route.fulfill({ json: null });
      return;
    }
    await route.fulfill({ status: 404, json: { message: 'Not mocked' } });
  });

  await page.route('**/api/render-jobs**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/attempts') || url.pathname.endsWith('/logs')) {
      await route.fulfill({ json: [] });
      return;
    }
    if (request.method() === 'POST' && url.pathname.endsWith('/render-jobs')) {
      await route.fulfill({
        json: {
          id: 'playwright-render-job',
          episodeId: 1,
          mode: 'storyboard',
          status: 'queued',
          createdAt: new Date(0).toISOString(),
          attemptCount: 0,
        },
      });
      return;
    }
    await route.fulfill({
      json: options.includeAsset
        ? [
            {
              id: 'playwright-complete-job',
              episodeId: 1,
              mode: 'storyboard',
              status: 'complete',
              createdAt: new Date(0).toISOString(),
              attemptCount: 1,
            },
          ]
        : [],
    });
  });
  await page.route('**/api/generated-assets**', async (route) => {
    const request = route.request();
    if (request.method() === 'PATCH') {
      await route.fulfill({
        json: {
          id: 'playwright-shot-1',
          renderJobId: 'playwright-complete-job',
          shotNumber: 1,
          assetType: 'image',
          uri: 'file:///playwright-shot-1.png',
          contentUrl: '/favicon.ico',
          metadata: {},
          reviewStatus: request.postDataJSON().status,
          reviewNotes: request.postDataJSON().notes,
          createdAt: new Date(0).toISOString(),
        },
      });
      return;
    }
    await route.fulfill({
      json: options.includeAsset
        ? [
            {
              id: 'playwright-shot-1',
              renderJobId: 'playwright-complete-job',
              shotNumber: 1,
              assetType: 'image',
              uri: 'file:///playwright-shot-1.png',
              contentUrl: '/favicon.ico',
              metadata: {},
              reviewStatus: 'pending',
              createdAt: new Date(0).toISOString(),
            },
          ]
        : [],
    });
  });
}
