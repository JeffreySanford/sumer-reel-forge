import { test, expect, type Locator } from '@playwright/test';

const SHOT03_WATER_SHA256 =
  'sha256:f77eb37906ae589b0483dd3a11504ee39cc1aa28500ec10dba5de14a3b6f8979';

async function expectPixiReady(pixiHost: Locator): Promise<void> {
  await expect
    .poll(
      async () => {
        const state = await pixiHost.getAttribute('data-pixi-state');
        if (state === 'ERROR') {
          const message = await pixiHost.getAttribute('data-pixi-error');
          throw new Error(`Pixi preview failed before READY: ${message || 'unknown error'}`);
        }
        return state;
      },
      { timeout: 10_000 },
    )
    .toBe('READY');
}

test('renders the golden Scene V3 runtime model through Pixi at exact frames', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Enki at the Helm' })).toBeVisible();
  await expect(page.getByText('frame 101 / 210')).toBeVisible();
  await expect(page.getByRole('button', { name: /BLINK_CLOSED frame 101/i })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('PIXI RUNTIME PREVIEW')).toBeVisible();

  const pixiHost = page.locator('[aria-label="Pixi exact-frame renderer"]');
  await expectPixiReady(pixiHost);
  await expect(pixiHost).toHaveAttribute('data-pixi-error', '');
  await expect(pixiHost).toHaveAttribute('data-pixi-frame', '101');
  await expect(pixiHost).toHaveAttribute('data-pixi-node-count', '3');
  await expect(pixiHost).toHaveAttribute('data-pixi-source-asset-count', '1');

  const canvas = page.locator('canvas[data-pixi-canvas="true"]');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('aria-label', 'Pixi runtime preview at frame 101');
  await expect(canvas).toHaveAttribute('data-pixi-render-mode', 'manual-exact-frame');
  await expect(canvas).toHaveAttribute('data-pixi-frame', '101');
  await expect(canvas).toHaveAttribute('data-pixi-node-count', '3');
  await expect(canvas).toHaveAttribute('data-viewport-width', '1080');
  await expect(canvas).toHaveAttribute('data-viewport-height', '1920');
  await expect(canvas).toHaveAttribute('data-pixi-source-asset-count', '1');
  await expect(canvas).toHaveAttribute('data-pixi-source-asset-ids', 'shot03-water-v1');
  await expect(canvas).toHaveAttribute('data-pixi-source-asset-sha256', SHOT03_WATER_SHA256);
  await expect(canvas).toHaveAttribute('data-pixi-source-asset-verification', 'verified');

  await expect(page.getByText('4 runtimes evaluated')).toBeVisible();
  await expect(page.getByText('EVIDENCE BOUND')).toBeVisible();
  await expect(page.getByText('9:16')).toBeVisible();
  await expect(page.getByText('ticker stopped')).toBeVisible();
  await expect(page.getByText('1 checksum-bound source asset')).toBeVisible();

  await expect(
    page.locator('[data-local-transform="actor-instance:enki:s03"]'),
  ).toHaveText('(1.010, 0.000)');
  await expect(
    page.locator('[data-composed-transform="actor-instance:enki:s03"]'),
  ).toHaveText('(7.030, 2.505)');
  await expect(
    page.locator('[data-parent-chain-row="actor-instance:enki:s03"]'),
  ).toContainText('prop:stag-of-absu');
  await expect(
    page.locator('[data-capabilities-row="actor-instance:enki:s03"]'),
  ).toContainText('2d-transform');

  await page.getByRole('button', { name: /START frame 0/i }).click();
  await expect(page.getByText('frame 0 / 210')).toBeVisible();
  await expect(page.getByRole('button', { name: /START frame 0/i })).toHaveAttribute('aria-pressed', 'true');
  await expect(canvas).toHaveAttribute('aria-label', 'Pixi runtime preview at frame 0');
  await expect(canvas).toHaveAttribute('data-pixi-frame', '0');
  await expect(canvas).toHaveAttribute('data-pixi-source-asset-sha256', SHOT03_WATER_SHA256);
  await expect(
    page.locator('[data-composed-transform="actor-instance:enki:s03"]'),
  ).toHaveText('(4.000, 2.000)');

  await page.getByRole('tab', { name: 'QA' }).click();
  await expect(page.getByText('QA contracts are visible, not presumed passed')).toBeVisible();
  await expect(page.getByText('NOT_RUN')).toHaveCount(3);
});
