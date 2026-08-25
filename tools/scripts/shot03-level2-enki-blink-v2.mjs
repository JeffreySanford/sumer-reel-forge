import { createHash, randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { checkWorkflowHostCompatibility } from '../renderer/comfyui-workflow-doctor.mjs';
import {
  analyzeGrayMask,
  constrainSamEyeMask,
  deriveEnkiUpperFaceRoi,
  dilateEyeMaskWithinConstraints,
} from '../animation/src/level2-character-state-localization.mjs';

const MANIFEST_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const ASSET_ROOT = resolve('assets');
const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const INPUT_ROOT = resolve(
  'tmp/animation-assets/character-state-inputs/shot03-enki-eyes-v1',
);
const SAM_WORKFLOW_PATH = resolve(
  'tools/renderer/workflows/semantic-overlay-sam3-api.json',
);
const INPAINT_WORKFLOW_PATH = resolve(
  'tools/renderer/workflows/shot03-character-state-inpaint-api.json',
);
const BASE_URL = (
  process.env.COMFYUI_BASE_URL ?? 'http://127.0.0.1:8188'
).replace(/\/$/, '');
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const SHOT_NUMBER = 3;
const LAYER_ID = 'shot03-enki-eyes-v1';
const ENKI_BODY_ID = 'shot03-enki-body-v1';
const MASK_THRESHOLD = 16;
const INPAINT_PADDING = 40;
const CROP_ALIGNMENT = 8;

const command = process.argv[2] ?? 'preflight';

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  if (!['preflight', 'generate', 'verify', 'preview', 'all'].includes(command)) {
    throw new Error(
      'Usage: node tools/scripts/shot03-level2-enki-blink.mjs <preflight|generate|verify|preview|all>',
    );
  }

  if (command === 'preview') {
    await renderCombinedPreview();
    return;
  }

  const context = await loadContext();
  const preflight = await runPreflight(context);
  printPreflight(preflight);

  if (command === 'preflight') {
    if (!preflight.ok) process.exitCode = 2;
    return;
  }
  if (!preflight.ok) throw new Error('Blink production is blocked by preflight checks.');

  let generated = null;
  if (command === 'generate' || command === 'all') {
    generated = await generateBlinkCandidate(context);
    console.log(`Generated blink candidate: ${generated.candidatePath}`);
  }

  if (command === 'verify' || command === 'all') {
    const verification = await verifyNewestCandidate(
      context,
      generated?.runDirectory,
    );
    printVerification(verification);
    if (!verification.passed) {
      process.exitCode = 2;
      return;
    }
  }

  if (command === 'all') await renderCombinedPreview();
}

async function loadContext() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const shot = manifest.shots?.find(
    (item) => item.sourceShotNumber === SHOT_NUMBER,
  );
  const layer = shot?.layers?.find((item) => item.id === LAYER_ID);
  const body = shot?.layers?.find((item) => item.id === ENKI_BODY_ID);
  if (!shot || !layer || !body) {
    throw new Error(`Shot ${SHOT_NUMBER} blink manifest configuration is incomplete.`);
  }
  if (
    layer.role !== 'character-state' ||
    !layer.motionPresets?.includes('blinkOnce')
  ) {
    throw new Error(`${LAYER_ID} must remain a character-state blinkOnce layer.`);
  }
  if (layer.state === 'approved') {
    throw new Error(
      `${LAYER_ID} is already approved; refusing to regenerate a canonical state.`,
    );
  }
  if (
    body.state !== 'approved' ||
    body.review?.status !== 'approved' ||
    !body.sha256
  ) {
    throw new Error(
      `${ENKI_BODY_ID} must remain an approved checksum-backed identity anchor.`,
    );
  }

  const editorialPath = resolve(ASSET_ROOT, shot.sourceFrame);
  const bodyPath = resolve(ASSET_ROOT, body.path);
  const sourceDimensions = readPngDimensions(
    await readFile(editorialPath),
    'Shot 3 editorial source',
  );
  const bodyDimensions = readPngDimensions(
    await readFile(bodyPath),
    ENKI_BODY_ID,
  );
  assertSameDimensions(sourceDimensions, bodyDimensions, ENKI_BODY_ID);
  await verifyStoredChecksum(body, bodyPath);

  return {
    manifest,
    shot,
    layer,
    body,
    editorialPath,
    bodyPath,
    sourceDimensions,
  };
}

