import { test, expect } from '@playwright/test';

test('inspects and previews the golden Scene V3 fixture at exact frames', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Enki at the Helm' })).toBeVisible();
  await expect(page.getByText('frame 101 / 210')).toBeVisible();
  await expect(page.getByRole('button', { name: /BLINK_CLOSED frame 101/i })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('img', { name: 'Fake runtime preview at frame 101' })).toBeVisible();
  await expect(page.getByText('4 runtimes evaluated')).toBeVisible();
  await expect(page.locator('[data-runtime-node="actor-instance:enki:s03"]')).toHaveAttribute(
    'data-runtime-x',
    '7.030',
  );

  await page.getByRole('button', { name: /START frame 0/i }).click();
  await expect(page.getByText('frame 0 / 210')).toBeVisible();
  await expect(page.getByRole('button', { name: /START frame 0/i })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('img', { name: 'Fake runtime preview at frame 0' })).toBeVisible();
  await expect(page.locator('[data-runtime-node="prop:stag-of-absu"]')).toHaveAttribute(
    'data-runtime-x',
    '4.000',
  );

  await page.getByRole('tab', { name: 'QA' }).click();
  await expect(page.getByText('QA contracts are visible, not presumed passed')).toBeVisible();
  await expect(page.getByText('NOT_RUN')).toHaveCount(3);
});