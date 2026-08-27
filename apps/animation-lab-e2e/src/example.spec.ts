import { test, expect, type Locator, type TestInfo } from '@playwright/test';

const SHOT03_SOURCE_IDS = [
  'shot03-background-v1',
  'shot03-water-v1',
  'shot03-vessel-v1',
  'shot03-enki-body-v1',
  'shot03-enki-eyes-v1',
  'shot03-rigging-v1',
].join(',');
const SHOT03_SOURCE_SHA256 = [
  'sha256:db4b1c33afc38bd93543bd9eba8cb5b992ddfa0d3a8ca989d992bd060ec3f2b1',
  'sha256:f77eb37906ae589b0483dd3a11504ee39cc1aa28500ec10dba5de14a3b6f8979',
  'sha256:fe28b4ec5cd0efd724908a106649db782f685f76cd0e34d01e085af02467c3d4',
  'sha256:3c7cdfdbde7776f91cf4b3f81908443b56194931a74654ecdbdb5798917aa6f5',
  'sha256:b1d40abaaa8a8d29d368f5063eab35d172f6e70158e97b4facba7142d407d9e7',
  'sha256:1f3e6add78d406d3f17ee618604da37eef9b2a8bf403650ba98986f4ab82d5f7',
].join(',');

async function expectPixiReady(pixiHost: Locator): Promise<void> {
  await expect
    .poll(
      async () => {
        const state = await pixiHost.getAttribute('data-pixi-state');
        if (state === 'ERROR') {
          const message = await pixiHost.getAttribute('data-pixi-error');
          throw new Error(`Pixi full-motion preview failed before READY: ${message || 'unknown error'}`);
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
  testInfo: TestInfo,
): Promise<void> {
  await expect(canvas).toHaveAttribute('data-pixi-frame', String(frame));
  await expect(canvas).toHaveAttribute('data-pixi-source-asset-ids', SHOT03_SOURCE_IDS);
  await expect(canvas).toHaveAttribute('data-pixi-source-asset-sha256', SHOT03_SOURCE_SHA256);
  await expect(canvas).toHaveAttribute('data-pixi-source-asset-verification', 'verified');
  await expect(canvas).toHaveAttribute('data-pixi-render-mode', 'manual-exact-frame');
  await expect(canvas).toHaveAttribute('data-pixi-full-motion-surface', 'true');
  await expect(canvas).toHaveAttribute('data-pixi-source-layer-time-source', /exact-frame/);

  const intrinsicViewport = await canvas.evaluate((element) => {
    const pixiCanvas = element as HTMLCanvasElement;
    return { width: pixiCanvas.width, height: pixiCanvas.height };
  });
  expect(intrinsicViewport).toEqual({ width: 1080, height: 1920 });

  const screenshot = await canvas.screenshot({ animations: 'disabled' });
  expect(screenshot.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(screenshot.length).toBeGreaterThan(1_000);
  await testInfo.attach(`pixi-shot03-full-motion-${stateId.toLowerCase()}-frame-${frame}`, {
    body: screenshot,
    contentType: 'image/png',
  });
}

test('renders the full Shot 3 motion review through Pixi at exact frames', async ({ page }, testInfo) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Enki at the Helm' })).toBeVisible();
  await expect(page.getByText('frame 101 / 210', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /BLINK_CLOSED frame 101/i })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('PIXI RUNTIME PREVIEW', { exact: true })).toBeVisible();

  const pixiHost = page.locator('[aria-label="Pixi Shot 3 full-motion renderer"]');
  await expectPixiReady(pixiHost);
  await expect(pixiHost).toHaveAttribute('data-pixi-error', '');
  await expect(pixiHost).toHaveAttribute('data-pixi-frame', '101');
  await expect(pixiHost).toHaveAttribute('data-pixi-source-asset-count', '6');
  await expect(pixiHost).toHaveAttribute('data-pixi-review-mode', 'full-motion');
  await expect(pixiHost).toHaveAttribute('data-pixi-review-composition', 'shot03-full-motion-layers');
  await expect(pixiHost).toHaveAttribute('data-shot03-camera', 'x=-2.973,y=-4.162,scale=1.014271');
  await expect(pixiHost).toHaveAttribute('data-shot03-vessel', 'heave=-4.095,roll=-0.001257');
  await expect(pixiHost).toHaveAttribute('data-shot03-rigging', 'x=-0.712,y=-3.781,rot=-0.156403,lag=0.240');
  await expect(pixiHost).toHaveAttribute('data-shot03-blink-opacity', '1.000');

  const canvas = page.locator('canvas[data-pixi-full-motion-surface="true"]');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('aria-label', 'Pixi Shot 3 full-motion preview at frame 101');
  await expect(canvas).toHaveAttribute('data-viewport-width', '1080');
  await expect(canvas).toHaveAttribute('data-viewport-height', '1920');
  await expect(canvas).toHaveAttribute(
    'data-pixi-source-layer-state',
    /shot03-vessel-v1:x=-2\.973,y=-8\.258,scale=1\.014271,rot=-0\.001257,opacity=1\.000/,
  );
  await expect(canvas).toHaveAttribute(
    'data-pixi-source-layer-state',
    /shot03-enki-body-v1:x=-2\.973,y=-8\.258,scale=1\.014271,rot=-0\.001257,opacity=1\.000/,
  );
  await expect(canvas).toHaveAttribute(
    'data-pixi-source-layer-state',
    /shot03-enki-eyes-v1:x=-2\.973,y=-8\.258,scale=1\.014271,rot=-0\.001257,opacity=1\.000/,
  );
  await capturePixiFrameEvidence(canvas, 101, 'BLINK_CLOSED', testInfo);

  await expect(page.getByText('4 runtimes evaluated', { exact: true })).toBeVisible();
  await expect(page.getByText('EVIDENCE BOUND', { exact: true })).toBeVisible();
  await expect(page.getByText('9:16', { exact: true })).toBeVisible();
  await expect(page.getByText('full 7-second motion review', { exact: true })).toBeVisible();
  await expect(page.getByText('camera + vessel + delayed rigging + blink state', { exact: true })).toBeVisible();
  await expect(page.getByText('water held static for this proof', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /START frame 0/i }).click();
  await expect(page.getByText('frame 0 / 210', { exact: true })).toBeVisible();
  await expect(pixiHost).toHaveAttribute('data-shot03-camera', 'x=0.000,y=0.000,scale=1.000000');
  await expect(pixiHost).toHaveAttribute('data-shot03-blink-opacity', '0.000');
  await capturePixiFrameEvidence(canvas, 0, 'START', testInfo);

  await page.getByRole('button', { name: /END_SETTLED frame 209/i }).click();
  await expect(page.getByText('frame 209 / 210', { exact: true })).toBeVisible();
  await expect(pixiHost).toHaveAttribute('data-shot03-camera', 'x=-5.000,y=-7.000,scale=1.024000');
  await expect(pixiHost).toHaveAttribute('data-shot03-blink-opacity', '0.000');
  await capturePixiFrameEvidence(canvas, 209, 'END_SETTLED', testInfo);

  await page.getByRole('tab', { name: 'QA' }).click();
  await expect(page.getByText('QA contracts are visible, not presumed passed', { exact: true })).toBeVisible();
  await expect(page.getByText('NOT_RUN', { exact: true })).toHaveCount(3);
});