async function runPreflight(context) {
  const checks = [
    await fileCheck('Animation manifest', MANIFEST_PATH),
    await fileCheck('Editorial source', context.editorialPath),
    await fileCheck('Approved Enki identity layer', context.bodyPath),
    await fileCheck('SAM eye-localization workflow', SAM_WORKFLOW_PATH),
    await fileCheck('Character-state inpaint workflow', INPAINT_WORKFLOW_PATH),
    await httpCheck('ComfyUI', `${BASE_URL}/system_stats`),
  ];
  const [samCompatibility, inpaintCompatibility] = await Promise.all([
    checkWorkflowHostCompatibility({
      workflowPath: SAM_WORKFLOW_PATH,
      baseUrl: BASE_URL,
    }),
    checkWorkflowHostCompatibility({
      workflowPath: INPAINT_WORKFLOW_PATH,
      baseUrl: BASE_URL,
    }),
  ]);
  return {
    ok:
      checks.every((check) => check.ok) &&
      samCompatibility.ok &&
      inpaintCompatibility.ok,
    checks,
    samCompatibility,
    inpaintCompatibility,
  };
}

function printPreflight(result) {
  console.log('Shot 3 Level 2 Enki blink preflight');
  for (const check of result.checks) {
    console.log(`${check.ok ? '[ok]' : '[blocked]'} ${check.name}: ${check.detail}`);
  }
  console.log(
    `${result.samCompatibility.ok ? '[ok]' : '[blocked]'} SAM host compatibility: ${result.samCompatibility.nodeCount} nodes`,
  );
  console.log(
    `${result.inpaintCompatibility.ok ? '[ok]' : '[blocked]'} character-state inpaint compatibility: ${result.inpaintCompatibility.nodeCount} nodes`,
  );
}

