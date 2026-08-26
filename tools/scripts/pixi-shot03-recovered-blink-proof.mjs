import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { maybeOpenReviewArtifacts } from './open-review-artifacts.mjs';
import { reviewGeneratedMedia } from './review-generated-media.mjs';

const ROOT = resolve('.');
const BASE_URL = process.env.ANIMATION_LAB_BASE_URL ?? 'http://localhost:4300';
const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const PRIMARY_PROOF_ROOT = resolve(
  'tmp/animation-previews/pixi-shot03-recovered-motion-proof',
);
const OUTPUT_ROOT = resolve(
  'tmp/animation-previews/pixi-shot03-recovered-blink-proof',
);
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const FPS = 30;
const START_FRAME = 0;
const END_FRAME = 209;
const FRAME_COUNT = 210;
const DURATION_SECONDS = FRAME_COUNT / FPS;
const ACTIVE_PROFILE = 'recovered-blink-active';
const EXPECTED_SOURCE_IDS = [
  'shot03-background-v1',
  'shot03-water-v1',
  'shot03-vessel-v1',
  'shot03-enki-body-v1',
  'shot03-enki-eyes-v1',
  'shot03-rigging-v1',
];
const HIDDEN_LAYER_IDS = ['shot03-water-v1', 'shot03-rigging-v1'];
const SAMPLE_FRAMES = [0, 97, 101, 106, 209];
const WIDTH = 1080;
const HEIGHT = 1920;
const PIXELS = WIDTH * HEIGHT;
const options = parseOptions(process.argv.slice(2));

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  await assertAnimationLabReachable();
  const recovery = await latestRecoveryPackage();
  const primary = await latestPassingPrimaryProof();
  const sourceBytes = {
    background: await readFile(recovery.backgroundPath),
    vessel: await readFile(recovery.vesselPath),
    enki: await readFile(recovery.enkiPath),
  };
  const sourceHashes = {
    background: prefixedSha(sourceBytes.background),
    vessel: prefixedSha(sourceBytes.vessel),
    enki: prefixedSha(sourceBytes.enki),
  };
  assertPrimarySourceIdentity(primary.report, sourceHashes);

  const controlFramesDirectory = resolve(
    primary.report.artifacts?.activeFramesDirectory ?? '',
  );
  const controlVideoPath = resolve(primary.report.artifacts?.activeVideo ?? '');
  for (const path of [controlFramesDirectory, controlVideoPath]) {
    if (!path || !existsSync(path)) {
      throw new Error(`Accepted recovered-primary control artifact is missing: ${path}`);
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDirectory = join(OUTPUT_ROOT, stamp);
  const activeDirectory = join(outputDirectory, 'blink-active');
  const repeatDirectory = join(outputDirectory, 'repeat-samples');
  await Promise.all([
    mkdir(activeDirectory, { recursive: true }),
    mkdir(repeatDirectory, { recursive: true }),
  ]);

  console.log('Pixi Shot 3 recovered blink-only reintegration proof');
  console.log(`Animation Lab: ${BASE_URL}`);
  console.log(`Accepted primary control: ${primary.reportPath}`);
  console.log(`Background: ${recovery.backgroundPath}`);
  console.log(`Vessel: ${recovery.vesselPath}`);
  console.log(`Enki: ${recovery.enkiPath}`);
  console.log('Control: previously accepted recovered-primary frame sequence.');
  console.log('Active: identical camera + vessel/Enki motion with only closed-eye overlay enabled during canonical blink timing.');
  console.log('Legacy water and rigging remain hidden. No canonical mutation or promotion.');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 2200 } });
  const page = await context.newPage();

  try {
    await installRecoveryRoutes(page, sourceBytes);

    console.log('');
    console.log('[1/6] Capture 210-frame blink-active pass...');
    const active = await captureBlinkProfile({
      page,
      outputDirectory: activeDirectory,
      sourceHashes,
    });

    console.log('[2/6] Verify exact-frame blink-active repeatability...');
    const repeatability = await verifyRepeatability({
      page,
      sourceHashes,
      originals: active.captures,
      outputDirectory: repeatDirectory,
    });

    console.log('[3/6] Compare against accepted recovered-primary pixels...');
    const comparisons = [];
    for (const capture of active.captures) {
      const controlPath = join(
        controlFramesDirectory,
        `frame-${String(capture.frame).padStart(4, '0')}.png`,
      );
      if (!existsSync(controlPath)) {
        throw new Error(`Accepted primary control frame is missing: ${controlPath}`);
      }
      const controlHash = prefixedSha(await readFile(controlPath));
      comparisons.push({
        frame: capture.frame,
        blinkOpacity: capture.blinkOpacity,
        activeBlink: capture.blinkOpacity > 0,
        differs: controlHash !== capture.screenshotSha256,
        controlPath,
        controlSha256: controlHash,
        activePath: capture.screenshotPath,
        activeSha256: capture.screenshotSha256,
      });
    }

    const blinkFrames = comparisons.filter((item) => item.activeBlink).map((item) => item.frame);
    const differingFrames = comparisons.filter((item) => item.differs).map((item) => item.frame);
    const unexpectedFrames = comparisons
      .filter((item) => item.differs && !item.activeBlink)
      .map((item) => item.frame);
    const missingBlinkDifferences = comparisons
      .filter((item) => item.activeBlink && !item.differs)
      .map((item) => item.frame);

    if (blinkFrames.join(',') !== '97,98,99,100,101,102,103,104,105,106') {
      throw new Error(`Unexpected recovered blink window: ${blinkFrames.join(',') || '<none>'}.`);
    }
    if (unexpectedFrames.length) {
      throw new Error(
        `Blink proof changed pixels outside the blink window at frames: ${unexpectedFrames.join(', ')}.`,
      );
    }
    if (missingBlinkDifferences.length) {
      throw new Error(
        `Closed-eye overlay produced no pixel difference at active blink frames: ${missingBlinkDifferences.join(', ')}.`,
      );
    }

    const apex = active.captures.reduce((best, capture) =>
      capture.blinkOpacity > best.blinkOpacity ? capture : best,
    );
    const apexControlPath = join(
      controlFramesDirectory,
      `frame-${String(apex.frame).padStart(4, '0')}.png`,
    );
    const localization = comparePixelLocalization(apexControlPath, apex.screenshotPath);
    if (localization.changedPixels <= 0 || !localization.bounds) {
      throw new Error('Blink apex produced no localized rendered pixel difference.');
    }
    if (localization.changedFrameRatio > 0.02) {
      throw new Error(
        `Blink apex affects ${(localization.changedFrameRatio * 100).toFixed(3)}% of the frame; expected a localized eye-state overlay.`,
      );
    }

    console.log(
      `[LOCALIZATION] apex frame ${apex.frame} · changed=${localization.changedPixels} px (${(localization.changedFrameRatio * 100).toFixed(4)}%) · bbox=${formatBox(localization.bounds)}`,
    );

    console.log('[4/6] Encode blink-active and matched A/B review media...');
    const activeVideoPath = join(outputDirectory, 'shot03-recovered-blink-active.mp4');
    const abVideoPath = join(outputDirectory, 'shot03-recovered-primary-vs-blink-ab.mp4');
    const apexPairPath = join(
      outputDirectory,
      `shot03-blink-apex-frame-${String(apex.frame).padStart(4, '0')}.png`,
    );
    const focusedPairPath = join(
      outputDirectory,
      `shot03-blink-focused-frame-${String(apex.frame).padStart(4, '0')}.png`,
    );
    encodeImageSequence(activeDirectory, activeVideoPath);
    encodeAbVideo(controlVideoPath, activeVideoPath, abVideoPath);
    createPairStill(apexControlPath, apex.screenshotPath, apexPairPath);
    createFocusedPair(
      apexControlPath,
      apex.screenshotPath,
      paddedBox(localization.bounds, 90, WIDTH, HEIGHT),
      focusedPairPath,
    );

    console.log('[5/6] Local vision review of blink perceptibility and registration...');
    const aiPath = join(outputDirectory, 'ollama-recovered-blink-review.json');
    let ai = null;
    if (!options.noAiReview) {
      ai = await reviewGeneratedMedia({
        artifacts: [
          {
            path: recovery.staticRecompositionPath,
            label: 'human-accepted recovered static Shot 3 composition',
          },
          {
            path: controlVideoPath,
            label: 'previously accepted recovered-primary motion with blink disabled',
          },
          {
            path: activeVideoPath,
            label: 'same recovered-primary motion with closed-eye overlay enabled only during blink window',
          },
          {
            path: abVideoPath,
            label: 'matched A/B: left accepted primary control, right blink-active; all motion except eye overlay is identical',
          },
          {
            path: apexPairPath,
            label: `full-frame control versus blink-active at apex frame ${apex.frame}`,
          },
          {
            path: focusedPairPath,
            label: `magnified localized blink difference at apex frame ${apex.frame}`,
          },
        ],
        task: [
          'Review this as a bounded blink-only reintegration proof for recovered Shot 3.',
          'The accepted recovered-primary camera and vessel/Enki motion are the control. The right side adds only the existing closed-eye overlay during frames 97-106.',
          `Deterministic isolation: differingFrames=${differingFrames.join(',')}; unexpectedOutsideBlink=${unexpectedFrames.length}; apexChangedPixels=${localization.changedPixels}; apexChangedFrameRatio=${localization.changedFrameRatio}.`,
          'The closed-eye asset is already known to be visually small, so do not claim perceptual success merely because deterministic pixels changed.',
          'Judge whether the blink is actually noticeable at normal speed, remains planted to Enki while the vessel moves, and avoids halo/flicker/ghosting.',
          'PASS_ADVISORY means technically clean enough for human review. Human normal-speed perception remains authoritative for whether the blink itself succeeds.',
        ].join(' '),
        rubric: [
          'blink difference is localized to Enki face/eye region',
          'closed-eye overlay remains registered to the moving Enki body',
          'no frame-wide changes, halo, ghosting, or detached eye artifact',
          'normal-speed blink perceptibility is reported separately from technical correctness',
        ],
        outputPath: aiPath,
        requireAi: options.requireAiReview,
        maxVideoSamples: 5,
      });
    } else {
      console.log('[ai] recovered blink review skipped by --no-ai-review');
    }

    console.log('[6/6] Write blink reintegration receipt...');
    const technicalPass =
      repeatability.every((item) => item.pass) &&
      unexpectedFrames.length === 0 &&
      missingBlinkDifferences.length === 0 &&
      differingFrames.length === blinkFrames.length &&
      localization.changedPixels > 0 &&
      localization.changedFrameRatio <= 0.02;
    const reportPath = join(outputDirectory, 'pixi-shot03-recovered-blink-proof.json');
    const report = {
      schemaVersion: 1,
      proofType: 'pixi-shot03-recovered-blink-only-proof',
      generatedAt: new Date().toISOString(),
      sourcePrimaryMotionProofPath: primary.reportPath,
      sourceStaticProofPath: recovery.staticProofPath,
      sourceAssets: {
        background: { path: recovery.backgroundPath, sha256: sourceHashes.background },
        vessel: { path: recovery.vesselPath, sha256: sourceHashes.vessel },
        enki: { path: recovery.enkiPath, sha256: sourceHashes.enki },
        eyes: 'canonical shot03-enki-eyes-v1 checksum-bound source asset',
      },
      compositionPolicy: {
        acceptedPrimaryMotionFrozen: true,
        addedSecondaryChannel: 'blink-only',
        hiddenLegacyLayers: HIDDEN_LAYER_IDS,
        waterReactivated: false,
        riggingReactivated: false,
        canonicalAssetsMutated: false,
        canonicalManifestMutated: false,
        automaticPromotionAllowed: false,
      },
      frameWindow: {
        startFrame: START_FRAME,
        endFrame: END_FRAME,
        frameCount: FRAME_COUNT,
        fps: FPS,
        durationSeconds: DURATION_SECONDS,
        blinkFrames,
      },
      isolation: {
        differingFrames,
        unexpectedFramesOutsideBlink: unexpectedFrames,
        missingBlinkDifferences,
        apexFrame: apex.frame,
        apexBlinkOpacity: apex.blinkOpacity,
        apexLocalization: localization,
      },
      technicalEvidence: {
        uniqueResolvedStateCount: active.uniqueResolvedStateCount,
        uniqueRenderedFrameCount: active.uniqueRenderedFrameCount,
        repeatability,
        pass: technicalPass,
      },
      aiReviewPath: options.noAiReview ? null : aiPath,
      aiStatus: ai?.status ?? null,
      artifacts: {
        blinkActiveFramesDirectory: activeDirectory,
        acceptedPrimaryControlVideo: controlVideoPath,
        blinkActiveVideo: activeVideoPath,
        blinkAbVideo: abVideoPath,
        apexPair: apexPairPath,
        focusedApexPair: focusedPairPath,
      },
      humanReview: {
        required: true,
        primaryMotionContext: 'Human accepted the recovered-primary motion as much smoother before this proof.',
        questions: [
          'Can you actually see a natural blink at normal speed?',
          'Does the blink remain attached to Enki while the vessel moves?',
          'Is there any halo, flicker, ghosting, or detached eye artifact?',
          'Does adding the blink improve the shot enough to keep it?',
        ],
      },
      promotionAllowed: false,
      nextSecondaryChannelAllowed: false,
    };
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    console.log('');
    console.log(
      `[PASS] technical blink proof: ${technicalPass ? 'PASS' : 'FAIL'} · blink frames=${blinkFrames.join(',')} · differing=${differingFrames.length}/${FRAME_COUNT} · outside-blink differences=${unexpectedFrames.length} · repeatability=${repeatability.filter((item) => item.pass).length}/${repeatability.length}`,
    );
    if (ai?.status) console.log(`[INFO] local vision status: ${ai.status}`);
    console.log(`[REVIEW] blink active: ${activeVideoPath}`);
    console.log(`[REVIEW] primary vs blink A/B: ${abVideoPath}`);
    console.log(`[REVIEW] focused apex: ${focusedPairPath}`);
    console.log(`[INFO] proof receipt: ${reportPath}`);
    console.log('[STOP] Human normal-speed blink visibility remains the gate. Do not add rigging or water yet.');

    await maybeOpenReviewArtifacts(
      [activeVideoPath, abVideoPath, focusedPairPath],
      { enabled: !options.noOpen, delayMs: 120 },
    );

    if (!technicalPass) process.exitCode = 2;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function latestRecoveryPackage() {
  const entries = await readdir(CANDIDATE_ROOT, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory() && entry.name.includes('shot03-roi-background'))
    .map((entry) => join(CANDIDATE_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));

  for (const directory of directories) {
    const staticProofPath = join(
      directory,
      'static-recomposition-proof',
      'shot03-static-recomposition-proof.json',
    );
    const backgroundQaPath = join(directory, 'background-qa.json');
    if (!existsSync(staticProofPath) || !existsSync(backgroundQaPath)) continue;
    try {
      const staticProof = JSON.parse(await readFile(staticProofPath, 'utf8'));
      const backgroundQa = JSON.parse(await readFile(backgroundQaPath, 'utf8'));
      if (staticProof.technicalStaticRecompositionPass !== true || backgroundQa.pass !== true) continue;
      const backgroundPath = resolve(staticProof.backgroundCandidatePath);
      const vesselPath = resolve(staticProof.vesselPath);
      const enkiPath = resolve(staticProof.enkiPath);
      const staticRecompositionPath = resolve(staticProof.artifacts?.recomposed ?? '');
      for (const path of [backgroundPath, vesselPath, enkiPath, staticRecompositionPath]) {
        if (!path || !existsSync(path)) throw new Error(`Missing recovery artifact ${path}.`);
      }
      return {
        directory,
        staticProofPath,
        backgroundQaPath,
        backgroundPath,
        vesselPath,
        enkiPath,
        staticRecompositionPath,
      };
    } catch {
      continue;
    }
  }
  throw new Error('No passing recovered Shot 3 static package found.');
}

async function latestPassingPrimaryProof() {
  const entries = await readdir(PRIMARY_PROOF_ROOT, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(PRIMARY_PROOF_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  for (const directory of directories) {
    const reportPath = join(directory, 'pixi-shot03-recovered-motion-proof.json');
    if (!existsSync(reportPath)) continue;
    try {
      const report = JSON.parse(await readFile(reportPath, 'utf8'));
      if (report.proofType !== 'pixi-shot03-recovered-primary-motion-proof') continue;
      if (report.technicalEvidence?.pass !== true) continue;
      if (report.aiStatus && report.aiStatus !== 'PASS_ADVISORY') continue;
      return { directory, reportPath, report };
    } catch {
      continue;
    }
  }
  throw new Error(
    'No passing recovered-primary motion proof found. Run pixi-shot03-recovered-motion-proof.mjs first.',
  );
}

function assertPrimarySourceIdentity(report, sourceHashes) {
  for (const [name, expected] of Object.entries(sourceHashes)) {
    const actual = report.sourceAssets?.[name]?.sha256;
    if (actual !== expected) {
      throw new Error(`Accepted primary proof ${name} digest ${actual ?? '<missing>'} != current ${expected}.`);
    }
  }
}

async function installRecoveryRoutes(page, sourceBytes) {
  await page.route('**/__shot03-recovery/background.png', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: sourceBytes.background }),
  );
  await page.route('**/__shot03-recovery/vessel.png', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: sourceBytes.vessel }),
  );
  await page.route('**/__shot03-recovery/enki.png', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: sourceBytes.enki }),
  );
}

