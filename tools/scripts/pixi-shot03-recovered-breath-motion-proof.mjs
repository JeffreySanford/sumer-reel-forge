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
const CHARACTER_PROOF_ROOT = resolve(
  'tmp/animation-previews/pixi-shot03-recovered-character-motion-proof',
);
const OUTPUT_ROOT = resolve(
  'tmp/animation-previews/pixi-shot03-recovered-breath-motion-proof',
);
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const FPS = 30;
const START_FRAME = 0;
const END_FRAME = 209;
const FRAME_COUNT = 210;
const ACTIVE_PROFILE = 'recovered-character-breath';
const CONTROL_PROFILE = 'recovered-character-breath-control';
const SAMPLE_FRAMES = [0, 55, 110, 165, 209];
const NEUTRAL_FRAMES = [0, 110, 209];
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
  const character = await latestPassingCharacterProof();
  const sourceBytes = {
    background: await readFile(resolve(character.report.sourceAssets.background.path)),
    vessel: await readFile(resolve(character.report.sourceAssets.vessel.path)),
    enki: await readFile(resolve(character.report.sourceAssets.enki.path)),
  };
  const sourceHashes = Object.fromEntries(
    Object.entries(sourceBytes).map(([name, bytes]) => [name, prefixedSha(bytes)]),
  );
  assertCharacterSourceIdentity(character.report, sourceHashes);

  const controlFramesDirectory = resolve(
    character.report.artifacts?.activeFramesDirectory ?? '',
  );
  const controlVideoPath = resolve(
    character.report.artifacts?.characterActiveVideo ?? '',
  );
  if (!existsSync(controlFramesDirectory) || !existsSync(controlVideoPath)) {
    throw new Error('Accepted recovered-character control media is missing.');
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDirectory = join(OUTPUT_ROOT, stamp);
  const activeDirectory = join(outputDirectory, 'breath-active');
  const repeatDirectory = join(outputDirectory, 'repeat-samples');
  const controlSampleDirectory = join(outputDirectory, 'control-samples');
  await Promise.all([
    mkdir(activeDirectory, { recursive: true }),
    mkdir(repeatDirectory, { recursive: true }),
    mkdir(controlSampleDirectory, { recursive: true }),
  ]);

  console.log('Pixi Shot 3 recovered Enki breathe-calm proof');
  console.log(`Animation Lab: ${BASE_URL}`);
  console.log(`Accepted character control: ${character.reportPath}`);
  console.log('Control: accepted camera + vessel + Enki counter-sway.');
  console.log('Active: identical accepted motion plus torso-anchored anisotropic breathe-calm deformation.');
  console.log('Breath: exact-frame 110-frame cycle · X +0.20% max · Y +0.50% max · peaks frame 55/165.');
  console.log('Blink, legacy water, and legacy rigging remain hidden. No source regeneration or canonical mutation.');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 2200 } });
  const page = await context.newPage();

  try {
    await installRecoveryRoutes(page, sourceBytes);

    console.log('[1/7] Capture 210-frame breathe-calm pass...');
    const active = await captureActive({
      page,
      outputDirectory: activeDirectory,
      sourceHashes,
    });

    console.log('[2/7] Verify exact-frame breathe-calm repeatability...');
    const repeatability = await verifyRepeatability({
      page,
      sourceHashes,
      originals: active.captures,
      outputDirectory: repeatDirectory,
    });

    console.log('[3/7] Verify breathing control is pixel-identical to accepted counter-sway...');
    const controlSamples = await captureControlSamples({
      page,
      sourceHashes,
      controlFramesDirectory,
      outputDirectory: controlSampleDirectory,
    });

    for (const sample of controlSamples) {
      const activeSample = active.captures[sample.frame];
      if (!activeSample) throw new Error(`Missing active frame ${sample.frame}.`);
      if (activeSample.cameraState !== sample.cameraState) {
        throw new Error(`Breathing proof camera diverged from control at frame ${sample.frame}.`);
      }
      if (activeSample.vesselState !== sample.vesselState) {
        throw new Error(`Breathing proof vessel diverged from control at frame ${sample.frame}.`);
      }
      if (activeSample.enkiLocal !== sample.enkiLocal) {
        throw new Error(`Breathing changed accepted Enki counter-sway at frame ${sample.frame}.`);
      }
      if (sample.breathState !== 'amount=0.000000,scaleX=1.000000,scaleY=1.000000,cycle=110') {
        throw new Error(`Breathing control is not deformation-frozen at frame ${sample.frame}: ${sample.breathState}.`);
      }
    }

    console.log('[4/7] Verify breath isolation, neutral frames, and localized deformation...');
    const comparisons = [];
    for (const capture of active.captures) {
      const controlPath = controlFramePath(controlFramesDirectory, capture.frame);
      if (!existsSync(controlPath)) {
        throw new Error(`Accepted character control frame is missing: ${controlPath}`);
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
    const breathStates = new Set(active.captures.map((item) => item.breathState));

    for (const frame of NEUTRAL_FRAMES) {
      const comparison = comparisons[frame];
      if (!comparison || comparison.differs) {
        throw new Error(`Breathe-calm neutral frame ${frame} is not pixel-identical to accepted counter-sway.`);
      }
    }
    for (const frame of [55, 165]) {
      const comparison = comparisons[frame];
      if (!comparison?.differs) {
        throw new Error(`Breathe-calm peak frame ${frame} produced no rendered change.`);
      }
    }
    if (differingFrames.length < 180) {
      throw new Error(
        `Breathe-calm differs from accepted character motion on only ${differingFrames.length}/${FRAME_COUNT} frames.`,
      );
    }
    if (breathStates.size < 80) {
      throw new Error(
        `Breathe-calm resolved only ${breathStates.size} deterministic states across ${FRAME_COUNT} frames.`,
      );
    }

    const peak = active.captures.reduce(
      (best, capture) => {
        const amount = breathAmount(capture.breathState);
        return amount > best.amount ? { amount, capture } : best;
      },
      { amount: -1, capture: active.captures[0] },
    );
    if (peak.capture.frame !== 55) {
      throw new Error(`Expected first breathe-calm peak at frame 55; got ${peak.capture.frame}.`);
    }
    if (peak.amount < 0.999) {
      throw new Error(`Breathe-calm peak amount is only ${peak.amount}.`);
    }

    const peakControlPath = controlFramePath(controlFramesDirectory, peak.capture.frame);
    const localization = comparePixelLocalization(
      peakControlPath,
      peak.capture.screenshotPath,
    );
    if (localization.changedPixels <= 0 || !localization.bounds) {
      throw new Error('Breathe-calm peak produced no rendered pixel difference.');
    }
    if (localization.changedFrameRatio > 0.08) {
      throw new Error(
        `Breathe-calm changes ${(localization.changedFrameRatio * 100).toFixed(2)}% of the frame at peak; expected a character-local deformation.`,
      );
    }
    console.log(
      `[LOCALIZATION] peak frame ${peak.capture.frame} · changed=${localization.changedPixels} px (${(localization.changedFrameRatio * 100).toFixed(3)}%) · bbox=${formatBox(localization.bounds)}`,
    );

    console.log('[5/7] Encode full-frame and body-focused normal-speed A/B reviews...');
    const activeVideoPath = join(
      outputDirectory,
      'shot03-recovered-character-breath-active.mp4',
    );
    const abVideoPath = join(
      outputDirectory,
      'shot03-character-settle-vs-breath-ab.mp4',
    );
    const bodyAbVideoPath = join(
      outputDirectory,
      'shot03-character-settle-vs-breath-body-ab.mp4',
    );
    const peakPairPath = join(
      outputDirectory,
      'shot03-breath-visible-frame-0055.png',
    );
    encodeImageSequence(activeDirectory, activeVideoPath);
    encodeAbVideo(controlVideoPath, activeVideoPath, abVideoPath);
    encodeBodyAbVideo(controlVideoPath, activeVideoPath, bodyAbVideoPath);
    createPairStill(peakControlPath, peak.capture.screenshotPath, peakPairPath);

    console.log('[6/7] Local vision review of breathe-calm plausibility and source integrity...');
    const aiPath = join(outputDirectory, 'ollama-recovered-breath-motion-review.json');
    let ai = null;
    if (!options.noAiReview) {
      ai = await reviewGeneratedMedia({
        artifacts: [
          {
            path: controlVideoPath,
            label: 'human-accepted recovered camera + vessel + Enki counter-sway control',
          },
          {
            path: activeVideoPath,
            label: 'same accepted motion plus exact-frame Enki breathe-calm deformation',
          },
          {
            path: abVideoPath,
            label: 'full-frame matched A/B: left accepted counter-sway, right counter-sway plus breathing',
          },
          {
            path: bodyAbVideoPath,
            label: 'normal-speed upper-body A/B preserving Enki head and torso',
          },
          {
            path: peakPairPath,
            label: 'frame 55 BREATH_VISIBLE control versus active peak',
          },
        ],
        task: [
          'Review this as the next bounded Level 2 actor-performance channel for recovered Shot 3.',
          'The left/control motion was already human accepted. The right/active version keeps camera, vessel, and Enki counter-sway identical and adds only torso-anchored anisotropic breathing: max +0.20% X and +0.50% Y.',
          'The breathing is exact-frame with a 110-frame cycle: frame 0 neutral, frame 55 inhale peak, frame 110 neutral, frame 165 second inhale peak, frame 209 settled neutral.',
          `Deterministic evidence: differingFrames=${differingFrames.length}/${FRAME_COUNT}; uniqueBreathStates=${breathStates.size}; repeatability=${repeatability.filter((item) => item.pass).length}/${repeatability.length}; peakChangedFrameRatio=${localization.changedFrameRatio}.`,
          'Blink, legacy water, and legacy rigging remain disabled. Do not evaluate those channels.',
          'Reject if the whole character appears to zoom/pulse unnaturally, feet/contact visibly swim, the head stretches distractingly, or boat/background fragments deform with Enki.',
          'PASS_ADVISORY only means clean enough for human review. Human normal-speed review must decide whether it actually reads as calm breathing and improves the shot.',
        ].join(' '),
        rubric: [
          'breathing is visible but restrained at normal speed',
          'motion reads as calm breathing rather than whole-character zoom or rubbery pulsing',
          'accepted counter-sway and vessel contact remain intact',
          'no boat/background fragments, halos, holes, or doubled edges are exposed',
          'frame 55 reads as a plausible inhale peak and frame 110 returns cleanly to control',
        ],
        outputPath: aiPath,
        requireAi: options.requireAiReview,
        maxVideoSamples: 4,
      });
    } else {
      console.log('[ai] breathe-calm review skipped by --no-ai-review');
    }

    console.log('[7/7] Write breathe-calm proof receipt...');
    const technicalPass =
      repeatability.every((item) => item.pass) &&
      controlSamples.every((item) => item.pixelMatch) &&
      differingFrames.length >= 180 &&
      breathStates.size >= 80 &&
      localization.changedPixels > 0 &&
      localization.changedFrameRatio <= 0.08 &&
      peak.capture.frame === 55 &&
      peak.amount >= 0.999;
    const reportPath = join(
      outputDirectory,
      'pixi-shot03-recovered-breath-motion-proof.json',
    );
    const report = {
      schemaVersion: 1,
      proofType: 'pixi-shot03-recovered-breath-motion-proof',
      generatedAt: new Date().toISOString(),
      sourceCharacterMotionProofPath: character.reportPath,
      sourceAssets: character.report.sourceAssets,
      compositionPolicy: {
        acceptedCharacterMotionFrozen: true,
        addedPerformanceChannel: 'clip:enki:breathe-calm:v1 proof only',
        hiddenLegacyLayers: HIDDEN_LAYER_IDS,
        blinkReactivated: false,
        waterReactivated: false,
        riggingReactivated: false,
        sourceRegenerationPerformed: false,
        canonicalAssetsMutated: false,
        canonicalManifestMutated: false,
      },
      motion: {
        activeProfile: ACTIVE_PROFILE,
        controlProfile: CONTROL_PROFILE,
        exactFrameAuthority: true,
        cycleFrames: 110,
        peakFrames: [55, 165],
        neutralFrames: NEUTRAL_FRAMES,
        maxScaleXDelta: 0.002,
        maxScaleYDelta: 0.005,
        differingFrames: differingFrames.length,
        uniqueBreathStates: breathStates.size,
        peakFrame: peak.capture.frame,
        peakState: peak.capture.breathState,
        peakLocalization: localization,
      },
      technicalEvidence: {
        repeatability,
        controlSamples,
        pass: technicalPass,
      },
      aiReviewPath: options.noAiReview ? null : aiPath,
      aiStatus: ai?.status ?? null,
      artifacts: {
        acceptedCharacterControlVideo: controlVideoPath,
        breathActiveVideo: activeVideoPath,
        breathAbVideo: abVideoPath,
        breathBodyAbVideo: bodyAbVideoPath,
        breathVisiblePair: peakPairPath,
        activeFramesDirectory: activeDirectory,
      },
      humanReview: {
        required: true,
        questions: [
          'At normal speed, does Enki read as calmly breathing without hunting for the motion?',
          'Does the breathing improve the accepted counter-sway rather than make Enki pulse or rubber-band?',
          'Do his vessel contact and apparent weight remain stable?',
          'Do any boat/background fragments deform with him or become exposed?',
        ],
      },
      promotionAllowed: false,
      nextSecondaryChannelAllowed: false,
    };
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    console.log('');
    console.log(
      `[PASS] technical breathe-calm proof: ${technicalPass ? 'PASS' : 'FAIL'} · differing=${differingFrames.length}/${FRAME_COUNT} · states=${breathStates.size} · repeatability=${repeatability.filter((item) => item.pass).length}/${repeatability.length}`,
    );
    if (ai?.status) console.log(`[INFO] local vision status: ${ai.status}`);
    console.log(`[REVIEW] breath active: ${activeVideoPath}`);
    console.log(`[REVIEW] full-frame A/B: ${abVideoPath}`);
    console.log(`[REVIEW] body-focused A/B: ${bodyAbVideoPath}`);
    console.log(`[REVIEW] BREATH_VISIBLE frame 55: ${peakPairPath}`);
    console.log(`[INFO] receipt: ${reportPath}`);
    console.log('[STOP] Human normal-speed breathing acceptance is required before adding another performance/material channel.');

    await maybeOpenReviewArtifacts(
      [activeVideoPath, abVideoPath, bodyAbVideoPath, peakPairPath],
      { enabled: !options.noOpen, delayMs: 120 },
    );

    if (!technicalPass) process.exitCode = 2;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function latestPassingCharacterProof() {
  if (!existsSync(CHARACTER_PROOF_ROOT)) {
    throw new Error(`No character proof root exists: ${CHARACTER_PROOF_ROOT}`);
  }
  const entries = await readdir(CHARACTER_PROOF_ROOT, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(CHARACTER_PROOF_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  for (const directory of directories) {
    const reportPath = join(
      directory,
      'pixi-shot03-recovered-character-motion-proof.json',
    );
    if (!existsSync(reportPath)) continue;
    try {
      const report = JSON.parse(await readFile(reportPath, 'utf8'));
      if (report.proofType !== 'pixi-shot03-recovered-character-motion-proof') continue;
      if (report.technicalEvidence?.pass !== true) continue;
      if (report.aiStatus && report.aiStatus !== 'PASS_ADVISORY') continue;
      const paths = [
        report.sourceAssets?.background?.path,
        report.sourceAssets?.vessel?.path,
        report.sourceAssets?.enki?.path,
        report.artifacts?.activeFramesDirectory,
        report.artifacts?.characterActiveVideo,
      ]
        .filter(Boolean)
        .map((path) => resolve(path));
      if (paths.length !== 5 || !paths.every(existsSync)) continue;
      return { directory, reportPath, report };
    } catch {
      continue;
    }
  }
  throw new Error('No passing recovered-character motion proof found.');
}

function assertCharacterSourceIdentity(report, sourceHashes) {
  for (const name of ['background', 'vessel', 'enki']) {
    const actual = report.sourceAssets?.[name]?.sha256;
    if (actual !== sourceHashes[name]) {
      throw new Error(`Accepted character ${name} digest ${actual ?? '<missing>'} != ${sourceHashes[name]}.`);
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
  await assertBreathContract(host, canvas, ACTIVE_PROFILE, sourceHashes);
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
    const breathState = await requiredAttribute(host, 'data-shot03-breath');
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
      breathState,
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
  await assertBreathContract(host, canvas, ACTIVE_PROFILE, sourceHashes);

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
    result.push({
      frame,
      pass,
      originalSha256: original?.screenshotSha256 ?? null,
      repeatedSha256: hash,
    });
    if (!pass) throw new Error(`Recovered breathe-calm repeatability failed at frame ${frame}.`);
  }
  return result;
}

async function captureControlSamples({
  page,
  sourceHashes,
  controlFramesDirectory,
  outputDirectory,
}) {
  await page.goto(reviewUrl(CONTROL_PROFILE, sourceHashes), { waitUntil: 'networkidle' });
  const host = page.locator('[aria-label="Pixi Shot 3 full-motion renderer"]');
  const canvas = page.locator('canvas[data-pixi-full-motion-surface="true"]');
  const frameControl = page.getByRole('group', { name: 'Exact frame control' });
  await waitForPixiReady(host);
  await assertBreathContract(host, canvas, CONTROL_PROFILE, sourceHashes);

  const result = [];
  for (const frame of SAMPLE_FRAMES) {
    await gotoFrame(frameControl, canvas, frame);
    const path = join(outputDirectory, `frame-${String(frame).padStart(4, '0')}.png`);
    const bytes = await captureCanvasPng(page, canvas, path);
    const hash = prefixedSha(bytes);
    const acceptedPath = controlFramePath(controlFramesDirectory, frame);
    if (!existsSync(acceptedPath)) throw new Error(`Accepted control frame missing: ${acceptedPath}`);
    const acceptedHash = prefixedSha(await readFile(acceptedPath));
    const pixelMatch = hash === acceptedHash;
    if (!pixelMatch) {
      throw new Error(`Breathing control no longer matches accepted character pixels at frame ${frame}.`);
    }
    result.push({
      frame,
      pixelMatch,
      screenshotSha256: hash,
      acceptedSha256: acceptedHash,
      cameraState: await requiredAttribute(host, 'data-shot03-camera'),
      vesselState: await requiredAttribute(host, 'data-shot03-vessel'),
      enkiLocal: await requiredAttribute(host, 'data-shot03-enki-local'),
      breathState: await requiredAttribute(host, 'data-shot03-breath'),
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

async function assertBreathContract(host, canvas, profile, sourceHashes) {
  const expectedControl = profile === CONTROL_PROFILE ? 'breath-control' : 'breath-active';
  const checks = [
    [host, 'data-pixi-review-mode', 'recovered-breath-motion'],
    [host, 'data-pixi-review-composition', 'shot03-recovered-character-plus-breath'],
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
      throw new Error(`Recovered breathe-calm source ${id} digest mismatch.`);
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
        `Pixi breathe-calm preview failed: ${(await host.getAttribute('data-pixi-error')) || 'unknown error'}`,
      );
    }
    await delay(50);
  }
  throw new Error('Timed out waiting for Pixi breathe-calm preview.');
}

async function fullMotionState(host, canvas) {
  const camera = await requiredAttribute(host, 'data-shot03-camera');
  const vessel = await requiredAttribute(host, 'data-shot03-vessel');
  const enki = await requiredAttribute(host, 'data-shot03-enki-local');
  const breath = await requiredAttribute(host, 'data-shot03-breath');
  const layers = await requiredAttribute(canvas, 'data-pixi-source-layer-state');
  const groups = await requiredAttribute(canvas, 'data-pixi-local-group-state');
  return `camera=${camera}|vessel=${vessel}|enki=${enki}|breath=${breath}|layers=${layers}|groups=${groups}`;
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
  throw new Error(`Timed out waiting for breathe-calm frame ${frame}.`);
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

function breathAmount(serialized) {
  const match = /^amount=(-?\d+(?:\.\d+)?),scaleX=(-?\d+(?:\.\d+)?),scaleY=(-?\d+(?:\.\d+)?),cycle=(\d+)$/.exec(serialized);
  return match ? Number(match[1]) : 0;
}

function controlFramePath(directory, frame) {
  return join(directory, `frame-${String(frame).padStart(4, '0')}.png`);
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

function encodeBodyAbVideo(controlVideoPath, activeVideoPath, outputPath) {
  runFfmpeg([
    '-i', controlVideoPath,
    '-i', activeVideoPath,
    '-filter_complex',
    '[0:v]crop=620:1000:98:0,scale=620:1000[left];[1:v]crop=620:1000:98:0,scale=620:1000[right];[left][right]hstack=inputs=2[v]',
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
  if (value === null) throw new Error(`Breathe-calm proof missing attribute ${name}.`);
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
