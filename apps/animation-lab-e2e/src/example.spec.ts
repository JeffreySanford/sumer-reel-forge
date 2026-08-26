import { test, expect, type Locator, type TestInfo } from '@playwright/test';

const SHOT03_WATER_SHA256 =
  'sha256:f77eb37906ae589b0483dd3a11504ee39cc1aa28500ec10dba5de14a3b6f8979';
const SHOT03_WATER_REGISTRATION_RECT =
  'shot03-water-v1:-0.287,0.000,1080.574,1920.000';
const SHOT03_WATER_MATERIAL_ID = 'shot03-water-micro-drift-v1';
const SHOT03_WATER_MATERIAL_BOUNDS =
  'shot03-water-micro-drift-v1:max-dx=2.400,max-dy=1.200,max-scale=1.006000';

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

async function capturePixiFrameEvidence(
  canvas: Locator,
  frame: number,
  stateId: string,
  expectedMaterialState: string,
  testInfo: TestInfo,
): Promise<void> {
  await expect(canvas).toHaveAttribute('data-pixi-frame', String(frame));
  await expect(canvas).toHaveAttribute('data-pixi-source-asset-sha256', SHOT03_WATER_SHA256);
  await expect(canvas).toHaveAttribute(
    'data-pixi-source-asset-registration-rect',
    SHOT03_WATER_REGISTRATION_RECT,
  );
  await expect(canvas).toHaveAttribute('data-pixi-source-asset-verification', 'verified');
  await expect(canvas).toHaveAttribute('data-pixi-material-count', '1');
  await expect(canvas).toHaveAttribute('data-pixi-material-ids', SHOT03_WATER_MATERIAL_ID);
  await expect(canvas).toHaveAttribute('data-pixi-material-state', expectedMaterialState);
  await expect(canvas).toHaveAttribute('data-pixi-material-bounds', SHOT03_WATER_MATERIAL_BOUNDS);
  await expect(canvas).toHaveAttribute(
    'data-pixi-material-containment',
    'shot03-water-micro-drift-v1:source-alpha',
  );
  await expect(canvas).toHaveAttribute(
    'data-pixi-material-time-source',
    'shot03-water-micro-drift-v1:exact-frame',
  );

  const intrinsicViewport = await canvas.evaluate((element) => {
    const pixiCanvas = element as HTMLCanvasElement;
    return { width: pixiCanvas.width, height: pixiCanvas.height };
  });
  expect(intrinsicViewport).toEqual({ width: 1080, height: 1920 });

  const screenshot = await canvas.screenshot({ animations: 'disabled' });
  expect(screenshot.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(screenshot.length).toBeGreaterThan(1_000);

  await testInfo.attach(`pixi-shot03-${stateId.toLowerCase()}-frame-${frame}`, {
    body: screenshot,
    contentType: 'image/png',
  });
}

test('renders the golden Scene V3 runtime model through Pixi at exact frames', async ({ page }, testInfo) => {
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
  await expect(pixiHost).toHaveAttribute('data-pixi-material-count', '1');

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
  await expect(canvas).toHaveAttribute('data-pixi-source-asset-dimensions', 'shot03-water-v1:941x1672');
  await expect(canvas).toHaveAttribute(
    'data-pixi-source-asset-registration',
    'shot03-water-v1:cover-center',
  );
  await expect(canvas).toHaveAttribute(
    'data-pixi-source-asset-registration-rect',
    SHOT03_WATER_REGISTRATION_RECT,
  );
  await expect(canvas).toHaveAttribute('data-pixi-source-asset-verification', 'verified');
  await capturePixiFrameEvidence(
    canvas,
    101,
    'BLINK_CLOSED',
    'shot03-water-micro-drift-v1:dx=0.500,dy=-1.127,scale=1.006000,settle=1.000,opacity=0.240',
    testInfo,
  );

  await expect(page.getByText('4 runtimes evaluated')).toBeVisible();
  await expect(page.getByText('EVIDENCE BOUND')).toBeVisible();
  await expect(page.getByText('9:16')).toBeVisible();
  await expect(page.getByText('ticker stopped')).toBeVisible();
  await expect(page.getByText('1 checksum-bound source asset')).toBeVisible();
  await expect(page.getByText('1 bounded exact-frame material')).toBeVisible();

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
  await expect(canvas).toHaveAttribute(
    'data-pixi-source-asset-registration-rect',
    SHOT03_WATER_REGISTRATION_RECT,
  );
  await expect(
    page.locator('[data-composed-transform="actor-instance:enki:s03"]'),
  ).toHaveText('(4.000, 2.000)');
  await capturePixiFrameEvidence(
    canvas,
    0,
    'START',
    'shot03-water-micro-drift-v1:dx=0.000,dy=0.000,scale=1.006000,settle=1.000,opacity=0.240',
    testInfo,
  );

  await page.getByRole('button', { name: /END_SETTLED frame 209/i }).click();
  await expect(page.getByText('frame 209 / 210')).toBeVisible();
  await expect(page.getByRole('button', { name: /END_SETTLED frame 209/i })).toHaveAttribute('aria-pressed', 'true');
  await expect(canvas).toHaveAttribute('aria-label', 'Pixi runtime preview at frame 209');
  await capturePixiFrameEvidence(
    canvas,
    209,
    'END_SETTLED',
    'shot03-water-micro-drift-v1:dx=0.935,dy=-0.220,scale=1.003300,settle=0.550,opacity=0.132',
    testInfo,
  );

  await page.getByRole('tab', { name: 'QA' }).click();
  await expect(page.getByText('QA contracts are visible, not presumed passed')).toBeVisible();
  await expect(page.getByText('NOT_RUN')).toHaveCount(3);
});