async function generateBlinkCandidate(context) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const inputDirectory = join(INPUT_ROOT, stamp);
  const runDirectory = join(CANDIDATE_ROOT, stamp);
  const shotDirectory = join(runDirectory, 'shot-03');
  await mkdir(inputDirectory, { recursive: true });
  await mkdir(shotDirectory, { recursive: true });
  assertInside(CANDIDATE_ROOT, runDirectory, 'Blink candidate output');

  const bodyRgba = decodeRgba(context.bodyPath, context.sourceDimensions);
  const roi = deriveEnkiUpperFaceRoi({
    bodyRgba,
    dimensions: context.sourceDimensions,
  });
  const faceCropPath = join(inputDirectory, 'enki-upper-face-localizer.png');
  cropPng(context.bodyPath, faceCropPath, roi.crop);

  const faceUpload = await uploadImage(
    faceCropPath,
    `srf-${context.manifest.manifestId}-shot03-enki-upper-face-localizer.png`,
  );
  const samTemplate = JSON.parse(await readFile(SAM_WORKFLOW_PATH, 'utf8'));
  const eyePrompt = [
    'This crop contains only the upper portion of Enki, the approved painted character.',
    'Select only the visible eye shapes and eyelids.',
    'Do not select forehead, eyebrows, nose, cheeks, beard, hair, headwear, robe, or background.',
    'Prefer two small eye/eyelid regions over one broad facial region.',
    'This is localization only; do not invent or redraw pixels.',
  ].join(' ');
  const samWorkflow = replaceTokens(samTemplate, {
    '{{SOURCE_IMAGE}}': faceUpload.name,
    '{{LAYER_PROMPT}}': eyePrompt,
    '{{PROMPT}}': eyePrompt,
    '{{NEGATIVE_PROMPT}}': '',
    '{{SEED}}': 20260825,
    '{{OUTPUT_PREFIX}}': 'srf-shot03-enki-eyes-localization-v2',
  });
  const eyeDetection = await runWorkflowForImage(
    samWorkflow,
    'blink eye localization',
  );
  const detectedEyesPath = join(
    inputDirectory,
    'detected-eyes-upper-face-rgba.png',
  );
  await writeFile(detectedEyesPath, eyeDetection.bytes);
  const samDimensions = readPngDimensions(
    eyeDetection.bytes,
    'Detected upper-face eye localization',
  );
  const samRgba = decodeRgba(detectedEyesPath, samDimensions);

  const constrained = constrainSamEyeMask({
    samRgba,
    samDimensions,
    crop: roi.crop,
    bodyRgba,
    dimensions: context.sourceDimensions,
    eyeBand: roi.eyeBand,
  });
  const finalMask = dilateEyeMaskWithinConstraints({
    mask: constrained.mask,
    bodyRgba,
    dimensions: context.sourceDimensions,
    eyeBand: roi.eyeBand,
    radius: 1,
  });
  const maskPath = join(inputDirectory, 'eye-state-mask-constrained.png');
  writeGrayPng(finalMask, context.sourceDimensions, maskPath);

  const maskAnalysis = analyzeGrayMask(finalMask, context.sourceDimensions);
  const localization = validateEyeLocalization({
    mask: finalMask,
    bodyRgba,
    maskAnalysis,
    roi,
    dimensions: context.sourceDimensions,
    constrained,
  });
  if (!localization.pass) {
    const reportPath = join(inputDirectory, 'eye-localization-blocked.json');
    await writeJson(reportPath, {
      schemaVersion: 2,
      type: 'shot03-eye-localization-preflight',
      generatedAt: new Date().toISOString(),
      layerId: LAYER_ID,
      roi,
      samDimensions,
      maskAnalysis,
      localization,
      constrained: {
        samSelected: constrained.samSelected,
        outsideBodyRejected: constrained.outsideBodyRejected,
        outsideBandRejected: constrained.outsideBandRejected,
      },
      faceCropPath,
      detectedEyesPath,
      maskPath,
    });
    throw new Error(
      `Eye localization failed deterministic safety checks: ${localization.reasons.join('; ')}. Eye-band fill ${(localization.eyeBandFillRatio * 100).toFixed(1)}%. Diagnostics: ${reportPath}`,
    );
  }

  const inpaintCrop = paddedAlignedCrop(
    maskAnalysis.bounds,
    INPAINT_PADDING,
    context.sourceDimensions.width,
    context.sourceDimensions.height,
  );
  const sourceCropPath = join(inputDirectory, 'editorial-eye-state-crop.png');
  const maskCropPath = join(inputDirectory, 'eye-state-mask-crop.png');
  cropPng(context.editorialPath, sourceCropPath, inpaintCrop);
  cropPng(maskPath, maskCropPath, inpaintCrop);

  const [sourceUpload, maskUpload] = await Promise.all([
    uploadImage(
      sourceCropPath,
      `srf-${context.manifest.manifestId}-shot03-blink-source-crop.png`,
    ),
    uploadImage(
      maskCropPath,
      `srf-${context.manifest.manifestId}-shot03-blink-mask-crop.png`,
    ),
  ]);
  const inpaintTemplate = JSON.parse(
    await readFile(INPAINT_WORKFLOW_PATH, 'utf8'),
  );
  const blinkPrompt = [
    'The supplied crop is the sole identity authority.',
    'Close the existing visible eyelids naturally for one calm blink.',
    'Keep the exact same man, face, age, expression, gaze direction, brow, nose, beard, skin tone, lighting, perspective, and painterly brushwork.',
    'Modify only the supplied eye-state mask. Do not alter any unmasked facial feature.',
  ].join(' ');
  const inpaintWorkflow = replaceTokens(inpaintTemplate, {
    '{{SOURCE_IMAGE}}': sourceUpload.name,
    '{{AUXILIARY_IMAGE}}': maskUpload.name,
    '{{LAYER_PROMPT}}': blinkPrompt,
    '{{PROMPT}}': blinkPrompt,
    '{{NEGATIVE_PROMPT}}': '',
    '{{SEED}}': 20260825,
    '{{OUTPUT_PREFIX}}': 'srf-shot03-enki-eyes-closed-v2',
  });
  const generated = await runWorkflowForImage(
    inpaintWorkflow,
    'blink-state inpaint',
  );
  const generatedCropPath = join(inputDirectory, 'generated-blink-crop.png');
  await writeFile(generatedCropPath, generated.bytes);
  const generatedDimensions = readPngDimensions(
    generated.bytes,
    'Generated blink crop',
  );
  if (
    generatedDimensions.width !== inpaintCrop.width ||
    generatedDimensions.height !== inpaintCrop.height
  ) {
    throw new Error(
      `Generated blink crop is ${generatedDimensions.width}x${generatedDimensions.height}; expected ${inpaintCrop.width}x${inpaintCrop.height}.`,
    );
  }

  const candidatePath = join(shotDirectory, `${LAYER_ID}.png`);
  createFullCanvasStateLayer({
    generatedCropPath,
    maskCropPath,
    crop: inpaintCrop,
    dimensions: context.sourceDimensions,
    outputPath: candidatePath,
  });
  const candidateDimensions = readPngDimensions(
    await readFile(candidatePath),
    LAYER_ID,
  );
  assertSameDimensions(context.sourceDimensions, candidateDimensions, LAYER_ID);

  const compositePath = join(inputDirectory, 'blink-on-editorial.png');
  runFfmpeg(
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      context.editorialPath,
      '-i',
      candidatePath,
      '-filter_complex',
      '[0:v][1:v]overlay=0:0:format=auto[out]',
      '-map',
      '[out]',
      '-frames:v',
      '1',
      compositePath,
    ],
    'compose blink diagnostic',
  );

  const candidate = {
    schemaVersion: 2,
    state: 'pending-human-review',
    manifestId: context.manifest.manifestId,
    shotId: context.shot.shotId,
    sourceShotNumber: SHOT_NUMBER,
    layerId: LAYER_ID,
    role: context.layer.role,
    material: context.layer.material,
    sourceFrame: context.shot.sourceFrame,
    intendedApprovedPath: context.layer.path,
    expectedAlpha: true,
    sourceDimensions: context.sourceDimensions,
    candidateDimensions,
    candidatePath,
    sha256: sha256(await readFile(candidatePath)),
    generatedAt: new Date().toISOString(),
    manifestMutated: false,
    automaticPromotionAllowed: false,
    productionLane: 'localized-upper-face-character-state-inpaint',
    inputs: {
      identityAnchorPath: context.bodyPath,
      roi,
      faceCropPath,
      detectedEyesPath,
      maskPath,
      sourceCropPath,
      maskCropPath,
      generatedCropPath,
      compositePath,
      inpaintCrop,
      maskAnalysis,
      localization,
      samPromptId: eyeDetection.promptId,
      inpaintPromptId: generated.promptId,
    },
  };
  await writeJson(
    join(shotDirectory, `${LAYER_ID}.candidate.json`),
    candidate,
  );
  await writeJson(join(runDirectory, 'candidate-run.json'), {
    schemaVersion: 1,
    type: 'animation-layer-candidates',
    generatedAt: new Date().toISOString(),
    sourceManifestId: context.manifest.manifestId,
    sourceManifestPath: MANIFEST_PATH,
    workflowPath: INPAINT_WORKFLOW_PATH,
    comfyBaseUrl: BASE_URL,
    outputRoot: runDirectory,
    candidates: [candidate],
    approvalPolicy: {
      manifestMutated: false,
      candidateState: 'pending-human-review',
      automaticPromotionAllowed: false,
      humanIdentityReviewRequired: true,
    },
  });

  return { runDirectory, candidatePath };
}

