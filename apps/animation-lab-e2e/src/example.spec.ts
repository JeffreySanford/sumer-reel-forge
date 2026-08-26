import { test, expect } from '@playwright/test';

test('inspects and previews the golden Scene V3 fixture at exact frames', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Enki at the Helm' })).toBeVisible();
  await expect(page.getByText('frame 101 / 210')).toBeVisible();
  await expect(page.getByRole('button', { name: /BLINK_CLOSED frame 101/i })).toHaveAttribute('aria-pressed', 'true');
  const preview = page.getByRole('img', { name: 'Fake runtime preview at frame 101' });
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute('data-viewport-width', '1080');
  await expect(preview).toHaveAttribute('data-viewport-height', '1920');
  await expect(page.getByText('4 runtimes evaluated')).toBeVisible();
  await expect(page.getByText('EVIDENCE BOUND')).toBeVisible();
  await expect(page.getByText('9:16')).toBeVisible();

  const enki = page.locator('[data-runtime-node="actor-instance:enki:s03"]');
  await expect(enki).toHaveAttribute('data-local-x', '1.010');
  await expect(enki).toHaveAttribute('data-composed-x', '7.030');
  await expect(enki).toHaveAttribute('data-parent-id', 'prop:stag-of-absu');
  await expect(enki).toHaveAttribute('data-parent-chain', 'prop:stag-of-absu');
  await expect(enki).toHaveAttribute('data-capabilities', '2d-transform,world-state');
  await expect(
    page.locator('[data-parent-chain-row="actor-instance:enki:s03"]'),
  ).toContainText('prop:stag-of-absu');

  await page.getByRole('button', { name: /START frame 0/i }).click();
  await expect(page.getByText('frame 0 / 210')).toBeVisible();
  await expect(page.getByRole('button', { name: /START frame 0/i })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('img', { name: 'Fake runtime preview at frame 0' })).toBeVisible();
  await expect(page.locator('[data-runtime-node="prop:stag-of-absu"]')).toHaveAttribute(
    'data-runtime-x',
    '4.000',
  );
  await expect(
    page.locator('[data-composed-transform="actor-instance:enki:s03"]'),
  ).toHaveText('(4.000, 2.000)');

  await page.getByRole('tab', { name: 'QA' }).click();
  await expect(page.getByText('QA contracts are visible, not presumed passed')).toBeVisible();
  await expect(page.getByText('NOT_RUN')).toHaveCount(3);
});
