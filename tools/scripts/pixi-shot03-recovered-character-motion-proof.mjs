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
  'tmp/animation-previews/pixi-shot03-recovered-character-motion-proof',
);
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const FPS = 30;
const START_FRAME = 0;
const END_FRAME = 209;
const FRAME_COUNT = 210;
const ACTIVE_PROFILE = 'recovered-character-settle';
const CONTROL_PROFILE = 'recovered-character-control';
const SAMPLE_FRAMES = [0, 52, 101, 157, 209];
const WIDTH = 1080;
const HEIGHT = 1920;
const PIXELS = WIDTH * HEIGHT;
const EXPECTED_SOURCE_IDS = [
  'shot03-background-v1',
  'shot03-water-v1',
  'shot03-vessel-v1',
  'shot03-enki-body-v1',
  'shot03-enki-eyes-v1',
  'shot03-rigging-v1',
];
const HIDDEN_LAYER_IDS = [
  'shot03-water-v1',
  'shot03-enki-eyes-v1',
  'shot03-rigging-v1',
];
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
  const sourceHashes = Object.fromEntries(
    Object.entries(sourceBytes).map(([name, bytes]) => [name, prefixedSha(bytes)]),
  );
  assertPrimarySourceIdentity(primary.report, sourceHashes);

  const controlFramesDirectory = resolve(
    primary.report.artifacts?.activeFramesDirectory ?? '',
  );
  const controlVideoPath = resolve(primary.report.artifacts?.activeVideo ?? '');
  if (!existsSync(controlFramesDirectory) || !existsSync(controlVideoPath)) {
    throw new Error('Accepted recovered-primary control media is missing.');
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDirectory = join(OUTPUT_ROOT, stamp);
  const activeDirectory = join(outputDirectory, 'character-active');
  const repeatDirectory = join(outputDirectory, 'repeat-samples');
  await Promise.all([
    mkdir(activeDirectory, { recursive: true }),
    mkdir(repeatDirectory, { recursive: true }),
  ]);

  console.log('Pixi Shot 3 recovered Enki counter-sway proof');
  console.log(`Animation Lab: ${BASE_URL}`);
  console.log(`Accepted primary control: ${primary.reportPath}`);
  console.log(`Background: ${recovery.backgroundPath}`);
  console.log(`Vessel: ${recovery.vesselPath}`);
  console.log(`Enki: ${recovery.enkiPath}`);
  console.log('Control: accepted camera + vessel/Enki rigid-group motion.');
  console.log('Active: identical accepted camera + vessel motion, plus bounded delayed Enki local counter-sway.');
  console.log('Blink, legacy water, and legacy rigging remain hidden. No canonical mutation or promotion.');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 2200 } });
  const page = await context.newPage();

  try {
    await installRecoveryRoutes(page, sourceBytes);

    console.log('[1/6] Capture 210-frame Enki counter-sway pass...');
    const active = await captureActive({
      page,
      outputDirectory: activeDirectory,
      sourceHashes,
    });

    console.log('[2/6] Verify exact-frame active repeatability...');
    const repeatability = await verifyRepeatability({
      page,
      sourceHashes,
      originals: active.captures,
      outputDirectory: repeatDirectory,
    });

    console.log('[3/6] Verify accepted camera/vessel control remains unchanged...');
    const controlSamples = await captureControlStates({ page, sourceHashes });
    for (const sample of controlSamples) {
      const activeSample = active.captures[sample.frame];
      if (!activeSample) throw new Error(`Missing active frame ${sample.frame}.`);
      if (activeSample.cameraState !== sample.cameraState) {
        throw new Error(`Character proof camera diverged from control at frame ${sample.frame}.`);
      }
      if (activeSample.vesselState !== sample.vesselState) {
        throw new Error(`Character proof vessel motion diverged from control at frame ${sample.frame}.`);
      }
      if (sample.enkiLocal !== 'x=0.000,y=0.000,rot=0.000000,lag=0.180') {
        throw new Error(`Character control is not locally frozen at frame ${sample.frame}: ${sample.enkiLocal}.`);
      }
    }

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
        differs: controlHash !== capture.screenshotSha256,
        controlPath,
        activePath: capture.screenshotPath,
      });
    }
    const differingFrames = comparisons.filter((item) => item.differs);
    const characterStates = new Set(active.captures.map((item) => item.enkiLocal));
    if (differingFrames.length < 160) {
      throw new Error(
        `Enki counter-sway differs from accepted primary on only ${differingFrames.length}/${FRAME_COUNT} frames.`,
      );
    }
    if (characterStates.size < 100) {
      throw new Error(
        `Enki counter-sway resolved only ${characterStates.size} local states across ${FRAME_COUNT} frames.`,
      );
    }

    const maxSignal = active.captures.reduce(
      (best, capture) => {
        const signal = characterSignal(capture.enkiLocal);
        return signal > best.signal ? { signal, capture } : best;
      },
      { signal: -1, capture: active.captures[0] },
    );
    const maxFrame = maxSignal.capture.frame;
    const maxControlPath = join(
      controlFramesDirectory,
      `frame-${String(maxFrame).padStart(4, '0')}.png`,
    );
    const localization = comparePixelLocalization(
      maxControlPath,
      maxSignal.capture.screenshotPath,
    );
    if (localization.changedPixels <= 0 || !localization.bounds) {
      throw new Error('Maximum Enki counter-sway frame produced no rendered pixel difference.');
    }
    if (localization.changedFrameRatio > 0.12) {
      throw new Error(
        `Enki counter-sway changes ${(localization.changedFrameRatio * 100).toFixed(2)}% of the frame at maximum signal; expected a character-local change.`,
      );
    }
    console.log(
      `[LOCALIZATION] max frame ${maxFrame} · changed=${localization.changedPixels} px (${(localization.changedFrameRatio * 100).toFixed(3)}%) · bbox=${formatBox(localization.bounds)}`,
    );

    console.log('[4/6] Encode active and accepted-primary-vs-character A/B videos...');
    const activeVideoPath = join(
      outputDirectory,
      'shot03-recovered-character-settle-active.mp4',
    );
    const abVideoPath = join(
      outputDirectory,
      'shot03-primary-vs-character-settle-ab.mp4',
    );
    const maxPairPath = join(
      outputDirectory,
      `shot03-character-max-local-motion-frame-${String(maxFrame).padStart(4, '0')}.png`,
    );
    encodeImageSequence(activeDirectory, activeVideoPath);
    encodeAbVideo(controlVideoPath, activeVideoPath, abVideoPath);
    createPairStill(maxControlPath, maxSignal.capture.screenshotPath, maxPairPath);

    console.log('[5/6] Local vision review of character motion and decomposition exposure...');
    const aiPath = join(outputDirectory, 'ollama-recovered-character-motion-review.json');
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
            label: 'human-accepted recovered-primary vessel/Enki rigid-group motion',
          },
          {
            path: activeVideoPath,
            label: 'same accepted camera and vessel motion plus bounded Enki local counter-sway',
          },
          {
            path: abVideoPath,
            label: 'matched A/B: left accepted primary, right Enki local counter-sway',
          },
          {
            path: maxPairPath,
            label: `accepted primary versus character-active at maximum local motion frame ${maxFrame}`,
          },
        ],
        task: [
          'Review this as a bounded character-secondary-motion proof for recovered Shot 3.',
          'The left A/B is the already human-accepted primary motion. The right side has the exact same camera and vessel motion and adds only a small delayed Enki local counter-sway under a nested character root.',
          'Blink, legacy water, and legacy rigging are disabled. Do not evaluate those channels.',
          `Deterministic evidence: differingFrames=${differingFrames.length}/${FRAME_COUNT}; uniqueCharacterStates=${characterStates.size}; repeatability=${repeatability.filter((item) => item.pass).length}/${repeatability.length}; maxChangedFrameRatio=${localization.changedFrameRatio}.`,
          'Pay special attention to whether moving recovered Enki drags boat/background fragments, exposes a hole behind him, creates doubled edges, or makes him float/slip relative to the vessel.',
          'Judge whether the motion reads naturally at normal speed as body settle/counterbalance rather than a puppet wobble.',
          'PASS_ADVISORY only means technically clean enough for human review. Human normal-speed acceptance remains authoritative.',
        ].join(' '),
        rubric: [
          'camera and vessel motion remain unchanged from accepted primary',
          'Enki local motion is visible but restrained at normal speed',
          'Enki remains plausibly planted on/in the vessel rather than floating or sliding',
          'no dragged boat fragments, holes, halos, doubled edges, or background contamination appear',
          'motion reads as delayed character settle/counterbalance rather than independent oscillation',
        ],
        outputPath: aiPath,
        requireAi: options.requireAiReview,
        maxVideoSamples: 4,
      });
    } else {
      console.log('[ai] character motion review skipped by --no-ai-review');
    }

    console.log('[6/6] Write Enki counter-sway proof receipt...');
    const technicalPass =
      repeatability.every((item) => item.pass) &&
      differingFrames.length >= 160 &&
      characterStates.size >= 100 &&
      localization.changedPixels > 0 &&
      localization.changedFrameRatio <= 0.12;
    const reportPath = join(
      outputDirectory,
      'pixi-shot03-recovered-character-motion-proof.json',
    );
    const report = {
      schemaVersion: 1,
      proofType: 'pixi-shot03-recovered-character-motion-proof',
      generatedAt: new Date().toISOString(),
      sourcePrimaryMotionProofPath: primary.reportPath,
      sourceStaticProofPath: recovery.staticProofPath,
      sourceAssets: {
        background: { path: recovery.backgroundPath, sha256: sourceHashes.background },
        vessel: { path: recovery.vesselPath, sha256: sourceHashes.vessel },
        enki: { path: recovery.enkiPath, sha256: sourceHashes.enki },
      },
      compositionPolicy: {
        acceptedPrimaryMotionFrozen: true,
        addedSecondaryChannel: 'recovered Enki nested counter-sway only',
        hiddenLegacyLayers: HIDDEN_LAYER_IDS,
        blinkReactivated: false,
        waterReactivated: false,
        riggingReactivated: false,
        canonicalAssetsMutated: false,
        canonicalManifestMutated: false,
      },
      motion: {
        activeProfile: ACTIVE_PROFILE,
        controlProfile: CONTROL_PROFILE,
        differingFrames: differingFrames.length,
        uniqueCharacterStates: characterStates.size,
        maxSignalFrame: maxFrame,
        maxSignalState: maxSignal.capture.enkiLocal,
        maxLocalization: localization,
      },
      technicalEvidence: {
        repeatability,
        pass: technicalPass,
      },
      aiReviewPath: options.noAiReview ? null : aiPath,
      aiStatus: ai?.status ?? null,
      artifacts: {
        acceptedPrimaryControlVideo: controlVideoPath,
        characterActiveVideo: activeVideoPath,
        characterAbVideo: abVideoPath,
        maxMotionPair: maxPairPath,
        activeFramesDirectory: activeDirectory,
      },
      humanReview: {
        required: true,
        questions: [
          'Can you see Enki settle/counterbalance at normal speed without hunting for it?',
          'Does Enki still feel planted to the vessel?',
          'Do any boat/background fragments move with Enki or appear behind him?',
          'Does the added character motion improve the already accepted primary shot?',
        ],
      },
      promotionAllowed: false,
      nextSecondaryChannelAllowed: false,
    };
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    console.log('');
    console.log(
      `[PASS] technical character proof: ${technicalPass ? 'PASS' : 'FAIL'} · differing=${differingFrames.length}/${FRAME_COUNT} · states=${characterStates.size} · repeatability=${repeatability.filter((item) => item.pass).length}/${repeatability.length}`,
    );
    if (ai?.status) console.log(`[INFO] local vision status: ${ai.status}`);
    console.log(`[REVIEW] character active: ${activeVideoPath}`);
    console.log(`[REVIEW] primary vs character A/B: ${abVideoPath}`);
    console.log(`[REVIEW] max local-motion still: ${maxPairPath}`);
    console.log(`[INFO] receipt: ${reportPath}`);
    console.log('[STOP] Human normal-speed character acceptance remains required. Blink stays rejected; do not reactivate water/rigging yet.');

    await maybeOpenReviewArtifacts([activeVideoPath, abVideoPath, maxPairPath], {
      enabled: !options.noOpen,
      delayMs: 120,
    });

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
      if (staticProof.technicalStaticRecompositionPass !== true || backgroundQa.pass !== true) {
        continue;
      }
      const backgroundPath = resolve(staticProof.backgroundCandidatePath);
      const vesselPath = resolve(staticProof.vesselPath);
      const enkiPath = resolve(staticProof.enkiPath);
      const staticRecompositionPath = resolve(staticProof.artifacts?.recomposed ?? '');
      if (![backgroundPath, vesselPath, enkiPath, staticRecompositionPath].every(existsSync)) {
        continue;
      }
      return {
        directory,
        staticProofPath,
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
  throw new Error('No passing recovered-primary motion proof found.');
}

