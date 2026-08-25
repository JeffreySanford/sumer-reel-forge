import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { checkWorkflowHostCompatibility } from '../renderer/comfyui-workflow-doctor.mjs';
import {
  analyzeGrayMask,
  deriveEnkiUpperFaceRoi,
  dilateEyeMaskWithinConstraints,
} from '../animation/src/level2-character-state-localization.mjs';
import { analyzeEyeStateAsset } from '../animation/src/level2-eye-state-proof.mjs';

const MANIFEST_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const ASSET_ROOT = resolve('assets');
const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const INPUT_ROOT = resolve(
  'tmp/animation-assets/character-state-inputs/shot03-enki-eyes-v1-replacement',
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
const BODY_ID = 'shot03-enki-body-v1';
const MASK_THRESHOLD = 16;
const TARGET_EYE_BAND_FILL = 0.015;
const INPAINT_PADDING = 40;
const CROP_ALIGNMENT = 8;

const command = process.argv[2] ?? 'preflight';

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  if (!['preflight', 'generate', 'all'].includes(command)) {
    throw new Error(
      'Usage: node tools/scripts/shot03-level2-enki-blink-replacement.mjs <preflight|generate|all>',
    );
  }

  const context = await loadContext();
  const preflight = await runPreflight(context);
  printPreflight(preflight, context);
  if (!preflight.ok) {
    process.exitCode = 2;
    return;
  }
  if (command === 'preflight') return;

  const result = await generateReplacementCandidate(context);
  printResult(result);
  if (!result.eyeStateProof.pass) process.exitCode = 2;
}

async function loadContext() {
  const manifestBytes = await readFile(MANIFEST_PATH);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const shot = manifest.shots?.find((item) => item.sourceShotNumber === SHOT_NUMBER);
  if (!shot) throw new Error('Shot 3 is missing from the animation manifest.');

  const layer = shot.layers?.find((item) => item.id === LAYER_ID);
  const body = shot.layers?.find((item) => item.id === BODY_ID);
  if (!layer?.path || !body?.path) {
    throw new Error('Shot 3 canonical eye/body layer configuration is incomplete.');
  }
  if (
    layer.state !== 'approved' ||
    layer.review?.status !== 'approved' ||
    !/^sha256:[a-f0-9]{64}$/i.test(layer.sha256 ?? '')
  ) {
    throw new Error(
      `${LAYER_ID} must remain approved and checksum-backed while a replacement candidate is generated.`,
    );
  }
  if (
    body.state !== 'approved' ||
    body.review?.status !== 'approved' ||
    !/^sha256:[a-f0-9]{64}$/i.test(body.sha256 ?? '')
  ) {
    throw new Error(`${BODY_ID} must remain an approved checksum-backed identity anchor.`);
  }

  const editorialPath = resolve(ASSET_ROOT, shot.sourceFrame);
  const bodyPath = resolve(ASSET_ROOT, body.path);
  const currentStatePath = resolve(ASSET_ROOT, layer.path);
  const [editorialBytes, bodyBytes, currentStateBytes] = await Promise.all([
    readFile(editorialPath),
    readFile(bodyPath),
    readFile(currentStatePath),
  ]);

  verifyChecksum(bodyBytes, body.sha256, BODY_ID);
  verifyChecksum(currentStateBytes, layer.sha256, LAYER_ID);

  const dimensions = readPngDimensions(editorialBytes, 'Shot 3 editorial source');
  assertSameDimensions(dimensions, readPngDimensions(bodyBytes, BODY_ID), BODY_ID);
  assertSameDimensions(
    dimensions,
    readPngDimensions(currentStateBytes, LAYER_ID),
    LAYER_ID,
  );

  const bodyRgba = decodeRgba(bodyPath, dimensions);
  const currentStateRgba = decodeRgba(currentStatePath, dimensions);
  const roi = deriveEnkiUpperFaceRoi({ bodyRgba, dimensions });
  const currentProof = analyzeEyeStateAsset({
    bodyPath,
    statePath: currentStatePath,
    referencePath: editorialPath,
  });

  return {
    manifest,
    manifestBytes,
    manifestChecksum: prefixedSha(manifestBytes),
    shot,
    layer,
    body,
    editorialPath,
    bodyPath,
    currentStatePath,
    currentStateChecksum: prefixedSha(currentStateBytes),
    dimensions,
    bodyRgba,
    currentStateRgba,
    roi,
    currentProof,
  };
}

