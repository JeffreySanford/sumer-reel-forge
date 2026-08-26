import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const BASE_URL = process.env.ANIMATION_LAB_BASE_URL ?? 'http://localhost:4300';
const OUTPUT_ROOT = resolve(
  'tmp/animation-previews/pixi-shot03-secondary-motion-isolation-proof',
);
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const FPS = 30;
const START_FRAME = 0;
const END_FRAME = 89;
const FRAME_COUNT = END_FRAME - START_FRAME + 1;
const DURATION_SECONDS = FRAME_COUNT / FPS;
const SAMPLE_FRAMES = [0, 22, 44, 66, 89];
const EXPECTED_CANVAS_WIDTH = 1080;
const EXPECTED_CANVAS_HEIGHT = 1920;
const EXPECTED_SOURCE_IDS = [
  'shot03-background-v1',
  'shot03-water-v1',
  'shot03-vessel-v1',
  'shot03-enki-body-v1',
  'shot03-enki-eyes-v1',
  'shot03-rigging-v1',
].join(',');

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  await assertAnimationLabReachable();
  const reviewUrl = new URL(BASE_URL);
  reviewUrl.searchParams.set('shot03-motion-profile', 'secondary-isolation');

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDirectory = join(OUTPUT_ROOT, stamp);
  const activeDirectory = join(outputDirectory, 'active');
  const repeatDirectory = join(outputDirectory, 'repeat-samples');
  await Promise.all([
    mkdir(activeDirectory, { recursive: true }),
    mkdir(repeatDirectory, { recursive: true }),
  ]);

  console.log('Pixi Shot 3 decisive secondary-motion isolation proof');
  console.log(`Animation Lab: ${reviewUrl}`);
  console.log(
    `Window: frames ${START_FRAME}-${END_FRAME} · ${FRAME_COUNT} frames · ${FPS} fps · ${DURATION_SECONDS.toFixed(3)} s`,
  );
  console.log('Camera/background/water: FROZEN');
  console.log('Diagnostic motion: vessel/Enki ±18px heave, up to ±0.6° roll; rigging strongly amplified');
  console.log('Purpose: prove or reject the current full-canvas source-layer transform path');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 2200 } });
  const page = await context.newPage();

  try {
    await page.goto(reviewUrl.toString(), { waitUntil: 'networkidle' });
    const host = page.locator('[aria-label="Pixi Shot 3 full-motion renderer"]');
    const canvas = page.locator('canvas[data-pixi-full-motion-surface="true"]');
    const frameControl = page.getByRole('group', { name: 'Exact frame control' });

    await waitForPixiReady(host);
    await assertIsolationContract(host, canvas);
    await gotoFrame(frameControl, canvas, START_FRAME);

    console.log('[1/4] Capture 90 exact camera-frozen isolation frames...');
    const captures = [];
    for (let frame = START_FRAME; frame <= END_FRAME; frame += 1) {
      if (frame !== START_FRAME) {
        await frameControl.press('ArrowRight');
        await waitForCanvasFrame(canvas, frame);
      }
      const state = await isolationState(host, canvas);
      const screenshotPath = join(
        activeDirectory,
        `frame-${String(frame).padStart(4, '0')}.png`,
      );
      const screenshot = await captureCanvasPng(page, canvas, screenshotPath);
      captures.push({
        frame,
        state,
        screenshotPath,
        screenshotSha256: prefixedSha(screenshot),
      });
    }

    const uniqueStates = new Set(captures.map((capture) => capture.state));
    const uniqueImages = new Set(captures.map((capture) => capture.screenshotSha256));
    if (uniqueStates.size < 80) {
      throw new Error(
        `Isolation proof resolved only ${uniqueStates.size} unique states across ${FRAME_COUNT} frames.`,
      );
    }
    if (uniqueImages.size < 60) {
      throw new Error(
        `Isolation proof produced only ${uniqueImages.size} unique rendered images across ${FRAME_COUNT} frames.`,
      );
    }

    console.log('[2/4] Revisit five exact frames for byte/state repeatability...');
    const repeatability = [];
    for (const frame of SAMPLE_FRAMES) {
      await gotoFrame(frameControl, canvas, frame);
      const repeatedState = await isolationState(host, canvas);
      const repeatedPath = join(
        repeatDirectory,
        `frame-${String(frame).padStart(4, '0')}.png`,
      );
      const repeated = await captureCanvasPng(page, canvas, repeatedPath);
      const repeatedSha256 = prefixedSha(repeated);
      const original = captures.find((capture) => capture.frame === frame);
      if (!original) throw new Error(`Missing original isolation capture for frame ${frame}.`);
      const statePass = repeatedState === original.state;
      const pixelPass = repeatedSha256 === original.screenshotSha256;
      const pass = statePass && pixelPass;
      repeatability.push({ frame, pass, statePass, pixelPass });
      if (!pass) {
        throw new Error(
          `Isolation repeatability failed at frame ${frame}: state=${statePass ? 'MATCH' : 'DIFF'}, pixels=${pixelPass ? 'MATCH' : 'DIFF'}.`,
        );
      }
    }

    console.log('[3/4] Encode full-resolution active and frozen-vs-active A/B videos...');
    const activeVideoPath = join(outputDirectory, 'shot03-secondary-isolation-active.mp4');
    const frozenVideoPath = join(outputDirectory, 'shot03-secondary-isolation-frozen.mp4');
    const abVideoPath = join(outputDirectory, 'shot03-secondary-isolation-ab.mp4');
    const frozenFramePath = join(outputDirectory, 'frozen-control-frame.png');
    await copyFile(captures[0].screenshotPath, frozenFramePath);
    encodeImageSequence(activeDirectory, activeVideoPath);
    encodeFrozenFrame(frozenFramePath, frozenVideoPath);
    encodeAbVideo(frozenVideoPath, activeVideoPath, abVideoPath);

    console.log('[4/4] Write diagnostic receipt...');
    const reportPath = join(outputDirectory, 'pixi-shot03-secondary-motion-isolation-proof.json');
    const report = {
      schemaVersion: 1,
      proofType: 'pixi-shot03-secondary-motion-isolation-proof',
      generatedAt: new Date().toISOString(),
      animationLabUrl: reviewUrl.toString(),
      profile: 'secondary-isolation',
      frameWindow: {
        startFrame: START_FRAME,
        endFrame: END_FRAME,
        frameCount: FRAME_COUNT,
        fps: FPS,
        durationSeconds: DURATION_SECONDS,
      },
      exactFrameAuthority: true,
      sourceAssets: EXPECTED_SOURCE_IDS.split(','),
      diagnosticContract: {
        cameraFrozen: true,
        backgroundFrozen: true,
        waterFrozen: true,
        vesselHeaveGainFromCinematicCandidate: 4,
        vesselRollGainFromCinematicCandidate: 6,
        riggingXGainFromCinematicCandidate: 5,
        riggingYGainFromCinematicCandidate: 4,
        riggingRotationGainFromCinematicCandidate: 6,
        productionMotionClaim: false,
      },
      technicalEvidence: {
        capturedFrameCount: captures.length,
        uniqueResolvedStateCount: uniqueStates.size,
        uniqueRenderedImageCount: uniqueImages.size,
        repeatability,
        pass: repeatability.every((item) => item.pass),
      },
      artifacts: {
        activeVideo: activeVideoPath,
        abVideo: abVideoPath,
        frozenControlVideo: frozenVideoPath,
        activeFramesDirectory: activeDirectory,
        left: 'Frozen isolation frame 0',
        right: 'Camera-frozen exact frames with deliberately exaggerated vessel/Enki/rigging transforms',
      },
      humanDecision: {
        required: true,
        question:
          'Is vessel/Enki/rigging motion immediately and unmistakably visible on the active side?',
        ifYes:
          'The source-layer transform path is functional; stop guessing and calibrate down from an obvious reference before adding pivoted performance.',
        ifNo:
          'Reject full-canvas source-layer transforms for secondary articulation and implement proper local pivots/groups before further motion tuning.',
      },
    };
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    console.log('');
    console.log(
      `[PASS] ${captures.length} frames · ${uniqueStates.size} states · ${uniqueImages.size} images · ${repeatability.length}/${repeatability.length} repeatability samples`,
    );
    console.log(`[REVIEW] full-resolution isolation: ${activeVideoPath}`);
    console.log(`[REVIEW] frozen vs isolation A/B: ${abVideoPath}`);
    console.log(`[INFO] diagnostic receipt: ${reportPath}`);
    console.log(
      'STATUS: TECHNICAL ISOLATION PASS — human answer must be an immediate YES/NO on visible secondary motion.',
    );
  } finally {
    await context.close();
    await browser.close();
  }
}