function validateEyeLocalization({
  mask,
  bodyRgba,
  maskAnalysis,
  roi,
  dimensions,
  constrained,
}) {
  const reasons = [];
  const eyeBandArea =
    (roi.eyeBand.maxX - roi.eyeBand.minX + 1) *
    (roi.eyeBand.maxY - roi.eyeBand.minY + 1);
  const eyeBandFillRatio = eyeBandArea
    ? maskAnalysis.selected / eyeBandArea
    : 1;
  if (!maskAnalysis.selected) reasons.push('eye mask is empty after constraints');
  if (maskAnalysis.coverageRatio < 0.00003) {
    reasons.push('eye mask is trivially small after upper-face localization');
  }
  if (maskAnalysis.coverageRatio > 0.006) {
    reasons.push('eye mask remains too broad for a blink state');
  }
  if (eyeBandFillRatio < 0.01) {
    reasons.push('eye mask occupies too little of the deterministic eye band');
  }
  if (eyeBandFillRatio > 0.55) {
    reasons.push('SAM still fills too much of the deterministic eye band');
  }

  let outsideEnki = 0;
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    if (mask[pixel] <= MASK_THRESHOLD) continue;
    if (bodyRgba[pixel * 4 + 3] <= MASK_THRESHOLD) outsideEnki += 1;
  }
  const outsideEnkiRatio = maskAnalysis.selected
    ? outsideEnki / maskAnalysis.selected
    : 1;
  if (outsideEnkiRatio > 0.001) {
    reasons.push('constrained eye mask escapes approved Enki alpha');
  }

  const bodyHeight = roi.bodyBounds.maxY - roi.bodyBounds.minY + 1;
  const centerY = maskAnalysis.bounds
    ? (maskAnalysis.bounds.minY + maskAnalysis.bounds.maxY) / 2
    : dimensions.height;
  const normalizedCenterYWithinBody =
    (centerY - roi.bodyBounds.minY) / Math.max(1, bodyHeight);
  const maskHeightVsBody = maskAnalysis.bounds
    ? (maskAnalysis.bounds.maxY - maskAnalysis.bounds.minY + 1) /
      Math.max(1, bodyHeight)
    : 1;
  if (
    normalizedCenterYWithinBody < 0.02 ||
    normalizedCenterYWithinBody > 0.24
  ) {
    reasons.push('constrained eye mask is outside the expected upper-face band');
  }
  if (maskHeightVsBody > 0.12) {
    reasons.push('constrained eye mask is too tall relative to Enki');
  }
  if (!constrained.samSelected) reasons.push('SAM returned no source-localized pixels');

  return {
    pass: reasons.length === 0,
    reasons,
    eyeBandFillRatio,
    outsideEnkiRatio,
    normalizedCenterYWithinBody,
    maskHeightVsBody,
    samSelected: constrained.samSelected,
    outsideBodyRejected: constrained.outsideBodyRejected,
    outsideBandRejected: constrained.outsideBandRejected,
  };
}