async function captureBlinkProfile({ page, outputDirectory, sourceHashes }) {
  await page.goto(reviewUrl(sourceHashes), { waitUntil: 'networkidle' });
  const host = page.locator('[aria-label="Pixi Shot 3 full-motion renderer"]');
  const canvas = page.locator('canvas[data-pixi-full-motion-surface="true"]');
  const frameControl = page.getByRole('group', { name: 'Exact frame control' });
  await waitForPixiReady(host);
  await assertBlinkContract(host, canvas, sourceHashes);
  await gotoFrame(frameControl, canvas, START_FRAME);

  const captures = [];
  for (let frame = START_FRAME; frame <= END_FRAME; frame += 1) {
    if (frame !== START_FRAME) {
      await frameControl.press('ArrowRight');
      await waitForCanvasFrame(canvas, frame);
    }
    const blinkOpacity = Number(
      await requiredAttribute(host, 'data-shot03-blink-opacity'),
    );
    const resolvedState = await fullMotionState(host, canvas);
    const screenshotPath = join(
      outputDirectory,
      `frame-${String(frame).padStart(4, '0')}.png`,
    );
    const screenshot = await captureCanvasPng(page, canvas, screenshotPath);
    captures.push({
      frame,
      blinkOpacity,
      resolvedState,
      screenshotPath,
      screenshotSha256: prefixedSha(screenshot),
    });
  }

  return {
    captures,
    uniqueResolvedStateCount: new Set(captures.map((item) => item.resolvedState)).size,
    uniqueRenderedFrameCount: new Set(captures.map((item) => item.screenshotSha256)).size,
  };
}

