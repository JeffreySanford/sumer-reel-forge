import { test, expect } from '@playwright/test';
import { REEL_ONE, CHAPTER_ONE_SUMMARY } from '@sumer-reel-forge/reel-core';

test('shows the first reel storyboard dashboard', async ({ page }) => {
  await page.route('**/api/chapters/1/reels', async (route) => {
    await route.fulfill({ json: CHAPTER_ONE_SUMMARY });
  });
  await page.route('**/api/chapters/1/reels/1', async (route) => {
    await route.fulfill({ json: REEL_ONE });
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Reel Forge' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'The Voyage Begins' }),
  ).toBeVisible();
  await expect(page.getByText('8 cinematic beats')).toBeVisible();
  await expect(page.getByText('Before Sumer...')).toBeVisible();
});

test('edits, copies, saves, and queues a reel workflow', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => undefined,
      },
    });
  });
  await page.route('**/api/chapters/1/reels', async (route) => {
    await route.fulfill({ json: CHAPTER_ONE_SUMMARY });
  });
  await page.route('**/api/chapters/1/reels/1', async (route) => {
    await route.fulfill({ json: REEL_ONE });
  });
  await page.route('**/api/chapters/1/reels/1/production', async (route) => {
    const request = route.request().postDataJSON();
    await route.fulfill({
      json: {
        ...REEL_ONE,
        ...request,
      },
    });
  });
  await page.route('**/api/render-jobs', async (route) => {
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
  });

  await page.goto('/');
  await page.getByLabel('Logline').fill('Playwright edited logline.');
  await page.getByRole('button', { name: 'Copy all prompts' }).click();
  await expect(page.getByText('All prompts copied')).toBeVisible();

  await page.getByRole('button', { name: 'Save edits' }).click();
  await expect(page.getByText('Production saved')).toBeVisible();

  await page.getByRole('button', { name: 'Queue storyboard' }).click();
  await expect(
    page.getByText('Queued job playwright-render-job'),
  ).toBeVisible();
});