async function verifyNewestCandidate(context, preferredRunDirectory) {
  const runDirectory =
    preferredRunDirectory ?? (await newestCandidateRun(LAYER_ID));
  if (!runDirectory) throw new Error(`No Shot 3 blink candidate exists for ${LAYER_ID}.`);
  const run = JSON.parse(
    await readFile(join(runDirectory, 'candidate-run.json'), 'utf8'),
  );
  const candidate = run.candidates?.find((item) => item.layerId === LAYER_ID);
  if (!candidate?.candidatePath) {
    throw new Error(`Candidate run ${runDirectory} does not contain ${LAYER_ID}.`);
  }
  const candidatePath = resolveCandidatePath(
    candidate.candidatePath,
    runDirectory,
  );
  const candidateRgba = decodeRgba(candidatePath, context.sourceDimensions);
  const editorialRgba = decodeRgba(
    context.editorialPath,
    context.sourceDimensions,
  );
  const bodyRgba = decodeRgba(context.bodyPath, context.sourceDimensions);
  const analysis = analyzeCharacterStateDelta({
    candidateRgba,
    editorialRgba,
    bodyRgba,
    dimensions: context.sourceDimensions,
  });

  const checks = {
    dimensionsMatch: true,
    alphaCoveragePass:
      analysis.alphaCoverage >= 0.00003 && analysis.alphaCoverage <= 0.006,
    insideEnkiPass: analysis.outsideEnkiRatio <= 0.001,
    upperFacePass:
      analysis.normalizedCenterYWithinBody >= 0.02 &&
      analysis.normalizedCenterYWithinBody <= 0.24 &&
      analysis.maskHeightVsBody <= 0.12,
    nonTrivialChangePass:
      analysis.changedPixelRatio >= 0.05 && analysis.meanRgbDiff >= 0.5,
    boundedChangePass: analysis.meanRgbDiff <= 60,
  };
  const passed = Object.values(checks).every(Boolean);
  const report = {
    schemaVersion: 2,
    type: 'character-state-identity-delta-qa',
    generatedAt: new Date().toISOString(),
    manifestId: context.manifest.manifestId,
    shotId: context.shot.shotId,
    sourceShotNumber: SHOT_NUMBER,
    layerId: LAYER_ID,
    candidatePath,
    identityAnchorPath: context.bodyPath,
    editorialSourcePath: context.editorialPath,
    checks,
    measurements: analysis,
    qaStatus: passed ? 'PASS' : 'FAIL',
    humanReviewRequired: true,
    automaticPromotionAllowed: false,
    humanReviewNotes: [
      'Confirm the closed-eye state is unmistakably the same Enki and not a redrawn face.',
      'Confirm brow, nose, beard, skin tone, lighting, expression and registration remain stable.',
      'Confirm the visible eyelids close naturally for a brief blink.',
      'Reject beautification, gaze change, expression change, face drift, extra eye detail or visible patch seams.',
    ],
  };
  const reportPath = join(
    runDirectory,
    `${LAYER_ID}-character-state-qa.json`,
  );
  await writeJson(reportPath, report);
  return { passed, reportPath, report, candidatePath, runDirectory };
}

