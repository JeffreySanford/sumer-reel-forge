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
const OUTPUT_ROOT = resolve(
  'tmp/animation-previews/pixi-shot03-recovered-motion-proof',
);
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const FPS = 30;
const START_FRAME = 0;
const END_FRAME = 209;
const FRAME_COUNT = END_FRAME - START_FRAME + 1;
const DURATION_SECONDS = FRAME_COUNT / FPS;
const SAMPLE_FRAMES = [0, 52, 101, 157, 209];
const EXPECTED_CANVAS_WIDTH = 1080;
const EXPECTED_CANVAS_HEIGHT = 1920;
const ACTIVE_PROFILE = 'recovered-primary';
const CONTROL_PROFILE = 'recovered-camera-only';
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

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDirectory = join(OUTPUT_ROOT, stamp);
  const activeDirectory = join(outputDirectory, 'active');
  const controlDirectory = join(outputDirectory, 'camera-only-control');
  const repeatDirectory = join(outputDirectory, 'repeat-samples');
  await Promise.all([
    mkdir(activeDirectory, { recursive: true }),
    mkdir(controlDirectory, { recursive: true }),
    mkdir(repeatDirectory, { recursive: true }),
  ]);

  console.log('Pixi Shot 3 recovered-primary motion exposure proof');
  console.log(`Animation Lab: ${BASE_URL}`);
  console.log(`Background: ${recovery.backgroundPath}`);
  console.log(`Vessel: ${recovery.vesselPath}`);
  console.log(`Enki: ${recovery.enkiPath}`);
  console.log('Visible layers: repaired background + recovered vessel + recovered Enki.');
  console.log('Hidden support layers: legacy water + eye-state + rigging.');
  console.log('Control: identical camera path, zero vessel-local motion.');
  console.log('Goal: expose any blur, smear, ghosting, or repair seam revealed by vessel/Enki motion.');
  console.log('Policy: temporary candidate proof only; no canonical mutation or promotion.');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 2200 } });
  const page = await context.newPage();

  try {
    await installRecoveryRoutes(page, sourceBytes);

    console.log('');
    console.log('[1/6] Capture recovered active motion...');
    const active = await captureProfile({
      page,
      profile: ACTIVE_PROFILE,
      outputDirectory: activeDirectory,
      sourceHashes,
    });

    console.log('[2/6] Verify exact-frame active repeatability...');
    const repeatability = await verifyRepeatability({
      page,
      profile: ACTIVE_PROFILE,
      sourceHashes,
      originals: active.captures,
      outputDirectory: repeatDirectory,
    });

    console.log('[3/6] Capture camera-only matched control...');
    const control = await captureProfile({
      page,
      profile: CONTROL_PROFILE,
      outputDirectory: controlDirectory,
      sourceHashes,
    });

    const cameraMatched = active.captures.every(
      (capture, index) => capture.cameraState === control.captures[index]?.cameraState,
    );
    const controlLocallyFrozen = control.captures.every(
      (capture) => capture.vesselState === 'heave=0.000,roll=0.000000',
    );
    const differingFrames = active.captures.filter(
      (capture, index) => capture.screenshotSha256 !== control.captures[index]?.screenshotSha256,
    );
    const activeVesselStates = new Set(active.captures.map((capture) => capture.vesselState));

    if (!cameraMatched) {
      throw new Error('Recovered active/control camera paths diverged; motion exposure A/B is invalid.');
    }
    if (!controlLocallyFrozen) {
      throw new Error('Recovered camera-only control contains vessel-local motion.');
    }
    if (differingFrames.length < 120) {
      throw new Error(
        `Recovered active/control differ on only ${differingFrames.length}/${FRAME_COUNT} frames; vessel motion is not sufficiently evidenced.`,
      );
    }
    if (activeVesselStates.size < 100) {
      throw new Error(
        `Recovered active proof resolved only ${activeVesselStates.size} vessel states across ${FRAME_COUNT} frames.`,
      );
    }

    console.log('[4/6] Encode active, matched-control, and exposure A/B videos...');
    const activeVideoPath = join(outputDirectory, 'shot03-recovered-motion-active.mp4');
    const controlVideoPath = join(
      outputDirectory,
      'shot03-recovered-camera-only-control.mp4',
    );
    const abVideoPath = join(
      outputDirectory,
      'shot03-recovered-camera-only-vs-active-ab.mp4',
    );
    encodeImageSequence(activeDirectory, activeVideoPath);
    encodeImageSequence(controlDirectory, controlVideoPath);
    encodeAbVideo(controlVideoPath, activeVideoPath, abVideoPath);

    const maxExposure = active.captures.reduce((best, capture) => {
      const signal = vesselSignal(capture.vesselState);
      return signal > best.signal ? { signal, capture } : best;
    }, { signal: -1, capture: active.captures[0] });
    const maxExposureFrame = maxExposure.capture.frame;
    const maxExposurePairPath = join(
      outputDirectory,
      `shot03-max-motion-exposure-frame-${String(maxExposureFrame).padStart(4, '0')}.png`,
    );
    createPairStill(
      control.captures[maxExposureFrame].screenshotPath,
      active.captures[maxExposureFrame].screenshotPath,
      maxExposurePairPath,
    );

    console.log('[5/6] Local vision review of motion-exposed repaired background...');
    const aiPath = join(outputDirectory, 'ollama-recovered-motion-review.json');
    let ai = null;
    if (!options.noAiReview) {
      ai = await reviewGeneratedMedia({
        artifacts: [
          {
            path: recovery.backgroundPath,
            label: 'repaired Shot 3 background candidate; vessel and Enki removed',
          },
          {
            path: recovery.staticRecompositionPath,
            label: 'human-accepted static recovered recomposition before motion',
          },
          {
            path: maxExposurePairPath,
            label: `matched camera-only control versus active motion at maximum vessel signal frame ${maxExposureFrame}`,
          },
          {
            path: activeVideoPath,
            label: '7-second recovered active motion: repaired background plus vessel/Enki rigid group',
          },
          {
            path: abVideoPath,
            label: '7-second matched A/B: left camera-only control, right active vessel/Enki motion',
          },
        ],
        task: [
          'Review this Shot 3 recovered-primary motion proof at normal viewing speed.',
          'The left side of the A/B has the exact same camera path as the right side; only vessel/Enki local heave and roll differ.',
          'The repaired background intentionally contains source-baked water, atmosphere, and rigging. Legacy extracted water, rigging, and blink overlays are hidden in this proof.',
          'The static recomposition already passed exact deterministic source reconstruction and was accepted by the human reviewer, with a note that some repaired background areas appear blurred.',
          'Focus on whether vessel/Enki motion newly exposes blurred, smeared, ghosted, duplicated, or implausibly repaired background along the hull and character boundaries.',
          'Also judge whether vessel and Enki remain planted together as one rigid group and whether the motion is restrained but readable.',
          `Deterministic evidence: cameraMatched=${cameraMatched}; controlLocallyFrozen=${controlLocallyFrozen}; activeControlDifferingFrames=${differingFrames.length}/${FRAME_COUNT}; activeVesselStates=${activeVesselStates.size}; repeatability=${repeatability.filter((item) => item.pass).length}/${repeatability.length}.`,
          'Do not infer hidden defects that are not visible in the supplied evidence. PASS_ADVISORY means suitable for human motion review only and never authorizes promotion.',
        ].join(' '),
        rubric: [
          'newly exposed repaired background remains visually plausible during local vessel motion',
          'no blur flashes, smear bands, ghost silhouettes, holes, or obvious inpaint seams appear around moving foreground boundaries',
          'vessel and Enki remain rigidly planted together',
          'camera-only and active comparison isolates local motion cleanly',
          'motion reads at normal speed without looking like detached fragments',
        ],
        outputPath: aiPath,
        requireAi: options.requireAiReview,
        maxVideoSamples: 5,
      });
    } else {
      console.log('[ai] recovered motion review skipped by --no-ai-review');
    }

    console.log('[6/6] Write recovered motion receipt...');
    const technicalPass =
      active.uniqueRenderedFrameCount >= 120 &&
      control.uniqueRenderedFrameCount >= 120 &&
      repeatability.every((item) => item.pass) &&
      cameraMatched &&
      controlLocallyFrozen &&
      differingFrames.length >= 120 &&
      activeVesselStates.size >= 100;
    const reportPath = join(outputDirectory, 'pixi-shot03-recovered-motion-proof.json');
    const report = {
      schemaVersion: 1,
      proofType: 'pixi-shot03-recovered-primary-motion-proof',
      generatedAt: new Date().toISOString(),
      sourceStaticProofPath: recovery.staticProofPath,
      sourceBackgroundQaPath: recovery.backgroundQaPath,
      sourceBackgroundAutoPath: recovery.backgroundAutoPath,
      sourceAssets: {
        background: {
          path: recovery.backgroundPath,
          sha256: sourceHashes.background,
        },
        vessel: { path: recovery.vesselPath, sha256: sourceHashes.vessel },
        enki: { path: recovery.enkiPath, sha256: sourceHashes.enki },
      },
      compositionPolicy: {
        visibleLayers: [
          'shot03-background-v1 recovered candidate',
          'shot03-vessel-v1 recovered candidate',
          'shot03-enki-body-v1 recovered candidate',
        ],
        hiddenLegacyLayers: HIDDEN_LAYER_IDS,
        backgroundContainsSourceBakedWaterAtmosphereRigging: true,
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
      },
      motion: {
        activeProfile: ACTIVE_PROFILE,
        controlProfile: CONTROL_PROFILE,
        cameraPathMatchedAcrossProfiles: cameraMatched,
        controlVesselLocallyFrozen: controlLocallyFrozen,
        activeVesselStateCount: activeVesselStates.size,
        activeControlDifferingFrameCount: differingFrames.length,
        maxExposureFrame,
        intent:
          'Use identical camera motion on both sides so newly exposed repaired-background artifacts can be attributed to vessel/Enki local motion rather than camera drift.',
      },
      technicalEvidence: {
        activeUniqueResolvedStateCount: active.uniqueResolvedStateCount,
        activeUniqueRenderedFrameCount: active.uniqueRenderedFrameCount,
        controlUniqueResolvedStateCount: control.uniqueResolvedStateCount,
        controlUniqueRenderedFrameCount: control.uniqueRenderedFrameCount,
        repeatability,
        pass: technicalPass,
      },
      aiReviewPath: options.noAiReview ? null : aiPath,
      aiStatus: ai?.status ?? null,
      artifacts: {
        activeVideo: activeVideoPath,
        cameraOnlyControlVideo: controlVideoPath,
        exposureAbVideo: abVideoPath,
        maxExposurePair: maxExposurePairPath,
        activeFramesDirectory: activeDirectory,
        controlFramesDirectory: controlDirectory,
      },
      humanReview: {
        required: true,
        staticReviewContext:
          'Human accepted the static recovery in-session and noted some blurred repaired-background areas; this motion proof specifically tests whether those areas become objectionable when foreground motion reveals them.',
        questions: [
          'Do any blurred or reconstructed regions flash into view as vessel/Enki move?',
          'Are there any ghost hull/body remnants, holes, seams, or smear bands?',
          'Do vessel and Enki remain visually planted as one rigid group?',
          'Is the heave/roll readable but restrained at normal speed?',
          'Is the recovered active shot preferable to the matched camera-only control?',
        ],
      },
      motionActivationAllowed: false,
      promotionAllowed: false,
    };
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    console.log('');
    console.log(
      `[PASS] technical recovered motion proof: ${technicalPass ? 'PASS' : 'FAIL'} · camera matched=${cameraMatched ? 'YES' : 'NO'} · differing frames=${differingFrames.length}/${FRAME_COUNT} · repeatability=${repeatability.filter((item) => item.pass).length}/${repeatability.length}`,
    );
    if (ai?.status) console.log(`[INFO] local vision status: ${ai.status}`);
    console.log(`[REVIEW] active motion: ${activeVideoPath}`);
    console.log(`[REVIEW] matched exposure A/B: ${abVideoPath}`);
    console.log(`[REVIEW] max motion exposure still: ${maxExposurePairPath}`);
    console.log(`[INFO] proof receipt: ${reportPath}`);
    console.log(
      '[STOP] Human normal-speed review remains required. Do not promote recovered assets or reactivate legacy secondary layers from this proof alone.',
    );

    await maybeOpenReviewArtifacts(
      [activeVideoPath, abVideoPath, maxExposurePairPath],
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
    const backgroundAutoPath = join(directory, 'shot03-roi-background-auto.json');
    if (!existsSync(staticProofPath) || !existsSync(backgroundQaPath)) continue;

    try {
      const staticProof = JSON.parse(await readFile(staticProofPath, 'utf8'));
      const backgroundQa = JSON.parse(await readFile(backgroundQaPath, 'utf8'));
      const backgroundAuto = existsSync(backgroundAutoPath)
        ? JSON.parse(await readFile(backgroundAutoPath, 'utf8'))
        : null;
      if (staticProof.technicalStaticRecompositionPass !== true) continue;
      if (staticProof.ai?.status && staticProof.ai.status !== 'PASS_ADVISORY') continue;
      if (backgroundQa.pass !== true) continue;
      if (
        backgroundAuto?.backgroundAiStatus &&
        backgroundAuto.backgroundAiStatus !== 'PASS_ADVISORY'
      ) {
        continue;
      }

      const backgroundPath = resolve(staticProof.backgroundCandidatePath);
      const vesselPath = resolve(staticProof.vesselPath);
      const enkiPath = resolve(staticProof.enkiPath);
      const staticRecompositionPath = resolve(staticProof.artifacts?.recomposed ?? '');
      for (const path of [
        backgroundPath,
        vesselPath,
        enkiPath,
        staticRecompositionPath,
      ]) {
        if (!path || !existsSync(path)) throw new Error(`Missing recovery artifact ${path}.`);
      }
      return {
        directory,
        staticProofPath,
        backgroundQaPath,
        backgroundAutoPath: existsSync(backgroundAutoPath) ? backgroundAutoPath : null,
        backgroundPath,
        vesselPath,
        enkiPath,
        staticRecompositionPath,
      };
    } catch {
      continue;
    }
  }

  throw new Error(
    'No technically passing Shot 3 recovered static recomposition was found. Run node tools/scripts/shot03-roi-recovery-auto.mjs and visually accept the static result first.',
  );
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

async function captureProfile({
  page,
  profile,
  outputDirectory,
  sourceHashes,
}) {
  await page.goto(reviewUrl(profile, sourceHashes), { waitUntil: 'networkidle' });
  const host = page.locator('[aria-label="Pixi Shot 3 full-motion renderer"]');
  const canvas = page.locator('canvas[data-pixi-full-motion-surface="true"]');
  const frameControl = page.getByRole('group', { name: 'Exact frame control' });
  await waitForPixiReady(host);
  await assertRecoveryContract(host, canvas, profile, sourceHashes);
  await gotoFrame(frameControl, canvas, START_FRAME);

  const captures = [];
  for (let frame = START_FRAME; frame <= END_FRAME; frame += 1) {
    if (frame !== START_FRAME) {
      await frameControl.press('ArrowRight');
      await waitForCanvasFrame(canvas, frame);
    }
    const cameraState = await requiredAttribute(host, 'data-shot03-camera');
    const vesselState = await requiredAttribute(host, 'data-shot03-vessel');
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
      resolvedState,
      screenshotPath,
      screenshotSha256: prefixedSha(screenshot),
    });
  }

  const uniqueResolvedStateCount = new Set(
    captures.map((capture) => capture.resolvedState),
  ).size;
  const uniqueRenderedFrameCount = new Set(
    captures.map((capture) => capture.screenshotSha256),
  ).size;
  if (uniqueResolvedStateCount < 120) {
    throw new Error(
      `${profile} resolved only ${uniqueResolvedStateCount} unique states across ${FRAME_COUNT} frames.`,
    );
  }
  if (uniqueRenderedFrameCount < 120) {
    throw new Error(
      `${profile} produced only ${uniqueRenderedFrameCount} unique rendered frames across ${FRAME_COUNT} frames.`,
    );
  }

  return { captures, uniqueResolvedStateCount, uniqueRenderedFrameCount };
}