async function assertAnimationLabReachable() {
  try {
    const response = await fetch(BASE_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    throw new Error(
      `Animation Lab is not reachable at ${BASE_URL}. Start it with "pnpm start:all". ${error instanceof Error ? error.message : String(error)}`,
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
        `Pixi isolation preview failed: ${(await host.getAttribute('data-pixi-error')) || 'unknown error'}`,
      );
    }
    await delay(50);
  }
  throw new Error('Timed out waiting for Pixi isolation preview READY state.');
}

async function assertIsolationContract(host, canvas) {
  const checks = [
    [host, 'data-shot03-motion-profile', 'secondary-isolation'],
    [host, 'data-shot03-camera', 'x=0.000,y=0.000,scale=1.000000'],
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

async function isolationState(host, canvas) {
  const camera = await requiredAttribute(host, 'data-shot03-camera');
  const vessel = await requiredAttribute(host, 'data-shot03-vessel');
  const rigging = await requiredAttribute(host, 'data-shot03-rigging');
  const layers = await requiredAttribute(canvas, 'data-pixi-source-layer-state');
  return `camera=${camera}|vessel=${vessel}|rigging=${rigging}|layers=${layers}`;
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
  throw new Error(`Timed out waiting for Pixi isolation frame ${frame}.`);
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
        `Pixi isolation capture geometry is ${box ? `x=${box.x},y=${box.y},${box.width}x${box.height}` : 'unavailable'}; expected viewport origin at ${EXPECTED_CANVAS_WIDTH}x${EXPECTED_CANVAS_HEIGHT}.`,
      );
    }
    const png = await page.screenshot({
      path: outputPath,
      animations: 'disabled',
      scale: 'css',
      clip: {
        x: 0,
        y: 0,
        width: EXPECTED_CANVAS_WIDTH,
        height: EXPECTED_CANVAS_HEIGHT,
      },
    });
    if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
      throw new Error('Isolation capture did not produce a PNG.');
    }
    if (png.readUInt32BE(16) !== EXPECTED_CANVAS_WIDTH || png.readUInt32BE(20) !== EXPECTED_CANVAS_HEIGHT) {
      throw new Error(
        `Isolation PNG is ${png.readUInt32BE(16)}x${png.readUInt32BE(20)}; expected ${EXPECTED_CANVAS_WIDTH}x${EXPECTED_CANVAS_HEIGHT}.`,
      );
    }
    return png;
  } finally {
    await canvas.evaluate((element, styles) => {
      const host = element.parentElement;
      if (styles.canvasStyle === null) element.removeAttribute('style');
      else element.setAttribute('style', styles.canvasStyle);
      if (host) {
        if (styles.hostStyle === null) host.removeAttribute('style');
        else host.setAttribute('style', styles.hostStyle);
      }
    }, originalStyles);
  }
}

