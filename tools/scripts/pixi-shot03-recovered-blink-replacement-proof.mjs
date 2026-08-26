import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, link, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { maybeOpenReviewArtifacts } from './open-review-artifacts.mjs';
import { reviewGeneratedMedia } from './review-generated-media.mjs';

const ROOT = resolve('.');
const BASE_URL = process.env.ANIMATION_LAB_BASE_URL ?? 'http://localhost:4300';
const CANDIDATE_ROOT = resolve('tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1');
const PRIMARY_PROOF_ROOT = resolve('tmp/animation-previews/pixi-shot03-recovered-motion-proof');
const CANONICAL_BLINK_ROOT = resolve('tmp/animation-previews/pixi-shot03-recovered-blink-proof');
const OUTPUT_ROOT = resolve('tmp/animation-previews/pixi-shot03-recovered-blink-replacement-proof');
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const FPS = 30;
const FRAME_COUNT = 210;
const BLINK_FRAMES = Object.freeze([97, 98, 99, 100, 101, 102, 103, 104, 105, 106]);
const REPEAT_FRAMES = Object.freeze([97, 99, 101, 106]);
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
  const replacement = options.eyeCandidate
    ? await replacementFromPath(options.eyeCandidate)
    : await latestPassingReplacement();
  const canonicalBlink = await latestCanonicalBlinkProof();

  const sourceBytes = {
    background: await readFile(recovery.backgroundPath),
    vessel: await readFile(recovery.vesselPath),
    enki: await readFile(recovery.enkiPath),
    eyes: await readFile(replacement.candidate.candidatePath),
  };
  const sourceHashes = Object.fromEntries(
    Object.entries(sourceBytes).map(([name, bytes]) => [name, prefixedSha(bytes)]),
  );
  assertPrimarySourceIdentity(primary.report, sourceHashes);

  const controlFramesDirectory = resolve(primary.report.artifacts?.activeFramesDirectory ?? '');
  const controlVideoPath = resolve(primary.report.artifacts?.activeVideo ?? '');
  if (!existsSync(controlFramesDirectory) || !existsSync(controlVideoPath)) {
    throw new Error('Accepted recovered-primary review media is missing.');
  }

  const baselineChangedPixels = Number(
    canonicalBlink?.report?.isolation?.apexLocalization?.changedPixels ?? 104,
  );
  const minimumStrengthPixels = Math.max(
    baselineChangedPixels + 40,
    Math.ceil(baselineChangedPixels * 1.5),
  );

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDirectory = join(OUTPUT_ROOT, stamp);
  const activeBlinkDirectory = join(outputDirectory, 'blink-window-active');
  const fullActiveDirectory = join(outputDirectory, 'full-active');
  const repeatDirectory = join(outputDirectory, 'repeat-samples');
  await Promise.all([
    mkdir(activeBlinkDirectory, { recursive: true }),
    mkdir(fullActiveDirectory, { recursive: true }),
    mkdir(repeatDirectory, { recursive: true }),
  ]);

  console.log('Pixi Shot 3 recovered stronger-blink replacement proof');
  console.log(`Animation Lab: ${BASE_URL}`);
  console.log(`Replacement candidate: ${replacement.candidate.candidatePath}`);
  console.log(`Replacement checksum: ${sourceHashes.eyes}`);
  console.log(`Replacement eye-state QA: ${replacement.candidate.eyeStateProof?.pass ? 'PASS' : 'FAIL'}`);
  console.log(`Canonical perceptual baseline: ${baselineChangedPixels} changed apex pixels`);
  console.log(`Minimum stronger-candidate signal: ${minimumStrengthPixels} apex pixels`);
  console.log('Accepted recovered primary motion remains frozen; water and rigging remain hidden.');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 2200 } });
  const page = await context.newPage();

  try {
    await installRecoveryRoutes(page, sourceBytes);
    await page.goto(reviewUrl(sourceHashes), { waitUntil: 'networkidle' });
    const host = page.locator('[aria-label="Pixi Shot 3 full-motion renderer"]');
    const canvas = page.locator('canvas[data-pixi-full-motion-surface="true"]');
    const frameControl = page.getByRole('group', { name: 'Exact frame control' });
    await waitForPixiReady(host);
    await assertBlinkContract(host, canvas, sourceHashes);

    console.log('[1/6] Capture only the 10 active blink-window frames...');
    const captures = [];
    for (const frame of BLINK_FRAMES) {
      await gotoFrame(frameControl, canvas, frame);
      const blinkOpacity = Number(await requiredAttribute(host, 'data-shot03-blink-opacity'));
      if (!(blinkOpacity > 0)) throw new Error(`Expected active blink opacity at frame ${frame}.`);
      const screenshotPath = join(activeBlinkDirectory, `frame-${String(frame).padStart(4, '0')}.png`);
      const screenshot = await captureCanvasPng(page, canvas, screenshotPath);
      captures.push({
        frame,
        blinkOpacity,
        screenshotPath,
        screenshotSha256: prefixedSha(screenshot),
        state: await fullMotionState(host, canvas),
      });
    }

    console.log('[2/6] Verify exact-frame candidate repeatability...');
    const repeatability = [];
    for (const frame of REPEAT_FRAMES) {
      await gotoFrame(frameControl, canvas, frame);
      const repeatedPath = join(repeatDirectory, `frame-${String(frame).padStart(4, '0')}.png`);
      const repeated = await captureCanvasPng(page, canvas, repeatedPath);
      const original = captures.find((item) => item.frame === frame);
      const repeatedHash = prefixedSha(repeated);
      const repeatedState = await fullMotionState(host, canvas);
      const pass = Boolean(
        original &&
        original.screenshotSha256 === repeatedHash &&
        original.state === repeatedState,
      );
      repeatability.push({ frame, pass, originalSha256: original?.screenshotSha256, repeatedSha256: repeatedHash });
      if (!pass) throw new Error(`Replacement blink repeatability failed at frame ${frame}.`);
    }

    console.log('[3/6] Verify blink isolation and stronger localized signal...');
    const comparisons = [];
    for (const capture of captures) {
      const controlPath = join(controlFramesDirectory, `frame-${String(capture.frame).padStart(4, '0')}.png`);
      if (!existsSync(controlPath)) throw new Error(`Missing accepted primary control frame ${controlPath}.`);
      const localization = comparePixelLocalization(controlPath, capture.screenshotPath);
      if (localization.changedPixels <= 0 || !localization.bounds) {
        throw new Error(`Replacement blink frame ${capture.frame} produced no visible pixel change.`);
      }
      if (localization.changedFrameRatio > 0.02) {
        throw new Error(
          `Replacement blink frame ${capture.frame} affects ${(localization.changedFrameRatio * 100).toFixed(3)}% of the full frame; expected a local facial edit.`,
        );
      }
      comparisons.push({ ...capture, controlPath, localization });
    }

    const apex = comparisons.reduce((best, item) =>
      item.blinkOpacity > best.blinkOpacity ? item : best,
    );
    const strongerThanCanonical = apex.localization.changedPixels >= minimumStrengthPixels;
    console.log(
      `[LOCALIZATION] apex frame ${apex.frame} · changed=${apex.localization.changedPixels} px (${(apex.localization.changedFrameRatio * 100).toFixed(4)}%) · bbox=${formatBox(apex.localization.bounds)} · canonical=${baselineChangedPixels} · stronger=${strongerThanCanonical ? 'YES' : 'NO'}`,
    );
    if (!strongerThanCanonical) {
      throw new Error(
        `Replacement blink is still too weak technically: ${apex.localization.changedPixels} changed pixels; expected at least ${minimumStrengthPixels} versus canonical ${baselineChangedPixels}.`,
      );
    }

    console.log('[4/6] Reuse accepted primary frames and encode full 7-second candidate review...');
    const blinkFrameSet = new Set(BLINK_FRAMES);
    for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
      const name = `frame-${String(frame).padStart(4, '0')}.png`;
      const target = join(fullActiveDirectory, name);
      if (blinkFrameSet.has(frame)) {
        await copyFile(join(activeBlinkDirectory, name), target);
        continue;
      }
      const control = join(controlFramesDirectory, name);
      try {
        await link(control, target);
      } catch {
        await copyFile(control, target);
      }
    }

    const activeVideoPath = join(outputDirectory, 'shot03-recovered-stronger-blink-active.mp4');
    const abVideoPath = join(outputDirectory, 'shot03-primary-vs-stronger-blink-ab.mp4');
    const apexPairPath = join(outputDirectory, `shot03-stronger-blink-apex-${String(apex.frame).padStart(4, '0')}.png`);
    const focusedPairPath = join(outputDirectory, `shot03-stronger-blink-focused-${String(apex.frame).padStart(4, '0')}.png`);
    encodeImageSequence(fullActiveDirectory, activeVideoPath);
    encodeAbVideo(controlVideoPath, activeVideoPath, abVideoPath);
    createPairStill(apex.controlPath, apex.screenshotPath, apexPairPath);
    createFocusedPair(
      apex.controlPath,
      apex.screenshotPath,
      paddedBox(apex.localization.bounds, 90, WIDTH, HEIGHT),
      focusedPairPath,
    );

    console.log('[5/6] Local vision review of stronger blink perceptibility...');
    const aiPath = join(outputDirectory, 'ollama-recovered-stronger-blink-review.json');
    let ai = null;
    if (!options.noAiReview) {
      const artifacts = [
        { path: recovery.staticRecompositionPath, label: 'human-accepted recovered static composition' },
        { path: replacement.candidate.candidatePath, label: 'new source-faithful closed-eye replacement candidate' },
        { path: replacement.candidate.reviewArtifacts?.compositePath, label: 'replacement candidate composite on editorial source' },
        { path: controlVideoPath, label: 'accepted recovered-primary motion without blink' },
        { path: activeVideoPath, label: 'same accepted motion with stronger replacement blink during frames 97-106' },
        { path: abVideoPath, label: 'matched A/B: left accepted primary, right stronger replacement blink' },
        { path: focusedPairPath, label: `magnified blink apex at frame ${apex.frame}` },
      ].filter((item) => item.path && existsSync(item.path));
      ai = await reviewGeneratedMedia({
        artifacts,
        task: [
          'Review a stronger replacement blink candidate on the already accepted recovered Shot 3 primary motion.',
          'The old canonical blink was technically correct but human-invisible at normal speed, with only 104 changed rendered pixels at apex.',
          `This replacement changes ${apex.localization.changedPixels} pixels at apex in bbox ${formatBox(apex.localization.bounds)} and is required to remain under 2% of the frame.`,
          'Water and rigging remain hidden. Camera, vessel, Enki, timing, and all non-eye motion are unchanged from the accepted primary proof.',
          'Judge whether the blink is now genuinely noticeable at normal speed while remaining natural, face-localized, registered to Enki, and free of halos/ghosting.',
          'Do not equate a larger pixel count with perceptual success; human normal-speed review remains authoritative.',
        ].join(' '),
        rubric: [
          'replacement closed-eye state remains source-faithful to Enki',
          'blink is visibly stronger than the old canonical blink',
          'blink remains localized to the eye/upper-face region',
          'no halo, detached eye, facial identity shift, or motion registration error',
          'normal-speed perceptibility is clearly distinguished from technical isolation',
        ],
        outputPath: aiPath,
        requireAi: options.requireAiReview,
        maxVideoSamples: 5,
      });
    }

    console.log('[6/6] Write replacement blink receipt...');
    const technicalPass =
      replacement.candidate.eyeStateProof?.pass === true &&
      repeatability.every((item) => item.pass) &&
      comparisons.length === BLINK_FRAMES.length &&
      comparisons.every((item) => item.localization.changedPixels > 0 && item.localization.changedFrameRatio <= 0.02) &&
      strongerThanCanonical;
    const reportPath = join(outputDirectory, 'pixi-shot03-recovered-blink-replacement-proof.json');
    const report = {
      schemaVersion: 1,
      proofType: 'pixi-shot03-recovered-blink-replacement-proof',
      generatedAt: new Date().toISOString(),
      sourcePrimaryMotionProofPath: primary.reportPath,
      sourceCanonicalBlinkProofPath: canonicalBlink?.reportPath ?? null,
      sourceReplacementRunDirectory: replacement.runDirectory,
      replacementCandidatePath: replacement.candidate.candidatePath,
      replacementCandidateChecksum: sourceHashes.eyes,
      replacementEyeStateProof: replacement.candidate.eyeStateProof,
      sourceAssets: {
        background: { path: recovery.backgroundPath, sha256: sourceHashes.background },
        vessel: { path: recovery.vesselPath, sha256: sourceHashes.vessel },
        enki: { path: recovery.enkiPath, sha256: sourceHashes.enki },
        eyes: { path: replacement.candidate.candidatePath, sha256: sourceHashes.eyes },
      },
      isolation: {
        blinkFrames: BLINK_FRAMES,
        canonicalApexChangedPixels: baselineChangedPixels,
        minimumStrengthPixels,
        candidateApexFrame: apex.frame,
        candidateApexLocalization: apex.localization,
        strongerThanCanonical,
      },
      technicalEvidence: { repeatability, pass: technicalPass },
      aiReviewPath: options.noAiReview ? null : aiPath,
      aiStatus: ai?.status ?? null,
      artifacts: {
        fullActiveFramesDirectory: fullActiveDirectory,
        acceptedPrimaryControlVideo: controlVideoPath,
        blinkActiveVideo: activeVideoPath,
        blinkAbVideo: abVideoPath,
        apexPair: apexPairPath,
        focusedApexPair: focusedPairPath,
      },
      policy: {
        canonicalAssetsMutated: false,
        canonicalManifestMutated: false,
        automaticPromotionAllowed: false,
        riggingReactivated: false,
        waterReactivated: false,
        humanNormalSpeedReviewRequired: true,
      },
    };
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    console.log('');
    console.log(
      `[PASS] technical stronger-blink proof: ${technicalPass ? 'PASS' : 'FAIL'} · apex=${apex.localization.changedPixels}px vs canonical=${baselineChangedPixels}px · stronger=${strongerThanCanonical ? 'YES' : 'NO'} · repeatability=${repeatability.filter((item) => item.pass).length}/${repeatability.length}`,
    );
    if (ai?.status) console.log(`[INFO] local vision status: ${ai.status}`);
    console.log(`[REVIEW] stronger blink active: ${activeVideoPath}`);
    console.log(`[REVIEW] primary vs stronger blink A/B: ${abVideoPath}`);
    console.log(`[REVIEW] focused apex: ${focusedPairPath}`);
    console.log(`[INFO] receipt: ${reportPath}`);
    console.log('[STOP] Human normal-speed visibility remains the final blink gate; do not promote or add rigging/water yet.');
    await maybeOpenReviewArtifacts([activeVideoPath, abVideoPath, focusedPairPath], {
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
    const staticProofPath = join(directory, 'static-recomposition-proof', 'shot03-static-recomposition-proof.json');
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
      if (![backgroundPath, vesselPath, enkiPath, staticRecompositionPath].every(existsSync)) continue;
      return { directory, staticProofPath, backgroundPath, vesselPath, enkiPath, staticRecompositionPath };
    } catch {
      continue;
    }
  }
  throw new Error('No passing recovered Shot 3 static package found.');
}