async function verifyRepeatability({
  page,
  profile,
  sourceHashes,
  originals,
  outputDirectory,
}) {
  await page.goto(reviewUrl(profile, sourceHashes), { waitUntil: 'networkidle' });
  const host = page.locator('[aria-label="Pixi Shot 3 full-motion renderer"]');
  const canvas = page.locator('canvas[data-pixi-full-motion-surface="true"]');
  const frameControl = page.getByRole('group', { name: 'Exact frame control' });
  await waitForPixiReady(host);
  await assertRecoveryContract(host, canvas, profile, sourceHashes);

  const result = [];
  for (const frame of SAMPLE_FRAMES) {
    await gotoFrame(frameControl, canvas, frame);
    const repeatedState = await fullMotionState(host, canvas);
    const repeatedPath = join(
      outputDirectory,
      `frame-${String(frame).padStart(4, '0')}.png`,
    );
    const repeated = await captureCanvasPng(page, canvas, repeatedPath);
    const repeatedHash = prefixedSha(repeated);
    const original = originals[frame];
    if (!original) throw new Error(`Missing original recovered capture frame ${frame}.`);
    const statePass = repeatedState === original.resolvedState;
    const pixelPass = repeatedHash === original.screenshotSha256;
    const pass = statePass && pixelPass;
    result.push({
      frame,
      pass,
      statePass,
      pixelPass,
      originalSha256: original.screenshotSha256,
      repeatedSha256: repeatedHash,
    });
    if (!pass) {
      throw new Error(
        `Recovered motion repeatability failed at frame ${frame}: state=${statePass ? 'MATCH' : 'DIFF'}, pixels=${pixelPass ? 'MATCH' : 'DIFF'}.`,
      );
    }
  }
  return result;
}