async function runPreflight(context) {
  const fileChecks = [
    ['animation manifest', MANIFEST_PATH],
    ['editorial source', context.editorialPath],
    ['approved Enki body', context.bodyPath],
    ['current approved eye state', context.currentStatePath],
    ['blink inpaint workflow', INPAINT_WORKFLOW_PATH],
  ].map(([name, path]) => ({ name, path, ok: true }));

  let comfyOk = false;
  let comfyDetail = '';
  try {
    const response = await fetch(`${BASE_URL}/system_stats`, {
      signal: AbortSignal.timeout(5000),
    });
    comfyOk = response.ok;
    comfyDetail = response.ok ? 'reachable' : `HTTP ${response.status}`;
  } catch (error) {
    comfyDetail = error instanceof Error ? error.message : String(error);
  }

  let compatibility = { ok: false, nodeCount: 0, missingNodeTypes: [] };
  if (comfyOk) {
    compatibility = await checkWorkflowHostCompatibility({
      workflowPath: INPAINT_WORKFLOW_PATH,
      baseUrl: BASE_URL,
    });
  }

  const trustedSeedPass =
    context.currentProof.metrics.selectedAlphaPixels > 0 &&
    context.currentProof.metrics.inEyeBandAlphaRatio >= 0.98;

  return {
    ok:
      fileChecks.every((check) => check.ok) &&
      comfyOk &&
      compatibility.ok &&
      trustedSeedPass,
    fileChecks,
    comfyOk,
    comfyDetail,
    compatibility,
    trustedSeedPass,
  };
}

function printPreflight(result, context) {
  console.log('Shot 3 Level 2 blink replacement-candidate preflight');
  console.log(
    `[${result.trustedSeedPass ? 'ok' : 'blocked'}] current alpha is a trusted localization seed: ${(context.currentProof.metrics.inEyeBandAlphaRatio * 100).toFixed(2)}% in eye band`,
  );
  console.log(
    `[info] current eye-band fill: ${(context.currentProof.metrics.eyeBandFillRatio * 100).toFixed(3)}% (replacement target ${(TARGET_EYE_BAND_FILL * 100).toFixed(2)}%)`,
  );
  console.log(
    `[${result.comfyOk ? 'ok' : 'blocked'}] ComfyUI: ${result.comfyDetail}`,
  );
  console.log(
    `[${result.compatibility.ok ? 'ok' : 'blocked'}] inpaint workflow compatibility: ${result.compatibility.nodeCount ?? 0} nodes`,
  );
  console.log(
    '[info] canonical eye asset and manifest remain read-only; output is candidate-only under tmp/.',
  );
}