async function latestPassingPrimaryProof() {
  const entries = await readdir(PRIMARY_PROOF_ROOT, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => join(PRIMARY_PROOF_ROOT, entry.name)).sort((a, b) => basename(b).localeCompare(basename(a)));
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

async function latestCanonicalBlinkProof() {
  try {
    const entries = await readdir(CANONICAL_BLINK_ROOT, { withFileTypes: true });
    const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => join(CANONICAL_BLINK_ROOT, entry.name)).sort((a, b) => basename(b).localeCompare(basename(a)));
    for (const directory of directories) {
      const reportPath = join(directory, 'pixi-shot03-recovered-blink-proof.json');
      if (!existsSync(reportPath)) continue;
      try {
        const report = JSON.parse(await readFile(reportPath, 'utf8'));
        if (report.technicalEvidence?.pass === true) return { directory, reportPath, report };
      } catch {
        continue;
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function latestPassingReplacement() {
  const entries = await readdir(CANDIDATE_ROOT, { withFileTypes: true });
  const directories = entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('_')).map((entry) => join(CANDIDATE_ROOT, entry.name)).sort((a, b) => basename(b).localeCompare(basename(a)));
  for (const runDirectory of directories) {
    const runPath = join(runDirectory, 'candidate-run.json');
    if (!existsSync(runPath)) continue;
    try {
      const run = JSON.parse(await readFile(runPath, 'utf8'));
      if (run.type !== 'shot03-character-state-replacement-candidate') continue;
      const candidate = (run.candidates ?? []).find((item) => item.replacementForLayerId === 'shot03-enki-eyes-v1');
      if (!candidate?.candidatePath || candidate.eyeStateProof?.pass !== true) continue;
      if (!existsSync(candidate.candidatePath)) continue;
      return { runDirectory, runPath, run, candidate };
    } catch {
      continue;
    }
  }
  throw new Error('No QA-passed Shot 3 closed-eye replacement candidate exists.');
}

async function replacementFromPath(pathValue) {
  const candidatePath = resolve(pathValue);
  if (!existsSync(candidatePath)) throw new Error(`Eye candidate does not exist: ${candidatePath}`);
  const replacement = await latestPassingReplacement();
  if (resolve(replacement.candidate.candidatePath) !== candidatePath) {
    throw new Error('Explicit --eye-candidate must match the newest QA-passed replacement candidate receipt.');
  }
  return replacement;
}

function assertPrimarySourceIdentity(report, sourceHashes) {
  for (const name of ['background', 'vessel', 'enki']) {
    const actual = report.sourceAssets?.[name]?.sha256;
    const expected = sourceHashes[name];
    if (actual !== expected) throw new Error(`Accepted primary proof ${name} digest ${actual ?? '<missing>'} != ${expected}.`);
  }
}

async function installRecoveryRoutes(page, sourceBytes) {
  for (const [name, bytes] of Object.entries(sourceBytes)) {
    await page.route(`**/__shot03-recovery/${name}.png`, (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: bytes }),
    );
  }
}

function reviewUrl(sourceHashes) {
  const url = new URL(BASE_URL);
  url.searchParams.set('shot03-motion-profile', ACTIVE_PROFILE);
  url.searchParams.set('shot03-recovery-background-sha256', sourceHashes.background);
  url.searchParams.set('shot03-recovery-vessel-sha256', sourceHashes.vessel);
  url.searchParams.set('shot03-recovery-enki-sha256', sourceHashes.enki);
  url.searchParams.set('shot03-recovery-eyes-sha256', sourceHashes.eyes);
  return url.toString();
}

async function assertBlinkContract(host, canvas, sourceHashes) {
  const checks = [
    [host, 'data-pixi-review-mode', 'recovered-blink-motion'],
    [host, 'data-pixi-review-composition', 'shot03-recovered-primary-plus-blink'],
    [host, 'data-shot03-motion-profile', ACTIVE_PROFILE],
    [host, 'data-shot03-recovery-control', 'blink-active'],
    [host, 'data-shot03-recovery-hidden-layers', HIDDEN_LAYER_IDS.join(',')],
    [host, 'data-shot03-recovery-eye-source', 'candidate'],
    [canvas, 'data-pixi-source-asset-ids', EXPECTED_SOURCE_IDS.join(',')],
    [canvas, 'data-pixi-source-asset-verification', 'verified'],
    [canvas, 'data-pixi-render-mode', 'manual-exact-frame'],
  ];
  for (const [locator, name, expected] of checks) {
    const actual = await locator.getAttribute(name);
    if (actual !== expected) throw new Error(`Expected ${name}=${expected}, received ${actual ?? '<missing>'}.`);
  }
  const hashes = (await requiredAttribute(canvas, 'data-pixi-source-asset-sha256')).split(',');
  const byId = new Map(EXPECTED_SOURCE_IDS.map((id, index) => [id, hashes[index]]));
  for (const [id, expected] of [
    ['shot03-background-v1', sourceHashes.background],
    ['shot03-vessel-v1', sourceHashes.vessel],
    ['shot03-enki-body-v1', sourceHashes.enki],
    ['shot03-enki-eyes-v1', sourceHashes.eyes],
  ]) {
    if (byId.get(id) !== expected) throw new Error(`Recovered candidate source ${id} digest mismatch.`);
  }
}

async function assertAnimationLabReachable() {
  try {
    const response = await fetch(BASE_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    throw new Error(`Animation Lab is not reachable at ${BASE_URL}. Keep pnpm start:all running. ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function waitForPixiReady(host) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const state = await host.getAttribute('data-pixi-state');
    if (state === 'READY') return;
    if (state === 'ERROR') throw new Error(`Pixi blink replacement preview failed: ${(await host.getAttribute('data-pixi-error')) || 'unknown error'}`);
    await delay(50);
  }
  throw new Error('Timed out waiting for Pixi blink replacement preview.');
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
  for (let index = 0; index < Math.floor(frame / 10); index += 1) await frameControl.press('PageDown');
  for (let index = 0; index < frame % 10; index += 1) await frameControl.press('ArrowRight');
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if ((await canvas.getAttribute('data-pixi-frame')) === String(frame)) return;
    await delay(20);
  }
  throw new Error(`Timed out waiting for blink replacement frame ${frame}.`);
}

async function captureCanvasPng(page, canvas, outputPath) {
  const originalStyles = await canvas.evaluate((element) => ({
    width: element.width,
    height: element.height,
    canvasStyle: element.getAttribute('style'),
    hostStyle: element.parentElement?.getAttribute('style') ?? null,
  }));
  if (originalStyles.width !== WIDTH || originalStyles.height !== HEIGHT) throw new Error(`Pixi backing canvas ${originalStyles.width}x${originalStyles.height} != ${WIDTH}x${HEIGHT}.`);
  await canvas.evaluate((element, dimensions) => {
    const host = element.parentElement;
    if (host) host.style.overflow = 'visible';
    Object.assign(element.style, {
      position: 'fixed', left: '0px', top: '0px', width: `${dimensions.width}px`, height: `${dimensions.height}px`,
      maxWidth: 'none', maxHeight: 'none', margin: '0', border: '0', borderRadius: '0', transform: 'none', zIndex: '2147483647',
    });
  }, { width: WIDTH, height: HEIGHT });
  try {
    return await page.screenshot({ path: outputPath, animations: 'disabled', scale: 'css', clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
  } finally {
    await canvas.evaluate((element, styles) => {
      if (styles.canvasStyle === null) element.removeAttribute('style'); else element.setAttribute('style', styles.canvasStyle);
      const host = element.parentElement;
      if (host) {
        if (styles.hostStyle === null) host.removeAttribute('style'); else host.setAttribute('style', styles.hostStyle);
      }
    }, originalStyles);
  }
}

function comparePixelLocalization(controlPath, activePath) {
  const control = decodeRgb(controlPath);
  const active = decodeRgb(activePath);
  let minX = WIDTH, minY = HEIGHT, maxX = -1, maxY = -1, changedPixels = 0;
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
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return {
    changedPixels,
    changedFrameRatio: changedPixels / PIXELS,
    bounds: maxX >= minX && maxY >= minY ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } : null,
  };
}

function decodeRgb(path) {
  const result = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-i', path, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], {
    cwd: ROOT, encoding: null, maxBuffer: PIXELS * 3 + 1024, windowsHide: true, shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 || !Buffer.isBuffer(result.stdout) || result.stdout.length !== PIXELS * 3) throw new Error(`Could not decode RGB frame ${path}.`);
  return result.stdout;
}

function encodeImageSequence(directory, outputPath) {
  runFfmpeg(['-framerate', String(FPS), '-start_number', '0', '-i', join(directory, 'frame-%04d.png'), '-frames:v', String(FRAME_COUNT), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS), outputPath]);
}

function encodeAbVideo(controlVideoPath, activeVideoPath, outputPath) {
  runFfmpeg(['-i', controlVideoPath, '-i', activeVideoPath, '-filter_complex', '[0:v]scale=540:960[left];[1:v]scale=540:960[right];[left][right]hstack=inputs=2[v]', '-map', '[v]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-shortest', outputPath]);
}

function createPairStill(controlPath, activePath, outputPath) {
  runFfmpeg(['-i', controlPath, '-i', activePath, '-filter_complex', '[0:v]scale=540:960[left];[1:v]scale=540:960[right];[left][right]hstack=inputs=2[v]', '-map', '[v]', '-frames:v', '1', outputPath]);
}

function createFocusedPair(controlPath, activePath, box, outputPath) {
  const crop = `crop=${box.width}:${box.height}:${box.x}:${box.y}`;
  runFfmpeg(['-i', controlPath, '-i', activePath, '-filter_complex', `[0:v]${crop},scale=720:-2[left];[1:v]${crop},scale=720:-2[right];[left][right]hstack=inputs=2[v]`, '-map', '[v]', '-frames:v', '1', outputPath]);
}

function paddedBox(box, padding, frameWidth, frameHeight) {
  const x = Math.max(0, box.x - padding), y = Math.max(0, box.y - padding);
  const right = Math.min(frameWidth, box.x + box.width + padding), bottom = Math.min(frameHeight, box.y + box.height + padding);
  return { x, y, width: Math.max(2, right - x), height: Math.max(2, bottom - y) };
}

function formatBox(box) { return `${box.width}x${box.height}@(${box.x},${box.y})`; }

function runFfmpeg(args) {
  const result = spawnSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { cwd: ROOT, stdio: 'inherit', windowsHide: true, shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffmpeg failed with exit ${result.status ?? 1}.`);
}

async function requiredAttribute(locator, name) {
  const value = await locator.getAttribute(name);
  if (value === null) throw new Error(`Recovered blink replacement proof missing attribute ${name}.`);
  return value;
}

function prefixedSha(bytes) { return `sha256:${createHash('sha256').update(bytes).digest('hex')}`; }
function delay(ms) { return new Promise((resolvePromise) => setTimeout(resolvePromise, ms)); }

function parseOptions(args) {
  const result = { noOpen: false, noAiReview: false, requireAiReview: false, eyeCandidate: undefined };
  for (const arg of args) {
    if (arg === '--no-open') result.noOpen = true;
    else if (arg === '--no-ai-review') result.noAiReview = true;
    else if (arg === '--require-ai-review') result.requireAiReview = true;
    else if (arg.startsWith('--eye-candidate=')) result.eyeCandidate = arg.slice('--eye-candidate='.length);
    else throw new Error(`Unknown option ${arg}.`);
  }
  return result;
}