async function verifyRepeatability({ page, sourceHashes, originals, outputDirectory }) {
  await page.goto(reviewUrl(sourceHashes), { waitUntil: 'networkidle' });
  const host = page.locator('[aria-label="Pixi Shot 3 full-motion renderer"]');
  const canvas = page.locator('canvas[data-pixi-full-motion-surface="true"]');
  const frameControl = page.getByRole('group', { name: 'Exact frame control' });
  await waitForPixiReady(host);
  await assertBlinkContract(host, canvas, sourceHashes);

  const result = [];
  for (const frame of SAMPLE_FRAMES) {
    await gotoFrame(frameControl, canvas, frame);
    const repeatedState = await fullMotionState(host, canvas);
    const repeatedPath = join(outputDirectory, `frame-${String(frame).padStart(4, '0')}.png`);
    const repeated = await captureCanvasPng(page, canvas, repeatedPath);
    const repeatedHash = prefixedSha(repeated);
    const original = originals[frame];
    const pass =
      original &&
      original.resolvedState === repeatedState &&
      original.screenshotSha256 === repeatedHash;
    result.push({ frame, pass, repeatedHash, originalHash: original?.screenshotSha256 ?? null });
    if (!pass) throw new Error(`Recovered blink repeatability failed at frame ${frame}.`);
  }
  return result;
}

