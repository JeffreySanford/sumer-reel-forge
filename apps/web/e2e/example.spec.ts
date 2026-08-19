import { test, expect } from '@playwright/test';

test('shows the first reel storyboard dashboard', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Reel Forge' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'The Voyage Begins' }),
  ).toBeVisible();
  await expect(page.getByText('8 cinematic beats')).toBeVisible();
  await expect(page.getByText('Before Sumer...')).toBeVisible();
});
