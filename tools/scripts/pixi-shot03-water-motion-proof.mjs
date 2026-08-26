import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const ROOT = resolve('.');
const BASE_URL = process.env.ANIMATION_LAB_BASE_URL ?? 'http://localhost:4300';
const OUTPUT_ROOT = resolve('tmp/animation-previews/pixi-shot03-water-motion-proof');
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const FPS = 30;
const START_FRAME = 72;
const END_FRAME = 131;
const FRAME_COUNT = END_FRAME - START_FRAME + 1;
const DURATION_SECONDS = FRAME_COUNT / FPS;
const SAMPLE_FRAMES = [72, 87, 101, 116, 131];
const EXPECTED_SOURCE_IDS =
  'shot03-background-v1,shot03-water-v1,shot03-vessel-v1,shot03-enki-body-v1';
const EXPECTED_MATERIAL_ID = 'shot03-water-micro-drift-v1';
const EXPECTED_CANVAS_WIDTH = 1080;
const EXPECTED_CANVAS_HEIGHT = 1920;

void main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});

async function main() {
  await assertAnimationLabReachable();

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDirectory = join(OUTPUT_ROOT, stamp);
  const activeDirectory = join(outputDirectory, 'active');
  const repeatDirectory = join(outputDirectory, 'repeat-samples');
  await Promise.all([
    mkdir(activeDirectory, { recursive: true }),
    mkdir(repeatDirectory, { recursive: true }),
  ]);

  console.log('Pixi Shot 3 bounded-water normal-speed motion proof');
  console.log(`Animation Lab: ${BASE_URL}`);
  console.log(
    `Window: frames ${START_FRAME}-${END_FRAME} · ${FRAME_COUNT} frames · ${FPS} fps · ${DURATION_SECONDS.toFixed(3)} s`,
  );
  console.log(
    `Capture: browser-composited 1:1 Pixi canvas ${EXPECTED_CANVAS_WIDTH}x${EXPECTED_CANVAS_HEIGHT}`,
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 2200 },
  });
  const page = await context.newPage();

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const host = page.locator('[aria-label="Pixi exact-frame renderer"]');
    const canvas = page.locator('canvas[data-pixi-canvas="true"]');
    const frameControl = page.getByRole('group', { name: 'Exact frame control' });

    await waitForPixiReady(host);
    await assertReviewContract(host, canvas);
    await gotoFrame(frameControl, canvas, START_FRAME);

    console.log('[1/4] Capture 60 exact consecutive Pixi frames...');
    const captures = [];
    for (let frame = START_FRAME; frame <= END_FRAME; frame += 1) {
      if (frame !== START_FRAME) {
        await frameControl.press('ArrowRight');
        await waitForCanvasFrame(canvas, frame);
      }

      const materialState = await requiredAttribute(canvas, 'data-pixi-material-state');
      const screenshotPath = join(activeDirectory, `frame-${String(frame).padStart(4, '0')}.png`);
      const screenshot = await captureCanvasPng(canvas, screenshotPath);
      captures.push({
        frame,
        materialState,
        screenshotPath,
        screenshotSha256: prefixedSha(screenshot),
      });
    }

    const uniqueMaterialStates = new Set(captures.map((capture) => capture.materialState));
    const uniqueScreenshotHashes = new Set(captures.map((capture) => capture.screenshotSha256));
    if (uniqueMaterialStates.size < Math.ceil(FRAME_COUNT * 0.5)) {
      throw new Error(
        `Pixi water proof resolved only ${uniqueMaterialStates.size} unique material states across ${FRAME_COUNT} frames.`,
      );
    }
    if (uniqueScreenshotHashes.size < Math.ceil(FRAME_COUNT * 0.25)) {
      throw new Error(
        `Pixi water proof produced only ${uniqueScreenshotHashes.size} unique rendered frames across ${FRAME_COUNT} captures.`,
      );
    }

    console.log('[2/4] Revisit proof frames and verify exact-frame repeatability...');
    const repeatability = [];
    for (const frame of SAMPLE_FRAMES) {
      await gotoFrame(frameControl, canvas, frame);
      const repeatedMaterialState = await requiredAttribute(canvas, 'data-pixi-material-state');
      const repeatedPath = join(repeatDirectory, `frame-${String(frame).padStart(4, '0')}.png`);
      const repeated = await captureCanvasPng(canvas, repeatedPath);
      const repeatedHash = prefixedSha(repeated);
      const original = captures.find((capture) => capture.frame === frame);
      if (!original) throw new Error(`Missing original capture for repeatability frame ${frame}.`);

      const statePass = repeatedMaterialState === original.materialState;
      const pixelPass = repeatedHash === original.screenshotSha256;
      const pass = statePass && pixelPass;
      repeatability.push({
        frame,
        pass,
        statePass,
        pixelPass,
        originalMaterialState: original.materialState,
        repeatedMaterialState,
        originalSha256: original.screenshotSha256,
        repeatedSha256: repeatedHash,
        repeatedPath,
      });
      if (!pass) {
        throw new Error(
          `Pixi exact-frame repeatability failed at frame ${frame}: state=${statePass ? 'MATCH' : 'DIFF'}, pixels=${pixelPass ? 'MATCH' : 'DIFF'}.`,
        );
      }
    }

    console.log('[3/4] Encode active, frozen-control, and side-by-side A/B MP4s...');
    const activeVideoPath = join(outputDirectory, 'shot03-water-active.mp4');
    const frozenVideoPath = join(outputDirectory, 'shot03-water-frozen-control.mp4');
    const abVideoPath = join(outputDirectory, 'shot03-water-frozen-vs-active-ab.mp4');
    const frozenFramePath = join(outputDirectory, 'frozen-control-frame.png');
    await copyFile(captures[0].screenshotPath, frozenFramePath);

    encodeImageSequence(activeDirectory, activeVideoPath);
    encodeFrozenFrame(frozenFramePath, frozenVideoPath);
    encodeAbVideo(frozenVideoPath, activeVideoPath, abVideoPath);

    console.log('[4/4] Write proof receipt...');
    const report = {
      schemaVersion: 1,
      proofType: 'pixi-shot03-bounded-water-normal-speed-motion-proof',
      generatedAt: new Date().toISOString(),
      animationLabBaseUrl: BASE_URL,
      frameWindow: {
        startFrame: START_FRAME,
        endFrame: END_FRAME,
        frameCount: FRAME_COUNT,
        fps: FPS,
        durationSeconds: DURATION_SECONDS,
      },
      exactFrameAuthority: true,
      sourceAssets: EXPECTED_SOURCE_IDS.split(','),
      materialId: EXPECTED_MATERIAL_ID,
      technicalEvidence: {
        captureSource: 'playwright-element-screenshot-1to1-css',
        captureDimensions: {
          width: EXPECTED_CANVAS_WIDTH,
          height: EXPECTED_CANVAS_HEIGHT,
        },
        capturedFrameCount: captures.length,
        uniqueMaterialStateCount: uniqueMaterialStates.size,
        uniqueRenderedFrameCount: uniqueScreenshotHashes.size,
        repeatability,
        pass: repeatability.every((item) => item.pass),
      },
      artifacts: {
        activeFramesDirectory: activeDirectory,
        frozenControlFrame: frozenFramePath,
        activeVideo: activeVideoPath,
        frozenControlVideo: frozenVideoPath,
        abVideo: abVideoPath,
        left: `Frozen composed control at frame ${START_FRAME}`,
        right: `Exact consecutive frames ${START_FRAME}-${END_FRAME}`,
      },
      humanReview: {
        required: true,
        normalSpeedAbRequired: true,
        questions: [
          'Does the active water feel alive at normal speed rather than merely numerically different?',
          'Is the motion restrained enough to preserve the painterly source?',
          'Do water highlights avoid obvious doubling, smearing, or synthetic wobble?',
          'Do vessel and Enki remain perceptually stable against the moving water?',
          'Is the active side preferable to the frozen control?',
        ],
      },
      interpretation:
        'The left A/B lane freezes the composed artwork at the first proof frame while the right lane advances only through exact Scene V3 frames. In the current artwork-review composition, background, vessel, and Enki artwork remain static; the bounded water material is therefore the intended perceptual difference. Evidence PNGs use Playwright element screenshots while temporarily presenting the intrinsic 1080x1920 Pixi canvas at a 1:1 CSS size. This keeps the browser-composited capture path that already proved repeatable while excluding responsive down-scaling and odd H.264 dimensions. Repeatability requires both the exact material-state evidence string and the captured PNG bytes to match.',
    };
    const reportPath = join(outputDirectory, 'pixi-shot03-water-motion-proof.json');
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    console.log('');
    console.log(
      `[PASS] ${captures.length} frames · ${uniqueMaterialStates.size} material states · ${uniqueScreenshotHashes.size} rendered images · ${repeatability.length}/${repeatability.length} repeatability samples`,
    );
    console.log(`[REVIEW] normal-speed A/B: ${abVideoPath}`);
    console.log(`[INFO] active motion: ${activeVideoPath}`);
    console.log(`[INFO] proof receipt: ${reportPath}`);
    console.log('STATUS: TECHNICAL MOTION PROOF PASS — human normal-speed A/B remains required.');
  } finally {
    await context.close();
    await browser.close();
  }
}