async function generateReplacementCandidate(context) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const inputDirectory = join(INPUT_ROOT, stamp);
  const runDirectory = join(CANDIDATE_ROOT, stamp);
  const shotDirectory = join(runDirectory, 'shot-03');
  await Promise.all([
    mkdir(inputDirectory, { recursive: true }),
    mkdir(shotDirectory, { recursive: true }),
  ]);

  const seedMask = alphaMaskFromRgba(context.currentStateRgba, context.dimensions);
  const expandedMask = dilateEyeMaskWithinConstraints({
    mask: seedMask,
    bodyRgba: context.bodyRgba,
    dimensions: context.dimensions,
    eyeBand: context.roi.eyeBand,
    radius: 1,
    minEyeBandFill: TARGET_EYE_BAND_FILL,
    maxAdaptiveRadius: 3,
    maxEyeComponents: 2,
  });
  const maskAnalysis = analyzeGrayMask(expandedMask, context.dimensions);
  const eyeBandArea =
    (context.roi.eyeBand.maxX - context.roi.eyeBand.minX + 1) *
    (context.roi.eyeBand.maxY - context.roi.eyeBand.minY + 1);
  const expandedFill = maskAnalysis.selected / eyeBandArea;
  if (expandedFill < 0.01) {
    throw new Error(
      `Expanded replacement mask is still too sparse: ${(expandedFill * 100).toFixed(3)}% of eye band.`,
    );
  }

  const maskPath = join(inputDirectory, 'replacement-eye-mask.png');
  writeGrayPng(expandedMask, context.dimensions, maskPath);
  const crop = paddedAlignedCrop(
    maskAnalysis.bounds,
    INPAINT_PADDING,
    context.dimensions.width,
    context.dimensions.height,
  );
  const sourceCropPath = join(inputDirectory, 'editorial-eye-source-crop.png');
  const maskCropPath = join(inputDirectory, 'replacement-eye-mask-crop.png');
  cropPng(context.editorialPath, sourceCropPath, crop);
  cropPng(maskPath, maskCropPath, crop);

  const [sourceUpload, maskUpload] = await Promise.all([
    uploadImage(sourceCropPath, `srf-shot03-blink-replacement-source-${stamp}.png`),
    uploadImage(maskCropPath, `srf-shot03-blink-replacement-mask-${stamp}.png`),
  ]);

  const workflowTemplate = JSON.parse(await readFile(INPAINT_WORKFLOW_PATH, 'utf8'));
  const prompt = [
    'The supplied painted source crop is the sole identity authority.',
    'Close Enki\'s visible eyelids naturally for one calm blink.',
    'The supplied mask marks only the trusted eye/eyelid editing region.',
    'Preserve the exact same face, age, expression, brow, nose, beard, skin tone, lighting, perspective and painterly brushwork.',
    'Make the closed eyelids clearly readable at normal playback size while remaining restrained and source-faithful.',
    'Do not alter any unmasked facial feature and do not add new eye detail.',
  ].join(' ');
  const workflow = replaceTokens(workflowTemplate, {
    '{{SOURCE_IMAGE}}': sourceUpload.name,
    '{{AUXILIARY_IMAGE}}': maskUpload.name,
    '{{LAYER_PROMPT}}': prompt,
    '{{PROMPT}}': prompt,
    '{{NEGATIVE_PROMPT}}': '',
    '{{SEED}}': 20260825,
    '{{OUTPUT_PREFIX}}': 'srf-shot03-enki-eyes-closed-replacement',
  });
  const generated = await runWorkflowForImage(workflow);
  const generatedCropPath = join(inputDirectory, 'generated-closed-eye-crop.png');
  await writeFile(generatedCropPath, generated.bytes);
  const generatedDimensions = readPngDimensions(
    generated.bytes,
    'generated closed-eye replacement crop',
  );
  if (
    generatedDimensions.width !== crop.width ||
    generatedDimensions.height !== crop.height
  ) {
    throw new Error(
      `Generated replacement crop is ${generatedDimensions.width}x${generatedDimensions.height}; expected ${crop.width}x${crop.height}.`,
    );
  }

  const candidatePath = join(shotDirectory, `${LAYER_ID}-replacement.png`);
  createFullCanvasStateLayer({
    generatedCropPath,
    maskCropPath,
    crop,
    dimensions: context.dimensions,
    outputPath: candidatePath,
  });

  const eyeStateProof = analyzeEyeStateAsset({
    bodyPath: context.bodyPath,
    statePath: candidatePath,
    referencePath: context.editorialPath,
  });
  const compositePath = join(inputDirectory, 'replacement-blink-on-editorial.png');
  composeOverlay(context.editorialPath, candidatePath, compositePath);
  const candidateBytes = await readFile(candidatePath);

  const candidate = {
    schemaVersion: 1,
    state: 'pending-human-review',
    replacementForLayerId: LAYER_ID,
    sourceShotNumber: SHOT_NUMBER,
    candidatePath,
    candidateChecksum: prefixedSha(candidateBytes),
    currentCanonicalPath: context.currentStatePath,
    currentCanonicalChecksum: context.currentStateChecksum,
    sourceManifestChecksum: context.manifestChecksum,
    generatedAt: new Date().toISOString(),
    canonicalMutated: false,
    automaticPromotionAllowed: false,
    trustedLocalizationSeed: {
      source: 'current approved closed-eye alpha only',
      inEyeBandAlphaRatio: context.currentProof.metrics.inEyeBandAlphaRatio,
      originalEyeBandFillRatio: context.currentProof.metrics.eyeBandFillRatio,
      expandedEyeBandFillRatio: expandedFill,
    },
    inputs: {
      editorialPath: context.editorialPath,
      bodyPath: context.bodyPath,
      currentStatePath: context.currentStatePath,
      maskPath,
      sourceCropPath,
      maskCropPath,
      generatedCropPath,
      crop,
      promptId: generated.promptId,
    },
    reviewArtifacts: { compositePath },
    eyeStateProof,
  };
  const candidateReportPath = join(
    shotDirectory,
    `${LAYER_ID}-replacement.candidate.json`,
  );
  await writeFile(candidateReportPath, `${JSON.stringify(candidate, null, 2)}\n`, 'utf8');
  await writeFile(
    join(runDirectory, 'candidate-run.json'),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        type: 'shot03-character-state-replacement-candidate',
        generatedAt: candidate.generatedAt,
        sourceManifestChecksum: context.manifestChecksum,
        candidates: [candidate],
        approvalPolicy: {
          canonicalMutated: false,
          automaticPromotionAllowed: false,
          humanIdentityReviewRequired: true,
          explicitReplacementPromotionRequired: true,
        },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  return {
    runDirectory,
    candidatePath,
    candidateReportPath,
    compositePath,
    expandedFill,
    eyeStateProof,
  };
}