function encodeImageSequence(directory, outputPath) {
  runFfmpeg([
    '-y',
    '-framerate',
    String(FPS),
    '-start_number',
    String(START_FRAME),
    '-i',
    join(directory, 'frame-%04d.png'),
    '-frames:v',
    String(FRAME_COUNT),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    outputPath,
  ]);
}

function encodeFrozenFrame(framePath, outputPath) {
  runFfmpeg([
    '-y',
    '-loop',
    '1',
    '-i',
    framePath,
    '-t',
    DURATION_SECONDS.toFixed(3),
    '-r',
    String(FPS),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    outputPath,
  ]);
}

function encodeAbVideo(frozenPath, activePath, outputPath) {
  runFfmpeg([
    '-y',
    '-i',
    frozenPath,
    '-i',
    activePath,
    '-filter_complex',
    '[0:v]scale=540:960[left];[1:v]scale=540:960[right];[left][right]hstack=inputs=2[v]',
    '-map',
    '[v]',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    outputPath,
  ]);
}

function runFfmpeg(args) {
  const result = spawnSync(FFMPEG, args, { stdio: 'pipe', encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(
      `FFmpeg failed with exit ${result.status ?? 'unknown'}:\n${result.stderr || result.stdout}`,
    );
  }
}

function prefixedSha(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

async function requiredAttribute(locator, name) {
  const value = await locator.getAttribute(name);
  if (value === null) throw new Error(`Missing required isolation evidence attribute ${name}.`);
  return value;
}

function delay(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}