async function assertAnimationLabReachable() {
  let response;
  try {
    response = await fetch(BASE_URL);
  } catch (error) {
    throw new Error(
      `Animation Lab is not reachable at ${BASE_URL}. Start it with "pnpm start:all" before running this proof. ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!response.ok) {
    throw new Error(
      `Animation Lab returned HTTP ${response.status} at ${BASE_URL}. Start or repair "pnpm start:all" before running this proof.`,
    );
  }
}

async function waitForPixiReady(host) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const state = await host.getAttribute('data-pixi-state');
    if (state === 'READY') return;
    if (state === 'ERROR') {
      throw new Error(
        `Pixi preview failed before READY: ${(await host.getAttribute('data-pixi-error')) || 'unknown error'}`,
      );
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
  }
  throw new Error('Timed out waiting for Pixi preview READY state.');
}

async function assertReviewContract(host, canvas) {
  const checks = [
    [host, 'data-pixi-review-mode', 'artwork'],
    [host, 'data-pixi-review-composition', 'shot03-required-layers'],
    [host, 'data-pixi-source-asset-count', '4'],
    [host, 'data-pixi-material-count', '1'],
    [canvas, 'data-pixi-source-asset-ids', EXPECTED_SOURCE_IDS],
    [canvas, 'data-pixi-source-asset-verification', 'verified'],
    [canvas, 'data-pixi-material-ids', EXPECTED_MATERIAL_ID],
    [canvas, 'data-pixi-material-time-source', `${EXPECTED_MATERIAL_ID}:exact-frame`],
    [canvas, 'data-pixi-material-containment', `${EXPECTED_MATERIAL_ID}:source-alpha`],
  ];

  for (const [locator, name, expected] of checks) {
    const actual = await locator.getAttribute(name);
    if (actual !== expected) {
      throw new Error(`Expected ${name}=${expected}, received ${actual ?? '<missing>'}.`);
    }
  }
}

async function gotoFrame(frameControl, canvas, frame) {
  await frameControl.press('Home');
  const tens = Math.floor(frame / 10);
  const remainder = frame % 10;
  for (let index = 0; index < tens; index += 1) await frameControl.press('PageDown');
  for (let index = 0; index < remainder; index += 1) await frameControl.press('ArrowRight');
  await waitForCanvasFrame(canvas, frame);
}

async function waitForCanvasFrame(canvas, frame) {
  const expected = String(frame);
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if ((await canvas.getAttribute('data-pixi-frame')) === expected) return;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 20));
  }
  throw new Error(`Timed out waiting for Pixi canvas frame ${frame}.`);
}

async function captureCanvasPng(canvas, outputPath) {
  const originalStyles = await canvas.evaluate((element) => {
    const host = element.parentElement;
    return {
      width: element.width,
      height: element.height,
      canvasStyle: element.getAttribute('style'),
      hostStyle: host?.getAttribute('style') ?? null,
    };
  });

  if (
    originalStyles.width !== EXPECTED_CANVAS_WIDTH ||
    originalStyles.height !== EXPECTED_CANVAS_HEIGHT
  ) {
    throw new Error(
      `Pixi backing canvas is ${originalStyles.width}x${originalStyles.height}; expected ${EXPECTED_CANVAS_WIDTH}x${EXPECTED_CANVAS_HEIGHT}.`,
    );
  }

  await canvas.evaluate(
    (element, dimensions) => {
      const host = element.parentElement;
      element.style.width = `${dimensions.width}px`;
      element.style.height = `${dimensions.height}px`;
      element.style.maxWidth = 'none';
      element.style.maxHeight = 'none';
      if (host) {
        host.style.width = `${dimensions.width}px`;
        host.style.height = `${dimensions.height}px`;
        host.style.maxHeight = 'none';
        host.style.overflow = 'visible';
      }
    },
    { width: EXPECTED_CANVAS_WIDTH, height: EXPECTED_CANVAS_HEIGHT },
  );

  try {
    const box = await canvas.boundingBox();
    if (
      !box ||
      Math.round(box.width) !== EXPECTED_CANVAS_WIDTH ||
      Math.round(box.height) !== EXPECTED_CANVAS_HEIGHT
    ) {
      throw new Error(
        `Pixi capture element is ${box ? `${box.width}x${box.height}` : 'unavailable'}; expected ${EXPECTED_CANVAS_WIDTH}x${EXPECTED_CANVAS_HEIGHT}.`,
      );
    }

    const png = await canvas.screenshot({
      path: outputPath,
      animations: 'disabled',
    });
    if (!png.length) {
      throw new Error('Pixi canvas screenshot produced an empty PNG.');
    }
    return png;
  } finally {
    await canvas.evaluate((element, styles) => {
      if (styles.canvasStyle === null) element.removeAttribute('style');
      else element.setAttribute('style', styles.canvasStyle);

      const host = element.parentElement;
      if (host) {
        if (styles.hostStyle === null) host.removeAttribute('style');
        else host.setAttribute('style', styles.hostStyle);
      }
    }, originalStyles);
  }
}

async function requiredAttribute(locator, name) {
  const value = await locator.getAttribute(name);
  if (value === null) throw new Error(`Pixi canvas is missing required attribute ${name}.`);
  return value;
}

function encodeImageSequence(activeDirectory, outputPath) {
  runFfmpeg([
    '-framerate',
    String(FPS),
    '-start_number',
    String(START_FRAME),
    '-i',
    join(activeDirectory, 'frame-%04d.png'),
    '-frames:v',
    String(FRAME_COUNT),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-r',
    String(FPS),
    outputPath,
  ]);
}

function encodeFrozenFrame(framePath, outputPath) {
  runFfmpeg([
    '-loop',
    '1',
    '-framerate',
    String(FPS),
    '-i',
    framePath,
    '-t',
    DURATION_SECONDS.toFixed(6),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-r',
    String(FPS),
    outputPath,
  ]);
}

function encodeAbVideo(frozenVideoPath, activeVideoPath, outputPath) {
  runFfmpeg([
    '-i',
    frozenVideoPath,
    '-i',
    activeVideoPath,
    '-filter_complex',
    '[0:v]scale=540:960[left];[1:v]scale=540:960[right];[left][right]hstack=inputs=2[v]',
    '-map',
    '[v]',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-r',
    String(FPS),
    '-shortest',
    outputPath,
  ]);
}

function runFfmpeg(args) {
  const result = spawnSync(
    FFMPEG,
    ['-y', '-hide_banner', '-loglevel', 'error', ...args],
    {
      cwd: ROOT,
      stdio: 'inherit',
      windowsHide: true,
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed with exit code ${result.status ?? 1}.`);
  }
}

function prefixedSha(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}
