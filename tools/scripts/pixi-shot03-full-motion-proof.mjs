import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const ROOT = resolve('.');
const BASE_URL = process.env.ANIMATION_LAB_BASE_URL ?? 'http://localhost:4300';
const OUTPUT_ROOT = resolve('tmp/animation-previews/pixi-shot03-full-motion-proof');
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const FPS = 30;
const START_FRAME = 0;
const END_FRAME = 209;
const FRAME_COUNT = END_FRAME - START_FRAME + 1;
const DURATION_SECONDS = FRAME_COUNT / FPS;
const SAMPLE_FRAMES = [0, 52, 101, 157, 209];
const EXPECTED_SOURCE_IDS = [
  'shot03-background-v1',
  'shot03-water-v1',
  'shot03-vessel-v1',
  'shot03-enki-body-v1',
  'shot03-enki-eyes-v1',
  'shot03-rigging-v1',
].join(',');
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

  console.log('Pixi Shot 3 full 7-second motion proof');
  console.log(`Animation Lab: ${BASE_URL}`);
  console.log(`Window: frames 0-209 · 210 frames · 30 fps · ${DURATION_SECONDS.toFixed(3)} s`);
  console.log('Motion: cinematic camera push + heavy vessel + delayed rigging + approved blink-state overlay');
  console.log('Water: static approved source detail for this proof');
  console.log(`Capture: browser-composited viewport-origin clip ${EXPECTED_CANVAS_WIDTH}x${EXPECTED_CANVAS_HEIGHT}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 2200 } });
  const page = await context.newPage();

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const host = page.locator('[aria-label="Pixi Shot 3 full-motion renderer"]');
    const canvas = page.locator('canvas[data-pixi-full-motion-surface="true"]');
    const frameControl = page.getByRole('group', { name: 'Exact frame control' });

    await waitForPixiReady(host);
    await assertReviewContract(host, canvas);
    await gotoFrame(frameControl, canvas, START_FRAME);

    console.log('[1/4] Capture all 210 exact Shot 3 frames...');
    const captures = [];
    for (let frame = START_FRAME; frame <= END_FRAME; frame += 1) {
      if (frame !== START_FRAME) {
        await frameControl.press('ArrowRight');
        await waitForCanvasFrame(canvas, frame);
      }
      const resolvedState = await fullMotionState(host, canvas);
      const screenshotPath = join(activeDirectory, `frame-${String(frame).padStart(4, '0')}.png`);
      const screenshot = await captureCanvasPng(page, canvas, screenshotPath);
      captures.push({
        frame,
        resolvedState,
        screenshotPath,
        screenshotSha256: prefixedSha(screenshot),
      });
    }

    const uniqueStates = new Set(captures.map((capture) => capture.resolvedState));
    const uniqueRenderedFrames = new Set(captures.map((capture) => capture.screenshotSha256));
    if (uniqueStates.size < 180) {
      throw new Error(`Full-motion proof resolved only ${uniqueStates.size} unique states across 210 frames.`);
    }
    if (uniqueRenderedFrames.size < 120) {
      throw new Error(`Full-motion proof produced only ${uniqueRenderedFrames.size} unique rendered frames.`);
    }

    console.log('[2/4] Revisit five proof frames and verify exact-frame repeatability...');
    const repeatability = [];
    for (const frame of SAMPLE_FRAMES) {
      await gotoFrame(frameControl, canvas, frame);
      const repeatedState = await fullMotionState(host, canvas);
      const repeatedPath = join(repeatDirectory, `frame-${String(frame).padStart(4, '0')}.png`);
      const repeated = await captureCanvasPng(page, canvas, repeatedPath);
      const repeatedHash = prefixedSha(repeated);
      const original = captures.find((capture) => capture.frame === frame);
      if (!original) throw new Error(`Missing original capture for frame ${frame}.`);
      const statePass = repeatedState === original.resolvedState;
      const pixelPass = repeatedHash === original.screenshotSha256;
      const pass = statePass && pixelPass;
      repeatability.push({
        frame,
        pass,
        statePass,
        pixelPass,
        originalState: original.resolvedState,
        repeatedState,
        originalSha256: original.screenshotSha256,
        repeatedSha256: repeatedHash,
      });
      if (!pass) {
        throw new Error(
          `Shot 3 full-motion repeatability failed at frame ${frame}: state=${statePass ? 'MATCH' : 'DIFF'}, pixels=${pixelPass ? 'MATCH' : 'DIFF'}.`,
        );
      }
    }

    console.log('[3/4] Encode active, frozen-control, and side-by-side A/B MP4s...');
    const activeVideoPath = join(outputDirectory, 'shot03-full-motion-active.mp4');
    const frozenVideoPath = join(outputDirectory, 'shot03-frozen-control.mp4');
    const abVideoPath = join(outputDirectory, 'shot03-frozen-vs-full-motion-ab.mp4');
    const frozenFramePath = join(outputDirectory, 'frozen-control-frame.png');
    await copyFile(captures[0].screenshotPath, frozenFramePath);
    encodeImageSequence(activeDirectory, activeVideoPath);
    encodeFrozenFrame(frozenFramePath, frozenVideoPath);
    encodeAbVideo(frozenVideoPath, activeVideoPath, abVideoPath);

    console.log('[4/4] Write full-shot proof receipt...');
    const blinkFrames = captures
      .filter((capture) => !capture.resolvedState.includes('blink=0.000'))
      .map((capture) => capture.frame);
    const reportPath = join(outputDirectory, 'pixi-shot03-full-motion-proof.json');
    const report = {
      schemaVersion: 1,
      proofType: 'pixi-shot03-full-motion-proof',
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
      motionChannels: [
        'cinematicSlow camera push',
        'heavyPhysical vessel heave/roll',
        '0.24s delayed riggingTension response',
        'approved blinkOnce character-state overlay',
      ],
      intentionallyExcluded: [
        'Pixi water micro-drift',
        'Pixi readable-ripple experiment',
        'Rive performance',
        'new water deformation',
      ],
      technicalEvidence: {
        captureSource: 'playwright-page-viewport-origin-css-clip',
        captureDimensions: { width: EXPECTED_CANVAS_WIDTH, height: EXPECTED_CANVAS_HEIGHT },
        capturedFrameCount: captures.length,
        uniqueResolvedStateCount: uniqueStates.size,
        uniqueRenderedFrameCount: uniqueRenderedFrames.size,
        blinkActiveFrames: blinkFrames,
        repeatability,
        pass: repeatability.every((item) => item.pass),
      },
      artifacts: {
        activeFramesDirectory: activeDirectory,
        frozenControlFrame: frozenFramePath,
        activeVideo: activeVideoPath,
        frozenControlVideo: frozenVideoPath,
        abVideo: abVideoPath,
        left: 'Frozen composed frame 0 for the full 7 seconds',
        right: 'Exact consecutive frames 0-209',
      },
      humanReview: {
        required: true,
        questions: [
          'Does the active 7-second shot clearly feel more alive than the frozen control?',
          'Is the slow camera push visible but restrained?',
          'Does the rigging read as delayed secondary motion rather than an independent wobble?',
          'Does the rigging remain clear of Enki face and preserve the composition?',
          'Is any blink visible at normal speed? Record this separately; the existing approved eye-state asset is already known to be weak.',
          'Is the active full shot preferable to the frozen control?',
        ],
      },
      interpretation:
        'This proof deliberately evaluates the full Shot 3 composition rather than another isolated micro-effect. Scene/frame evaluation owns every transform. Pixi receives only resolved exact-frame source-layer states and remains ticker-free. The existing approved water detail is held static so rejected water experiments cannot confound the review. The blink state is included for truthfulness but is not considered successful unless it is actually visible to a human at normal speed.',
    };
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    console.log('');
    console.log(
      `[PASS] ${captures.length} frames · ${uniqueStates.size} resolved states · ${uniqueRenderedFrames.size} rendered images · ${repeatability.length}/${repeatability.length} repeatability samples`,
    );
    console.log(`[REVIEW] full-resolution active: ${activeVideoPath}`);
    console.log(`[REVIEW] frozen vs active A/B: ${abVideoPath}`);
    console.log(`[INFO] proof receipt: ${reportPath}`);
    console.log('STATUS: TECHNICAL FULL-SHOT PROOF PASS — human normal-speed cinematic review remains required.');
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
    throw new Error(`Animation Lab returned HTTP ${response.status} at ${BASE_URL}.`);
  }
}

async function waitForPixiReady(host) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const state = await host.getAttribute('data-pixi-state');
    if (state === 'READY') return;
    if (state === 'ERROR') {
      throw new Error(`Pixi full-motion preview failed: ${(await host.getAttribute('data-pixi-error')) || 'unknown error'}`);
    }
    await delay(50);
  }
  throw new Error('Timed out waiting for Pixi full-motion preview READY state.');
}

async function assertReviewContract(host, canvas) {
  const checks = [
    [host, 'data-pixi-review-mode', 'full-motion'],
    [host, 'data-pixi-review-composition', 'shot03-full-motion-layers'],
    [host, 'data-pixi-source-asset-count', '6'],
    [canvas, 'data-pixi-source-asset-ids', EXPECTED_SOURCE_IDS],
    [canvas, 'data-pixi-source-asset-verification', 'verified'],
    [canvas, 'data-pixi-render-mode', 'manual-exact-frame'],
    [canvas, 'data-pixi-full-motion-surface', 'true'],
  ];
  for (const [locator, name, expected] of checks) {
    const actual = await locator.getAttribute(name);
    if (actual !== expected) {
      throw new Error(`Expected ${name}=${expected}, received ${actual ?? '<missing>'}.`);
    }
  }
}

async function fullMotionState(host, canvas) {
  const camera = await requiredAttribute(host, 'data-shot03-camera');
  const vessel = await requiredAttribute(host, 'data-shot03-vessel');
  const rigging = await requiredAttribute(host, 'data-shot03-rigging');
  const blink = await requiredAttribute(host, 'data-shot03-blink-opacity');
  const layers = await requiredAttribute(canvas, 'data-pixi-source-layer-state');
  const timeSource = await requiredAttribute(canvas, 'data-pixi-source-layer-time-source');
  return `camera=${camera}|vessel=${vessel}|rigging=${rigging}|blink=${blink}|layers=${layers}|time=${timeSource}`;
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
    await delay(20);
  }
  throw new Error(`Timed out waiting for Pixi full-motion canvas frame ${frame}.`);
}

async function captureCanvasPng(page, canvas, outputPath) {
  const originalStyles = await canvas.evaluate((element) => {
    const host = element.parentElement;
    return {
      width: element.width,
      height: element.height,
      canvasStyle: element.getAttribute('style'),
      hostStyle: host?.getAttribute('style') ?? null,
    };
  });

  if (originalStyles.width !== EXPECTED_CANVAS_WIDTH || originalStyles.height !== EXPECTED_CANVAS_HEIGHT) {
    throw new Error(
      `Pixi backing canvas is ${originalStyles.width}x${originalStyles.height}; expected ${EXPECTED_CANVAS_WIDTH}x${EXPECTED_CANVAS_HEIGHT}.`,
    );
  }

  await canvas.evaluate(
    (element, dimensions) => {
      const host = element.parentElement;
      if (host) host.style.overflow = 'visible';
      element.style.position = 'fixed';
      element.style.left = '0px';
      element.style.top = '0px';
      element.style.width = `${dimensions.width}px`;
      element.style.height = `${dimensions.height}px`;
      element.style.maxWidth = 'none';
      element.style.maxHeight = 'none';
      element.style.margin = '0';
      element.style.border = '0';
      element.style.borderRadius = '0';
      element.style.transform = 'none';
      element.style.boxSizing = 'content-box';
      element.style.zIndex = '2147483647';
    },
    { width: EXPECTED_CANVAS_WIDTH, height: EXPECTED_CANVAS_HEIGHT },
  );

  try {
    const box = await canvas.boundingBox();
    if (
      !box ||
      Math.abs(box.x) > 0.01 ||
      Math.abs(box.y) > 0.01 ||
      Math.round(box.width) !== EXPECTED_CANVAS_WIDTH ||
      Math.round(box.height) !== EXPECTED_CANVAS_HEIGHT
    ) {
      throw new Error(
        `Pixi capture element is ${box ? `x=${box.x},y=${box.y},${box.width}x${box.height}` : 'unavailable'}; expected x=0,y=0,${EXPECTED_CANVAS_WIDTH}x${EXPECTED_CANVAS_HEIGHT}.`,
      );
    }

    const png = await page.screenshot({
      path: outputPath,
      animations: 'disabled',
      scale: 'css',
      clip: { x: 0, y: 0, width: EXPECTED_CANVAS_WIDTH, height: EXPECTED_CANVAS_HEIGHT },
    });
    const dimensions = pngDimensions(png);
    if (dimensions.width !== EXPECTED_CANVAS_WIDTH || dimensions.height !== EXPECTED_CANVAS_HEIGHT) {
      throw new Error(
        `Captured Pixi PNG is ${dimensions.width}x${dimensions.height}; expected ${EXPECTED_CANVAS_WIDTH}x${EXPECTED_CANVAS_HEIGHT}.`,
      );
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

function pngDimensions(png) {
  if (png.length < 24 || png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error('Pixi evidence capture did not produce a valid PNG header.');
  }
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

async function requiredAttribute(locator, name) {
  const value = await locator.getAttribute(name);
  if (value === null) throw new Error(`Pixi full-motion proof is missing required attribute ${name}.`);
  return value;
}

function encodeImageSequence(activeDirectory, outputPath) {
  runFfmpeg([
    '-framerate', String(FPS),
    '-start_number', String(START_FRAME),
    '-i', join(activeDirectory, 'frame-%04d.png'),
    '-frames:v', String(FRAME_COUNT),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-r', String(FPS),
    outputPath,
  ]);
}

function encodeFrozenFrame(framePath, outputPath) {
  runFfmpeg([
    '-loop', '1',
    '-framerate', String(FPS),
    '-i', framePath,
    '-t', DURATION_SECONDS.toFixed(6),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-r', String(FPS),
    outputPath,
  ]);
}

function encodeAbVideo(frozenVideoPath, activeVideoPath, outputPath) {
  runFfmpeg([
    '-i', frozenVideoPath,
    '-i', activeVideoPath,
    '-filter_complex', '[0:v]scale=540:960[left];[1:v]scale=540:960[right];[left][right]hstack=inputs=2[v]',
    '-map', '[v]',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-r', String(FPS),
    '-shortest',
    outputPath,
  ]);
}

function runFfmpeg(args) {
  const result = spawnSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...args], {
    cwd: ROOT,
    stdio: 'inherit',
    windowsHide: true,
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffmpeg failed with exit code ${result.status ?? 1}.`);
}

function prefixedSha(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function delay(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}