function printVerification(result) {
  const m = result.report.measurements;
  console.log('Shot 3 Enki blink character-state QA');
  console.log(
    `${result.passed ? '[ok]' : '[blocked]'} overall: ${result.report.qaStatus}`,
  );
  console.log(
    `[${result.report.checks.alphaCoveragePass ? 'ok' : 'blocked'}] alpha coverage: ${(m.alphaCoverage * 100).toFixed(4)}%`,
  );
  console.log(
    `[${result.report.checks.insideEnkiPass ? 'ok' : 'blocked'}] outside Enki: ${(m.outsideEnkiRatio * 100).toFixed(4)}%`,
  );
  console.log(
    `[${result.report.checks.upperFacePass ? 'ok' : 'blocked'}] eye-region center within Enki: ${(m.normalizedCenterYWithinBody * 100).toFixed(2)}%`,
  );
  console.log(
    `[${result.report.checks.nonTrivialChangePass ? 'ok' : 'blocked'}] changed selected pixels: ${(m.changedPixelRatio * 100).toFixed(2)}%, mean RGB diff ${m.meanRgbDiff.toFixed(2)}`,
  );
  console.log(`Report: ${result.reportPath}`);
  console.log(
    'Human identity review remains mandatory; canonical assets were NOT modified.',
  );
}

async function renderCombinedPreview() {
  console.log('Rendering Shot 3 Level 2 rigging + blink audition...');
  await runInherited('pnpm', [
    'exec',
    'tsx',
    'tools/scripts/render-shot03-level2-candidate-preview.ts',
    '--layer=shot03-rigging-v1',
    '--layer=shot03-enki-eyes-v1',
  ]);
}

function analyzeCharacterStateDelta({
  candidateRgba,
  editorialRgba,
  bodyRgba,
  dimensions,
}) {
  const pixelCount = dimensions.width * dimensions.height;
  let selected = 0;
  let outsideEnki = 0;
  let changed = 0;
  let rgbDiff = 0;
  let minX = dimensions.width;
  let minY = dimensions.height;
  let maxX = -1;
  let maxY = -1;
  const bodyBounds = rgbaAlphaBounds(bodyRgba, dimensions);

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    if (candidateRgba[offset + 3] <= MASK_THRESHOLD) continue;
    selected += 1;
    const x = pixel % dimensions.width;
    const y = Math.floor(pixel / dimensions.width);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    if (bodyRgba[offset + 3] <= MASK_THRESHOLD) outsideEnki += 1;
    let pixelChanged = false;
    for (let channel = 0; channel < 3; channel += 1) {
      const diff = Math.abs(
        candidateRgba[offset + channel] - editorialRgba[offset + channel],
      );
      rgbDiff += diff;
      if (diff > 0) pixelChanged = true;
    }
    if (pixelChanged) changed += 1;
  }

  const bodyHeight = Math.max(
    1,
    bodyBounds.maxY - bodyBounds.minY + 1,
  );
  const centerY = selected ? (minY + maxY) / 2 : dimensions.height;
  return {
    selectedPixels: selected,
    alphaCoverage: selected / pixelCount,
    outsideEnkiRatio: selected ? outsideEnki / selected : 1,
    changedPixelRatio: selected ? changed / selected : 0,
    meanRgbDiff: selected
      ? rgbDiff / (selected * 3)
      : Number.POSITIVE_INFINITY,
    normalizedCenterYWithinBody:
      (centerY - bodyBounds.minY) / bodyHeight,
    maskHeightVsBody: selected ? (maxY - minY + 1) / bodyHeight : 1,
    bounds: selected ? { minX, minY, maxX, maxY } : null,
  };
}