function reviewUrl(sourceHashes) {
  const url = new URL(BASE_URL);
  url.searchParams.set('shot03-motion-profile', ACTIVE_PROFILE);
  url.searchParams.set('shot03-recovery-background-sha256', sourceHashes.background);
  url.searchParams.set('shot03-recovery-vessel-sha256', sourceHashes.vessel);
  url.searchParams.set('shot03-recovery-enki-sha256', sourceHashes.enki);
  return url.toString();
}

async function assertBlinkContract(host, canvas, sourceHashes) {
  const checks = [
    [host, 'data-pixi-review-mode', 'recovered-blink-motion'],
    [host, 'data-pixi-review-composition', 'shot03-recovered-primary-plus-blink'],
    [host, 'data-pixi-source-asset-count', '6'],
    [host, 'data-shot03-motion-profile', ACTIVE_PROFILE],
    [host, 'data-shot03-recovery-control', 'blink-active'],
    [host, 'data-shot03-recovery-hidden-layers', HIDDEN_LAYER_IDS.join(',')],
    [canvas, 'data-pixi-source-asset-ids', EXPECTED_SOURCE_IDS.join(',')],
    [canvas, 'data-pixi-source-asset-verification', 'verified'],
    [canvas, 'data-pixi-render-mode', 'manual-exact-frame'],
  ];
  for (const [locator, name, expected] of checks) {
    const actual = await locator.getAttribute(name);
    if (actual !== expected) {
      throw new Error(`Expected ${name}=${expected}, received ${actual ?? '<missing>'}.`);
    }
  }
  const renderedHashes = (
    await requiredAttribute(canvas, 'data-pixi-source-asset-sha256')
  ).split(',');
  const byId = new Map(EXPECTED_SOURCE_IDS.map((id, index) => [id, renderedHashes[index]]));
  for (const [id, expected] of [
    ['shot03-background-v1', sourceHashes.background],
    ['shot03-vessel-v1', sourceHashes.vessel],
    ['shot03-enki-body-v1', sourceHashes.enki],
  ]) {
    if (byId.get(id) !== expected) {
      throw new Error(`Recovered blink source ${id} digest mismatch.`);
    }
  }
}