function reviewUrl(profile, sourceHashes) {
  const url = new URL(BASE_URL);
  url.searchParams.set('shot03-motion-profile', profile);
  url.searchParams.set(
    'shot03-recovery-background-sha256',
    sourceHashes.background,
  );
  url.searchParams.set('shot03-recovery-vessel-sha256', sourceHashes.vessel);
  url.searchParams.set('shot03-recovery-enki-sha256', sourceHashes.enki);
  return url.toString();
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
      throw new Error(
        `Pixi recovered motion preview failed: ${(await host.getAttribute('data-pixi-error')) || 'unknown error'}`,
      );
    }
    await delay(50);
  }
  throw new Error('Timed out waiting for Pixi recovered motion preview READY state.');
}

async function assertRecoveryContract(host, canvas, profile, sourceHashes) {
  const expectedControl = profile === CONTROL_PROFILE ? 'camera-only' : 'active';
  const checks = [
    [host, 'data-pixi-review-mode', 'recovered-primary-motion'],
    [host, 'data-pixi-review-composition', 'shot03-recovered-primary-layers'],
    [host, 'data-pixi-source-asset-count', '6'],
    [host, 'data-shot03-motion-profile', profile],
    [host, 'data-shot03-recovery-control', expectedControl],
    [host, 'data-shot03-recovery-hidden-layers', HIDDEN_LAYER_IDS.join(',')],
    [canvas, 'data-pixi-source-asset-ids', EXPECTED_SOURCE_IDS.join(',')],
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

  const renderedHashes = (
    await requiredAttribute(canvas, 'data-pixi-source-asset-sha256')
  ).split(',');
  const byId = new Map(
    EXPECTED_SOURCE_IDS.map((id, index) => [id, renderedHashes[index]]),
  );
  for (const [id, expected] of [
    ['shot03-background-v1', sourceHashes.background],
    ['shot03-vessel-v1', sourceHashes.vessel],
    ['shot03-enki-body-v1', sourceHashes.enki],
  ]) {
    if (byId.get(id) !== expected) {
      throw new Error(
        `Recovered Pixi source ${id} digest mismatch: ${byId.get(id) ?? '<missing>'} != ${expected}.`,
      );
    }
  }
}

async function fullMotionState(host, canvas) {
  const camera = await requiredAttribute(host, 'data-shot03-camera');
  const vessel = await requiredAttribute(host, 'data-shot03-vessel');
  const rigging = await requiredAttribute(host, 'data-shot03-rigging');
  const blink = await requiredAttribute(host, 'data-shot03-blink-opacity');
  const layers = await requiredAttribute(canvas, 'data-pixi-source-layer-state');
  const timeSource = await requiredAttribute(
    canvas,
    'data-pixi-source-layer-time-source',
  );
  return `camera=${camera}|vessel=${vessel}|rigging=${rigging}|blink=${blink}|layers=${layers}|time=${timeSource}`;
}

async function gotoFrame(frameControl, canvas, frame) {
  await frameControl.press('Home');
  const tens = Math.floor(frame / 10);
  const remainder = frame % 10;
  for (let index = 0; index < tens; index += 1) {
    await frameControl.press('PageDown');
  }
  for (let index = 0; index < remainder; index += 1) {
    await frameControl.press('ArrowRight');
  }
  await waitForCanvasFrame(canvas, frame);
}

async function waitForCanvasFrame(canvas, frame) {
  const expected = String(frame);
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if ((await canvas.getAttribute('data-pixi-frame')) === expected) return;
    await delay(20);
  }
  throw new Error(`Timed out waiting for Pixi recovered canvas frame ${frame}.`);
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
        `Pixi capture element is ${box ? `x=${box.x},y=${box.y},${box.width}x${box.height}` : 'unavailable'}; expected x=0,y=0,${EXPECTED_CANVAS_WIDTH}x${EXPECTED_CANVAS_HEIGHT}.`,
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
    const dimensions = pngDimensions(png);
    if (
      dimensions.width !== EXPECTED_CANVAS_WIDTH ||
      dimensions.height !== EXPECTED_CANVAS_HEIGHT
    ) {
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
  if (
    png.length < 24 ||
    png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
  ) {
    throw new Error('Pixi recovered evidence capture did not produce a valid PNG.');
  }
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

async function requiredAttribute(locator, name) {
  const value = await locator.getAttribute(name);
  if (value === null) {
    throw new Error(`Pixi recovered motion proof is missing required attribute ${name}.`);
  }
  return value;
}

function vesselSignal(serialized) {
  const match = /^heave=(-?\d+(?:\.\d+)?),roll=(-?\d+(?:\.\d+)?)$/.exec(serialized);
  if (!match) return 0;
  return Math.abs(Number(match[1])) + Math.abs(Number(match[2])) * 20;
}

function encodeImageSequence(directory, outputPath) {
  runFfmpeg([
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
    '-r',
    String(FPS),
    outputPath,
  ]);
}

function encodeAbVideo(controlVideoPath, activeVideoPath, outputPath) {
  runFfmpeg([
    '-i',
    controlVideoPath,
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

function createPairStill(controlPath, activePath, outputPath) {
  runFfmpeg([
    '-i',
    controlPath,
    '-i',
    activePath,
    '-filter_complex',
    '[0:v]scale=540:960[left];[1:v]scale=540:960[right];[left][right]hstack=inputs=2[v]',
    '-map',
    '[v]',
    '-frames:v',
    '1',
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

function parseOptions(args) {
  const result = { noOpen: false, noAiReview: false, requireAiReview: false };
  for (const arg of args) {
    if (arg === '--no-open') result.noOpen = true;
    else if (arg === '--no-ai-review') result.noAiReview = true;
    else if (arg === '--require-ai-review') result.requireAiReview = true;
    else throw new Error(`Unknown option ${arg}`);
  }
  return result;
}

function delay(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}
