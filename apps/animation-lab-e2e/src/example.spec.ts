import { test, expect } from '@playwright/test';

test('renders the generated Animation Lab shell', async ({ page }) => {
  await page.goto('/');

  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).toContainText('Welcome animation-lab');
});