async function assertAnimationLabReachable() {
  try {
    const response = await fetch(BASE_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    throw new Error(
      `Animation Lab is not reachable at ${BASE_URL}. Keep pnpm start:all running. ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function waitForPixiReady(host) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const state = await host.getAttribute('data-pixi-state');
    if (state === 'READY') return;
    if (state === 'ERROR') {
      throw new Error(`Pixi blink preview failed: ${(await host.getAttribute('data-pixi-error')) || 'unknown error'}`);
    }
    await delay(50);
  }
  throw new Error('Timed out waiting for Pixi recovered blink preview.');
}

async function fullMotionState(host, canvas) {
  const camera = await requiredAttribute(host, 'data-shot03-camera');
  const vessel = await requiredAttribute(host, 'data-shot03-vessel');
  const blink = await requiredAttribute(host, 'data-shot03-blink-opacity');
  const layers = await requiredAttribute(canvas, 'data-pixi-source-layer-state');
  return `camera=${camera}|vessel=${vessel}|blink=${blink}|layers=${layers}`;
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
  const deadline = Date.now() + 5_000;
  const expected = String(frame);
  while (Date.now() < deadline) {
    if ((await canvas.getAttribute('data-pixi-frame')) === expected) return;
    await delay(20);
  }
  throw new Error(`Timed out waiting for recovered blink frame ${frame}.`);
}

async function captureCanvasPng(page, canvas, outputPath) {
  const originalStyles = await canvas.evaluate((element) => ({
    width: element.width,
    height: element.height,
    canvasStyle: element.getAttribute('style'),
    hostStyle: element.parentElement?.getAttribute('style') ?? null,
  }));
  if (originalStyles.width !== WIDTH || originalStyles.height !== HEIGHT) {
    throw new Error(`Pixi backing canvas ${originalStyles.width}x${originalStyles.height} != ${WIDTH}x${HEIGHT}.`);
  }
  await canvas.evaluate((element, dimensions) => {
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
    element.style.zIndex = '2147483647';
  }, { width: WIDTH, height: HEIGHT });
  try {
    const png = await page.screenshot({
      path: outputPath,
      animations: 'disabled',
      scale: 'css',
      clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
    });
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

function comparePixelLocalization(controlPath, activePath) {
  const control = decodeRgb(controlPath);
  const active = decodeRgb(activePath);
  let minX = WIDTH;
  let minY = HEIGHT;
  let maxX = -1;
  let maxY = -1;
  let changedPixels = 0;
  for (let pixel = 0; pixel < PIXELS; pixel += 1) {
    const offset = pixel * 3;
    const delta = Math.max(
      Math.abs(control[offset] - active[offset]),
      Math.abs(control[offset + 1] - active[offset + 1]),
      Math.abs(control[offset + 2] - active[offset + 2]),
    );
    if (delta <= 2) continue;
    changedPixels += 1;
    const x = pixel % WIDTH;
    const y = Math.floor(pixel / WIDTH);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return {
    changedPixels,
    changedFrameRatio: changedPixels / PIXELS,
    bounds:
      maxX >= minX && maxY >= minY
        ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
        : null,
  };
}

function decodeRgb(path) {
  const result = spawnSync(
    FFMPEG,
    ['-hide_banner', '-loglevel', 'error', '-i', path, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'],
    { cwd: ROOT, encoding: null, maxBuffer: PIXELS * 3 + 1024, windowsHide: true, shell: false },
  );
  if (result.error) throw result.error;
  if (result.status !== 0 || !Buffer.isBuffer(result.stdout) || result.stdout.length !== PIXELS * 3) {
    throw new Error(`Could not decode RGB frame ${path}.`);
  }
  return result.stdout;
}

function encodeImageSequence(directory, outputPath) {
  runFfmpeg([
    '-framerate', String(FPS),
    '-start_number', String(START_FRAME),
    '-i', join(directory, 'frame-%04d.png'),
    '-frames:v', String(FRAME_COUNT),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-r', String(FPS),
    outputPath,
  ]);
}

function encodeAbVideo(controlVideoPath, activeVideoPath, outputPath) {
  runFfmpeg([
    '-i', controlVideoPath,
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

function createPairStill(controlPath, activePath, outputPath) {
  runFfmpeg([
    '-i', controlPath,
    '-i', activePath,
    '-filter_complex', '[0:v]scale=540:960[left];[1:v]scale=540:960[right];[left][right]hstack=inputs=2[v]',
    '-map', '[v]',
    '-frames:v', '1',
    outputPath,
  ]);
}

function createFocusedPair(controlPath, activePath, box, outputPath) {
  const crop = `crop=${box.width}:${box.height}:${box.x}:${box.y}`;
  runFfmpeg([
    '-i', controlPath,
    '-i', activePath,
    '-filter_complex', `[0:v]${crop},scale=720:-2[left];[1:v]${crop},scale=720:-2[right];[left][right]hstack=inputs=2[v]`,
    '-map', '[v]',
    '-frames:v', '1',
    outputPath,
  ]);
}

function paddedBox(box, padding, frameWidth, frameHeight) {
  const x = Math.max(0, box.x - padding);
  const y = Math.max(0, box.y - padding);
  const right = Math.min(frameWidth, box.x + box.width + padding);
  const bottom = Math.min(frameHeight, box.y + box.height + padding);
  return {
    x,
    y,
    width: Math.max(2, right - x),
    height: Math.max(2, bottom - y),
  };
}

function formatBox(box) {
  return `${box.width}x${box.height}@(${box.x},${box.y})`;
}

function runFfmpeg(args) {
  const result = spawnSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...args], {
    cwd: ROOT,
    stdio: 'inherit',
    windowsHide: true,
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffmpeg failed with exit ${result.status ?? 1}.`);
}

async function requiredAttribute(locator, name) {
  const value = await locator.getAttribute(name);
  if (value === null) throw new Error(`Recovered blink proof missing attribute ${name}.`);
  return value;
}

function prefixedSha(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function delay(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function parseOptions(args) {
  const result = { noOpen: false, noAiReview: false, requireAiReview: false };
  for (const arg of args) {
    if (arg === '--no-open') result.noOpen = true;
    else if (arg === '--no-ai-review') result.noAiReview = true;
    else if (arg === '--require-ai-review') result.requireAiReview = true;
    else throw new Error(`Unknown option ${arg}.`);
  }
  return result;
}