function printResult(result) {
  const metrics = result.eyeStateProof.metrics;
  console.log('');
  console.log('Shot 3 blink replacement candidate');
  console.log(
    `[${result.eyeStateProof.pass ? 'PASS' : 'BLOCKED'}] eye-state readability proof`,
  );
  console.log(
    `[info] candidate eye-band fill: ${(metrics.eyeBandFillRatio * 100).toFixed(3)}% alpha · ${(metrics.opaqueEyeBandFillRatio * 100).toFixed(3)}% opaque`,
  );
  console.log(
    `[info] visible eye-region delta: ${(metrics.compositeChangedEyeBandRatio * 100).toFixed(3)}% changed · ${(metrics.strongChangedEyeBandRatio * 100).toFixed(3)}% strong`,
  );
  for (const failure of result.eyeStateProof.failures) {
    console.log(`[BLOCKED] ${failure}`);
  }
  console.log(`[info] candidate: ${result.candidatePath}`);
  console.log(`[info] 100% composite: ${result.compositePath}`);
  console.log(`[info] candidate report: ${result.candidateReportPath}`);
  console.log('[info] canonical asset and manifest were NOT modified.');
  console.log(
    result.eyeStateProof.pass
      ? 'STATUS: CANDIDATE QA PASS — human visual review required before any replacement promotion.'
      : 'STATUS: CANDIDATE BLOCKED — do not promote or alter the canonical asset.',
  );
}