function assertPrimarySourceIdentity(report, sourceHashes) {
  for (const name of ['background', 'vessel', 'enki']) {
    const actual = report.sourceAssets?.[name]?.sha256;
    if (actual !== sourceHashes[name]) {
      throw new Error(`Accepted primary ${name} digest ${actual ?? '<missing>'} != ${sourceHashes[name]}.`);
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

async function captureActive({ page, outputDirectory, sourceHashes }) {
  await page.goto(reviewUrl(ACTIVE_PROFILE, sourceHashes), { waitUntil: 'networkidle' });
  const host = page.locator('[aria-label="Pixi Shot 3 full-motion renderer"]');
  const canvas = page.locator('canvas[data-pixi-full-motion-surface="true"]');
  const frameControl = page.getByRole('group', { name: 'Exact frame control' });
  await waitForPixiReady(host);
  await assertCharacterContract(host, canvas, ACTIVE_PROFILE, sourceHashes);
  await gotoFrame(frameControl, canvas, START_FRAME);

  const captures = [];
  for (let frame = START_FRAME; frame <= END_FRAME; frame += 1) {
    if (frame !== START_FRAME) {
      await frameControl.press('ArrowRight');
      await waitForCanvasFrame(canvas, frame);
    }
    const cameraState = await requiredAttribute(host, 'data-shot03-camera');
    const vesselState = await requiredAttribute(host, 'data-shot03-vessel');
    const enkiLocal = await requiredAttribute(host, 'data-shot03-enki-local');
    const resolvedState = await fullMotionState(host, canvas);
    const screenshotPath = join(
      outputDirectory,
      `frame-${String(frame).padStart(4, '0')}.png`,
    );
    const screenshot = await captureCanvasPng(page, canvas, screenshotPath);
    captures.push({
      frame,
      cameraState,
      vesselState,
      enkiLocal,
      resolvedState,
      screenshotPath,
      screenshotSha256: prefixedSha(screenshot),
    });
  }
  return { captures };
}

async function verifyRepeatability({ page, sourceHashes, originals, outputDirectory }) {
  await page.goto(reviewUrl(ACTIVE_PROFILE, sourceHashes), { waitUntil: 'networkidle' });
  const host = page.locator('[aria-label="Pixi Shot 3 full-motion renderer"]');
  const canvas = page.locator('canvas[data-pixi-full-motion-surface="true"]');
  const frameControl = page.getByRole('group', { name: 'Exact frame control' });
  await waitForPixiReady(host);
  await assertCharacterContract(host, canvas, ACTIVE_PROFILE, sourceHashes);

  const result = [];
  for (const frame of SAMPLE_FRAMES) {
    await gotoFrame(frameControl, canvas, frame);
    const state = await fullMotionState(host, canvas);
    const path = join(outputDirectory, `frame-${String(frame).padStart(4, '0')}.png`);
    const bytes = await captureCanvasPng(page, canvas, path);
    const hash = prefixedSha(bytes);
    const original = originals[frame];
    const pass = Boolean(
      original && original.resolvedState === state && original.screenshotSha256 === hash,
    );
    result.push({ frame, pass, originalSha256: original?.screenshotSha256 ?? null, repeatedSha256: hash });
    if (!pass) throw new Error(`Recovered character repeatability failed at frame ${frame}.`);
  }
  return result;
}

async function captureControlStates({ page, sourceHashes }) {
  await page.goto(reviewUrl(CONTROL_PROFILE, sourceHashes), { waitUntil: 'networkidle' });
  const host = page.locator('[aria-label="Pixi Shot 3 full-motion renderer"]');
  const canvas = page.locator('canvas[data-pixi-full-motion-surface="true"]');
  const frameControl = page.getByRole('group', { name: 'Exact frame control' });
  await waitForPixiReady(host);
  await assertCharacterContract(host, canvas, CONTROL_PROFILE, sourceHashes);

  const result = [];
  for (const frame of SAMPLE_FRAMES) {
    await gotoFrame(frameControl, canvas, frame);
    result.push({
      frame,
      cameraState: await requiredAttribute(host, 'data-shot03-camera'),
      vesselState: await requiredAttribute(host, 'data-shot03-vessel'),
      enkiLocal: await requiredAttribute(host, 'data-shot03-enki-local'),
    });
  }
  return result;
}

function reviewUrl(profile, sourceHashes) {
  const url = new URL(BASE_URL);
  url.searchParams.set('shot03-motion-profile', profile);
  url.searchParams.set('shot03-recovery-background-sha256', sourceHashes.background);
  url.searchParams.set('shot03-recovery-vessel-sha256', sourceHashes.vessel);
  url.searchParams.set('shot03-recovery-enki-sha256', sourceHashes.enki);
  return url.toString();
}

async function assertCharacterContract(host, canvas, profile, sourceHashes) {
  const expectedControl =
    profile === CONTROL_PROFILE ? 'character-control' : 'character-active';
  const checks = [
    [host, 'data-pixi-review-mode', 'recovered-character-motion'],
    [host, 'data-pixi-review-composition', 'shot03-recovered-primary-plus-character-settle'],
    [host, 'data-pixi-source-asset-count', '6'],
    [host, 'data-shot03-motion-profile', profile],
    [host, 'data-shot03-recovery-control', expectedControl],
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

  const hashes = (await requiredAttribute(canvas, 'data-pixi-source-asset-sha256')).split(',');
  const byId = new Map(EXPECTED_SOURCE_IDS.map((id, index) => [id, hashes[index]]));
  for (const [id, expected] of [
    ['shot03-background-v1', sourceHashes.background],
    ['shot03-vessel-v1', sourceHashes.vessel],
    ['shot03-enki-body-v1', sourceHashes.enki],
  ]) {
    if (byId.get(id) !== expected) {
      throw new Error(`Recovered character source ${id} digest mismatch.`);
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
      throw new Error(
        `Pixi character preview failed: ${(await host.getAttribute('data-pixi-error')) || 'unknown error'}`,
      );
    }
    await delay(50);
  }
  throw new Error('Timed out waiting for Pixi character preview.');
}

async function fullMotionState(host, canvas) {
  const camera = await requiredAttribute(host, 'data-shot03-camera');
  const vessel = await requiredAttribute(host, 'data-shot03-vessel');
  const enki = await requiredAttribute(host, 'data-shot03-enki-local');
  const layers = await requiredAttribute(canvas, 'data-pixi-source-layer-state');
  const groups = await requiredAttribute(canvas, 'data-pixi-local-group-state');
  return `camera=${camera}|vessel=${vessel}|enki=${enki}|layers=${layers}|groups=${groups}`;
}

async function gotoFrame(frameControl, canvas, frame) {
  await frameControl.press('Home');
  for (let index = 0; index < Math.floor(frame / 10); index += 1) {
    await frameControl.press('PageDown');
  }
  for (let index = 0; index < frame % 10; index += 1) {
    await frameControl.press('ArrowRight');
  }
  await waitForCanvasFrame(canvas, frame);
}

async function waitForCanvasFrame(canvas, frame) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if ((await canvas.getAttribute('data-pixi-frame')) === String(frame)) return;
    await delay(20);
  }
  throw new Error(`Timed out waiting for character frame ${frame}.`);
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
    Object.assign(element.style, {
      position: 'fixed',
      left: '0px',
      top: '0px',
      width: `${dimensions.width}px`,
      height: `${dimensions.height}px`,
      maxWidth: 'none',
      maxHeight: 'none',
      margin: '0',
      border: '0',
      borderRadius: '0',
      transform: 'none',
      zIndex: '2147483647',
    });
  }, { width: WIDTH, height: HEIGHT });
  try {
    return await page.screenshot({
      path: outputPath,
      animations: 'disabled',
      scale: 'css',
      clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
    });
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

function characterSignal(serialized) {
  const match = /^x=(-?\d+(?:\.\d+)?),y=(-?\d+(?:\.\d+)?),rot=(-?\d+(?:\.\d+)?),lag=(-?\d+(?:\.\d+)?)$/.exec(serialized);
  if (!match) return 0;
  return Math.abs(Number(match[1])) + Math.abs(Number(match[2])) + Math.abs(Number(match[3])) * 14;
}

function formatBox(box) {
  return `${box.width}x${box.height}@(${box.x},${box.y})`;
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
    '-filter_complex',
    '[0:v]scale=540:960[left];[1:v]scale=540:960[right];[left][right]hstack=inputs=2[v]',
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
    '-filter_complex',
    '[0:v]scale=540:960[left];[1:v]scale=540:960[right];[left][right]hstack=inputs=2[v]',
    '-map', '[v]',
    '-frames:v', '1',
    outputPath,
  ]);
}

function runFfmpeg(args) {
  const result = spawnSync(
    FFMPEG,
    ['-y', '-hide_banner', '-loglevel', 'error', ...args],
    { cwd: ROOT, stdio: 'inherit', windowsHide: true, shell: false },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffmpeg failed with exit ${result.status ?? 1}.`);
}

async function requiredAttribute(locator, name) {
  const value = await locator.getAttribute(name);
  if (value === null) throw new Error(`Character proof missing attribute ${name}.`);
  return value;
}

function prefixedSha(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
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

function delay(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}