function rgbaAlphaBounds(rgba, dimensions) {
  let minX = dimensions.width;
  let minY = dimensions.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < dimensions.height; y += 1) {
    for (let x = 0; x < dimensions.width; x += 1) {
      const pixel = y * dimensions.width + x;
      if (rgba[pixel * 4 + 3] <= MASK_THRESHOLD) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX) throw new Error('RGBA alpha is empty.');
  return { minX, minY, maxX, maxY };
}

function paddedAlignedCrop(bounds, padding, width, height) {
  let x0 = Math.max(0, bounds.minX - padding);
  let y0 = Math.max(0, bounds.minY - padding);
  let x1 = Math.min(width, bounds.maxX + 1 + padding);
  let y1 = Math.min(height, bounds.maxY + 1 + padding);
  x0 = Math.floor(x0 / CROP_ALIGNMENT) * CROP_ALIGNMENT;
  y0 = Math.floor(y0 / CROP_ALIGNMENT) * CROP_ALIGNMENT;
  x1 = Math.min(width, Math.ceil(x1 / CROP_ALIGNMENT) * CROP_ALIGNMENT);
  y1 = Math.min(height, Math.ceil(y1 / CROP_ALIGNMENT) * CROP_ALIGNMENT);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

function cropPng(inputPath, outputPath, crop) {
  runFfmpeg(
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      inputPath,
      '-vf',
      `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`,
      '-frames:v',
      '1',
      outputPath,
    ],
    `crop ${basename(inputPath)}`,
  );
}

function writeGrayPng(mask, dimensions, outputPath) {
  const result = spawnSync(
    FFMPEG,
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'gray',
      '-s',
      `${dimensions.width}x${dimensions.height}`,
      '-i',
      '-',
      '-frames:v',
      '1',
      outputPath,
    ],
    { input: Buffer.from(mask), encoding: null, maxBuffer: 4 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    throw new Error(`Could not write constrained eye mask PNG: ${String(result.stderr)}`);
  }
}

function createFullCanvasStateLayer({
  generatedCropPath,
  maskCropPath,
  crop,
  dimensions,
  outputPath,
}) {
  runFfmpeg(
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      generatedCropPath,
      '-i',
      maskCropPath,
      '-filter_complex',
      `[0:v]format=rgb24[color];[1:v]format=gray[mask];[color][mask]alphamerge,format=rgba,pad=${dimensions.width}:${dimensions.height}:${crop.x}:${crop.y}:color=0x00000000[out]`,
      '-map',
      '[out]',
      '-frames:v',
      '1',
      outputPath,
    ],
    'compose full-canvas blink state layer',
  );
}

async function newestCandidateRun(layerId) {
  let entries = [];
  try {
    entries = await readdir(CANDIDATE_ROOT, { withFileTypes: true });
  } catch {
    return null;
  }
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(CANDIDATE_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  for (const directory of directories) {
    try {
      const run = JSON.parse(
        await readFile(join(directory, 'candidate-run.json'), 'utf8'),
      );
      if (run.candidates?.some((item) => item.layerId === layerId)) {
        return directory;
      }
    } catch {
      // Continue to older runs.
    }
  }
  return null;
}

function resolveCandidatePath(rawPath, runDirectory) {
  const path = isAbsolute(rawPath)
    ? resolve(rawPath)
    : resolve(runDirectory, rawPath);
  assertInside(CANDIDATE_ROOT, path, 'Blink candidate PNG');
  return path;
}

async function runWorkflowForImage(workflow, label) {
  const queued = await fetchJson(`${BASE_URL}/prompt`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      prompt: workflow,
      client_id: `srf-${randomUUID()}`,
    }),
    signal: AbortSignal.timeout(timeoutMs()),
  });
  if (!queued.prompt_id) {
    throw new Error(`ComfyUI did not return a prompt id for ${label}.`);
  }
  const image = await waitForImage(queued.prompt_id);
  const response = await fetch(
    `${BASE_URL}/view?${new URLSearchParams(image)}`,
    { signal: AbortSignal.timeout(timeoutMs()) },
  );
  if (!response.ok) {
    throw new Error(`ComfyUI ${label} download returned HTTP ${response.status}.`);
  }
  return {
    promptId: queued.prompt_id,
    bytes: Buffer.from(await response.arrayBuffer()),
  };
}