function alphaMaskFromRgba(rgba, dimensions) {
  const mask = new Uint8Array(dimensions.width * dimensions.height);
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    mask[pixel] = rgba[pixel * 4 + 3];
  }
  return mask;
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
      '-frames:v',
      '1',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgba',
      'pipe:1',
    ],
    { encoding: null, maxBuffer: 32 * 1024 * 1024 },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Could not decode ${path}.`);
  const expected = dimensions.width * dimensions.height * 4;
  if (result.stdout.length !== expected) {
    throw new Error(`Decoded ${path} to ${result.stdout.length} bytes; expected ${expected}.`);
  }
  return new Uint8Array(result.stdout);
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
      '-update',
      '1',
      outputPath,
    ],
    { input: Buffer.from(mask), encoding: null, maxBuffer: 8 * 1024 * 1024 },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Could not write replacement eye mask PNG.');
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
  runFfmpeg([
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
    '-update',
    '1',
    outputPath,
  ]);
}

function createFullCanvasStateLayer({
  generatedCropPath,
  maskCropPath,
  crop,
  dimensions,
  outputPath,
}) {
  runFfmpeg([
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
    '-update',
    '1',
    outputPath,
  ]);
}

function composeOverlay(referencePath, statePath, outputPath) {
  runFfmpeg([
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    referencePath,
    '-i',
    statePath,
    '-filter_complex',
    '[0:v][1:v]overlay=0:0:format=auto,format=rgb24[out]',
    '-map',
    '[out]',
    '-frames:v',
    '1',
    '-update',
    '1',
    outputPath,
  ]);
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
  if (!payload.name) throw new Error('ComfyUI upload did not return an image name.');
  return payload;
}

async function runWorkflowForImage(workflow) {
  const queuedResponse = await fetch(`${BASE_URL}/prompt`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: `srf-${randomUUID()}` }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!queuedResponse.ok) {
    throw new Error(`ComfyUI prompt returned HTTP ${queuedResponse.status}.`);
  }
  const queued = await queuedResponse.json();
  if (!queued.prompt_id) throw new Error('ComfyUI did not return a prompt id.');

  const image = await waitForImage(queued.prompt_id);
  const response = await fetch(
    `${BASE_URL}/view?${new URLSearchParams(image)}`,
    { signal: AbortSignal.timeout(60_000) },
  );
  if (!response.ok) throw new Error(`ComfyUI image download returned HTTP ${response.status}.`);
  return { promptId: queued.prompt_id, bytes: Buffer.from(await response.arrayBuffer()) };
}

async function waitForImage(promptId) {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const response = await fetch(`${BASE_URL}/history/${promptId}`, {
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`ComfyUI history returned HTTP ${response.status}.`);
    const history = await response.json();
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
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1200));
  }
  throw new Error(`Timed out waiting for ComfyUI prompt ${promptId}.`);
}

function replaceTokens(value, replacements) {
  if (typeof value === 'string') {
    return Object.entries(replacements).reduce(
      (current, [token, replacement]) => current.split(token).join(String(replacement)),
      value,
    );
  }
  if (Array.isArray(value)) return value.map((item) => replaceTokens(item, replacements));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceTokens(item, replacements)]),
    );
  }
  return value;
}

function readPngDimensions(bytes, label) {
  if (
    bytes.length < 24 ||
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47
  ) {
    throw new Error(`${label} is not a PNG.`);
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function assertSameDimensions(expected, actual, label) {
  if (expected.width !== actual.width || expected.height !== actual.height) {
    throw new Error(
      `${label} is ${actual.width}x${actual.height}; expected ${expected.width}x${expected.height}.`,
    );
  }
}

function verifyChecksum(bytes, expected, label) {
  const actual = prefixedSha(bytes);
  if (normalizeSha(actual) !== normalizeSha(expected)) {
    throw new Error(`${label} checksum no longer matches the canonical manifest.`);
  }
}

function prefixedSha(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function normalizeSha(value) {
  return String(value ?? '').replace(/^sha256:/i, '').toLowerCase();
}

function runFfmpeg(args) {
  const result = spawnSync(FFMPEG, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed: ${result.stderr || result.stdout || 'unknown error'}`);
  }
}