async function waitForImage(promptId) {
  const deadline = Date.now() + timeoutMs();
  while (Date.now() < deadline) {
    const history = await fetchJson(`${BASE_URL}/history/${promptId}`, {
      signal: AbortSignal.timeout(20_000),
    });
    const entry = history[promptId];
    if (entry?.status?.status_str === 'error') {
      throw new Error(`ComfyUI prompt ${promptId} failed.`);
    }
    for (const output of Object.values(entry?.outputs ?? {})) {
      const image = output?.images?.[0];
      if (image?.filename) {
        return {
          filename: image.filename,
          subfolder: image.subfolder ?? '',
          type: image.type ?? 'output',
        };
      }
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1500));
  }
  throw new Error(`Timed out waiting for ComfyUI prompt ${promptId}.`);
}

async function uploadImage(path, name) {
  const bytes = await readFile(path);
  const form = new FormData();
  form.append('image', new Blob([bytes], { type: 'image/png' }), name);
  form.append('overwrite', 'true');
  const response = await fetch(`${BASE_URL}/upload/image`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    throw new Error(`ComfyUI image upload returned HTTP ${response.status}.`);
  }
  const payload = await response.json();
  if (!payload.name) {
    throw new Error('ComfyUI upload did not return an image name.');
  }
  return payload;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`);
  return response.json();
}

function replaceTokens(value, replacements) {
  if (typeof value === 'string') {
    return Object.entries(replacements).reduce(
      (current, [token, replacement]) =>
        current.split(token).join(String(replacement)),
      value,
    );
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceTokens(item, replacements));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        replaceTokens(item, replacements),
      ]),
    );
  }
  return value;
}

function decodeRgba(path, dimensions) {
  const result = spawnSync(
    FFMPEG,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      path,
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgba',
      '-',
    ],
    {
      encoding: null,
      maxBuffer: dimensions.width * dimensions.height * 5,
    },
  );
  if (result.status !== 0) {
    throw new Error(`ffmpeg could not decode RGBA ${path}.`);
  }
  return new Uint8Array(result.stdout);
}

function runFfmpeg(args, label) {
  const result = spawnSync(FFMPEG, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(
      `${label} failed: ${result.stderr || result.stdout || 'unknown ffmpeg error'}`,
    );
  }
}

async function runInherited(commandName, args) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(commandName, args, {
      cwd: resolve('.'),
      env: process.env,
      shell: process.platform === 'win32',
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', rejectPromise);
    child.once('exit', (code, signal) => {
      if (code === 0) resolvePromise();
      else {
        rejectPromise(
          new Error(
            `${commandName} failed with ${signal ? `signal ${signal}` : `exit code ${code ?? 'unknown'}`}.`,
          ),
        );
      }
    });
  });
}

async function fileCheck(name, path) {
  try {
    await access(path);
    return { ok: true, name, detail: path };
  } catch {
    return { ok: false, name, detail: `missing ${path}` };
  }
}

async function httpCheck(name, url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
    });
    return {
      ok: response.ok,
      name,
      detail: `${url} -> HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      name,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function verifyStoredChecksum(layer, path) {
  const expected = String(layer.sha256)
    .replace(/^sha256:/, '')
    .toLowerCase();
  const actual = sha256(await readFile(path));
  if (actual !== expected) {
    throw new Error(
      `Checksum mismatch for ${layer.id}: expected ${expected}, got ${actual}.`,
    );
  }
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function readPngDimensions(buffer, label) {
  if (
    buffer.length < 24 ||
    buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
    buffer.subarray(12, 16).toString('ascii') !== 'IHDR'
  ) {
    throw new Error(`${label} is not a valid PNG.`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function assertSameDimensions(expected, actual, label) {
  if (
    expected.width !== actual.width ||
    expected.height !== actual.height
  ) {
    throw new Error(
      `${label} is ${actual.width}x${actual.height}; expected ${expected.width}x${expected.height}.`,
    );
  }
}

function assertInside(parent, child, label) {
  const path = relative(resolve(parent), resolve(child));
  if (path.startsWith('..') || isAbsolute(path)) {
    throw new Error(`${label} must remain under ${parent}: ${child}`);
  }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function timeoutMs() {
  return Number(process.env.RENDER_PROCESS_TIMEOUT_MS ?? 600_000);
}
