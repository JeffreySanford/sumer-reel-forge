import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { checkWorkflowHostCompatibility } from '../renderer/comfyui-workflow-doctor.mjs';

const MANIFEST_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const ASSET_ROOT = resolve('assets');
const SAM_WORKFLOW_PATH = resolve(
  'tools/renderer/workflows/semantic-overlay-sam3-api.json',
);
const OUTPUT_ROOT = resolve(
  'tmp/animation-assets/character-state-inputs/shot03-enki-eyes-editorial-localization',
);
const COMFY_BASE_URL = (process.env.COMFYUI_BASE_URL ?? 'http://127.0.0.1:8188').replace(/\/$/, '');
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL ?? 'qwen3-vl:4b-instruct';
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const SHOT_NUMBER = 3;
const ALPHA_THRESHOLD = 16;

const LOCATOR_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'targetCorrect',
    'bothEyesVisible',
    'maskOnBothEyes',
    'headdressOnly',
    'otherRegionDominates',
    'confidence',
    'summary',
  ],
  properties: {
    targetCorrect: { type: 'boolean' },
    bothEyesVisible: { type: 'boolean' },
    maskOnBothEyes: { type: 'boolean' },
    headdressOnly: { type: 'boolean' },
    otherRegionDominates: { type: 'boolean' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    summary: { type: 'string' },
  },
};

const command = process.argv[2] ?? 'all';

void main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});

async function main() {
  if (!['preflight', 'all'].includes(command)) {
    throw new Error('Usage: node tools/scripts/shot03-level2-localize-enki-eyes-editorial.mjs <preflight|all>');
  }

  const context = await loadContext();
  const preflight = await runPreflight();
  console.log('Shot 3 editorial eye localization preflight');
  console.log(`[${preflight.comfyOk ? 'ok' : 'blocked'}] ComfyUI: ${preflight.comfyDetail}`);
  console.log(`[${preflight.compatibility.ok ? 'ok' : 'blocked'}] SAM3 workflow: ${preflight.compatibility.nodeCount ?? 0} nodes`);
  console.log(`[${preflight.visionOk ? 'ok' : 'blocked'}] semantic critic: ${preflight.visionDetail}`);
  console.log('[info] localization source is immutable editorial-v1; the old approved eye-state alpha is NOT used.');
  if (!preflight.ok) {
    process.exitCode = 2;
    return;
  }
  if (command === 'preflight') return;

  const result = await localize(context);
  printResult(result);
  if (!result.semanticPass) process.exitCode = 2;
}

async function loadContext() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const shot = manifest.shots?.find((item) => item.sourceShotNumber === SHOT_NUMBER);
  if (!shot?.sourceFrame) throw new Error('Shot 3 editorial source is missing from the animation manifest.');
  const editorialPath = resolve(ASSET_ROOT, shot.sourceFrame);
  const editorialBytes = await readFile(editorialPath);
  const dimensions = readPngDimensions(editorialBytes, 'Shot 3 editorial source');
  return { manifest, shot, editorialPath, editorialBytes, dimensions };
}

async function runPreflight() {
  const comfy = await endpointCheck(`${COMFY_BASE_URL}/system_stats`);
  let compatibility = { ok: false, nodeCount: 0, missingNodeTypes: [] };
  if (comfy.ok) {
    compatibility = await checkWorkflowHostCompatibility({
      workflowPath: SAM_WORKFLOW_PATH,
      baseUrl: COMFY_BASE_URL,
    });
  }
  const vision = await verifyOllama();
  return {
    ok: comfy.ok && compatibility.ok && vision.ok,
    comfyOk: comfy.ok,
    comfyDetail: comfy.detail,
    compatibility,
    visionOk: vision.ok,
    visionDetail: vision.ok ? VISION_MODEL : vision.reason,
  };
}

async function localize(context) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDirectory = join(OUTPUT_ROOT, stamp);
  await mkdir(outputDirectory, { recursive: true });

  const sourceUpload = await uploadImage(
    context.editorialPath,
    `srf-shot03-editorial-eye-localizer-${stamp}.png`,
  );
  const workflowTemplate = JSON.parse(await readFile(SAM_WORKFLOW_PATH, 'utf8'));
  const prompt = [
    'Select only Enki\'s two visible human eyes in this image.',
    'Include the actual eye openings, irises/pupils and immediate eyelid shapes.',
    'Do not select his horned headdress, crown, forehead, eyebrows, hair, nose, beard, clothing, boat, rigging, water or background.',
    'The two eyes are on the face below the eyebrows and below the headdress.',
    'Prefer two small compact eye regions. This is localization only.',
  ].join(' ');
  const workflow = replaceTokens(workflowTemplate, {
    '{{SOURCE_IMAGE}}': sourceUpload.name,
    '{{LAYER_PROMPT}}': prompt,
    '{{PROMPT}}': prompt,
    '{{NEGATIVE_PROMPT}}': '',
    '{{SEED}}': 20260825,
    '{{OUTPUT_PREFIX}}': 'srf-shot03-enki-actual-eyes-editorial',
  });
  const generated = await runWorkflowForImage(workflow);
  const overlayPath = join(outputDirectory, 'editorial-eyes-sam-overlay.png');
  await writeFile(overlayPath, generated.bytes);

  const overlayDimensions = readPngDimensions(generated.bytes, 'SAM eye localization overlay');
  assertSameDimensions(context.dimensions, overlayDimensions, 'SAM eye localization overlay');
  const overlayRgba = decodeRgba(overlayPath, context.dimensions);
  const mask = alphaMaskFromRgba(overlayRgba, context.dimensions);
  const analysis = analyzeMask(mask, context.dimensions, ALPHA_THRESHOLD);
  if (!analysis.bounds) throw new Error('SAM3 returned an empty eye localization mask on editorial-v1.');
  if (analysis.coverageRatio > 0.03) {
    throw new Error(`SAM3 eye localization is implausibly broad: ${(analysis.coverageRatio * 100).toFixed(2)}% of the editorial frame.`);
  }

  const crop = paddedCrop(analysis.bounds, context.dimensions);
  const sourceCropPath = join(outputDirectory, 'editorial-eye-locator-source-crop.png');
  const overlayCropPath = join(outputDirectory, 'editorial-eye-locator-overlay-crop.png');
  const alphaCropPath = join(outputDirectory, 'editorial-eye-locator-alpha-crop.png');
  cropPng(context.editorialPath, sourceCropPath, crop);
  cropPng(overlayPath, overlayCropPath, crop);
  alphaCrop(overlayPath, alphaCropPath, crop);

  const contactSheetPath = join(outputDirectory, 'editorial-eye-localization-contact-sheet.png');
  makeContactSheet([sourceCropPath, overlayCropPath, alphaCropPath], contactSheetPath);

  const semanticReview = await reviewLocalization({ sourceCropPath, overlayCropPath });
  const semanticPass =
    semanticReview.targetCorrect === true &&
    semanticReview.bothEyesVisible === true &&
    semanticReview.maskOnBothEyes === true &&
    semanticReview.headdressOnly === false &&
    semanticReview.otherRegionDominates === false &&
    Number(semanticReview.confidence ?? 0) >= 0.7;

  const report = {
    schemaVersion: 1,
    type: 'shot03-editorial-eye-localization-candidate',
    generatedAt: new Date().toISOString(),
    sourceShotNumber: SHOT_NUMBER,
    sourceFrame: context.shot.sourceFrame,
    sourceAuthority: 'editorial-v1',
    localizationSource: 'immutable editorial source only',
    legacyCanonicalEyeAlphaUsed: false,
    prompt,
    promptId: generated.promptId,
    dimensions: context.dimensions,
    maskAnalysis: analysis,
    crop,
    semanticReview,
    semanticPass,
    humanReviewRequired: true,
    automaticUseForBlinkSynthesis: false,
    canonicalMutated: false,
    artifacts: {
      overlayPath,
      sourceCropPath,
      overlayCropPath,
      alphaCropPath,
      contactSheetPath,
    },
  };
  const reportPath = join(outputDirectory, 'editorial-eye-localization-report.json');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return { ...report, reportPath, outputDirectory };
}

function printResult(result) {
  console.log('');
  console.log('Shot 3 editorial eye localization');
  console.log(`[info] SAM alpha bbox: ${result.maskAnalysis.bounds.minX},${result.maskAnalysis.bounds.minY} → ${result.maskAnalysis.bounds.maxX},${result.maskAnalysis.bounds.maxY}`);
  console.log(`[info] frame coverage: ${(result.maskAnalysis.coverageRatio * 100).toFixed(4)}%`);
  console.log(`[${result.semanticPass ? 'PASS' : 'BLOCKED'}] Qwen target check: ${result.semanticReview.summary}`);
  console.log(`[info] contact sheet: ${result.artifacts.contactSheetPath}`);
  console.log(`[info] report: ${result.reportPath}`);
  console.log('[info] no blink PNG was generated and canonical assets were NOT modified.');
  console.log(
    result.semanticPass
      ? 'STATUS: LOCATOR CANDIDATE — semantic check says these are the actual eyes; HUMAN confirmation is still required before synthesis.'
      : 'STATUS: BLOCKED — localization is not trusted. Do not use it for blink synthesis.',
  );
}

async function reviewLocalization({ sourceCropPath, overlayCropPath }) {
  const images = await Promise.all([
    readFile(sourceCropPath).then((bytes) => bytes.toString('base64')),
    readFile(overlayCropPath).then((bytes) => bytes.toString('base64')),
  ]);
  const system = [
    'You are a literal localization inspector. Return only JSON matching the schema.',
    'Image 1 is a crop from the immutable Shot 3 editorial source. Image 2 is the same crop with transparency outside the SAM-selected region.',
    'The target is Enki\'s two actual visible human eyes on his face.',
    'Reject a mask on horns, crown, headdress, forehead, eyebrows or decorative marks.',
    'targetCorrect and maskOnBothEyes may be true only if the visible selected pixels actually lie on the two eye openings/eyelids.',
  ].join(' ');
  const user = JSON.stringify({
    task: 'Determine whether SAM selected Enki\'s actual two eyes rather than his headdress or another face region.',
  });
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: VISION_MODEL,
      stream: false,
      think: false,
      keep_alive: process.env.OLLAMA_KEEP_ALIVE ?? '10m',
      format: LOCATOR_SCHEMA,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user, images },
      ],
      options: { temperature: 0.05 },
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error(`Ollama eye-localization review returned HTTP ${response.status}: ${await response.text()}`);
  const payload = await response.json();
  if (!payload.message?.content) throw new Error('Ollama returned no eye-localization review content.');
  return JSON.parse(payload.message.content);
}

async function verifyOllama() {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };
    const tags = await response.json();
    const models = (tags.models ?? []).map((item) => item.name ?? item.model).filter(Boolean);
    return models.includes(VISION_MODEL)
      ? { ok: true }
      : { ok: false, reason: `${VISION_MODEL} is not installed` };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

async function endpointCheck(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return { ok: response.ok, detail: response.ok ? 'reachable' : `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

async function uploadImage(path, name) {
  const bytes = await readFile(path);
  const form = new FormData();
  form.append('image', new Blob([bytes], { type: 'image/png' }), name);
  form.append('overwrite', 'true');
  const response = await fetch(`${COMFY_BASE_URL}/upload/image`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`ComfyUI image upload returned HTTP ${response.status}.`);
  const payload = await response.json();
  if (!payload.name) throw new Error('ComfyUI upload did not return an image name.');
  return payload;
}

async function runWorkflowForImage(workflow) {
  const queuedResponse = await fetch(`${COMFY_BASE_URL}/prompt`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: `srf-${randomUUID()}` }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!queuedResponse.ok) throw new Error(`ComfyUI prompt returned HTTP ${queuedResponse.status}.`);
  const queued = await queuedResponse.json();
  if (!queued.prompt_id) throw new Error('ComfyUI did not return a prompt id.');
  const image = await waitForImage(queued.prompt_id);
  const response = await fetch(`${COMFY_BASE_URL}/view?${new URLSearchParams(image)}`, {
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`ComfyUI image download returned HTTP ${response.status}.`);
  return { promptId: queued.prompt_id, bytes: Buffer.from(await response.arrayBuffer()) };
}

async function waitForImage(promptId) {
  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    const response = await fetch(`${COMFY_BASE_URL}/history/${promptId}`, {
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`ComfyUI history returned HTTP ${response.status}.`);
    const history = await response.json();
    const entry = history[promptId];
    if (entry?.status?.status_str === 'error') throw new Error(`ComfyUI prompt ${promptId} failed.`);
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
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceTokens(item, replacements)]));
  }
  return value;
}

function decodeRgba(path, dimensions) {
  const result = spawnSync(
    FFMPEG,
    ['-hide_banner', '-loglevel', 'error', '-i', path, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'],
    { encoding: null, maxBuffer: 32 * 1024 * 1024 },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Could not decode ${path}.`);
  const expected = dimensions.width * dimensions.height * 4;
  if (result.stdout.length !== expected) throw new Error(`Decoded ${path} to ${result.stdout.length} bytes; expected ${expected}.`);
  return new Uint8Array(result.stdout);
}

function alphaMaskFromRgba(rgba, dimensions) {
  const mask = new Uint8Array(dimensions.width * dimensions.height);
  for (let pixel = 0; pixel < mask.length; pixel += 1) mask[pixel] = rgba[pixel * 4 + 3];
  return mask;
}

function analyzeMask(mask, dimensions, threshold) {
  let selected = 0;
  let minX = dimensions.width;
  let minY = dimensions.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < dimensions.height; y += 1) {
    for (let x = 0; x < dimensions.width; x += 1) {
      if (mask[y * dimensions.width + x] <= threshold) continue;
      selected += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return {
    selectedPixels: selected,
    coverageRatio: selected / (dimensions.width * dimensions.height),
    bounds: selected ? { minX, minY, maxX, maxY } : null,
  };
}

function paddedCrop(bounds, dimensions) {
  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;
  const padX = Math.max(48, Math.round(width * 0.5));
  const padY = Math.max(36, Math.round(height * 1.25));
  const x = Math.max(0, bounds.minX - padX);
  const y = Math.max(0, bounds.minY - padY);
  const x2 = Math.min(dimensions.width, bounds.maxX + 1 + padX);
  const y2 = Math.min(dimensions.height, bounds.maxY + 1 + padY);
  return { x, y, width: x2 - x, height: y2 - y };
}

function cropPng(inputPath, outputPath, crop) {
  runFfmpeg(['-y', '-hide_banner', '-loglevel', 'error', '-i', inputPath, '-vf', `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`, '-frames:v', '1', '-update', '1', outputPath]);
}

function alphaCrop(inputPath, outputPath, crop) {
  runFfmpeg(['-y', '-hide_banner', '-loglevel', 'error', '-i', inputPath, '-vf', `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y},alphaextract,format=gray`, '-frames:v', '1', '-update', '1', outputPath]);
}

function makeContactSheet(paths, outputPath) {
  const inputs = paths.flatMap((path) => ['-i', path]);
  runFfmpeg([
    '-y', '-hide_banner', '-loglevel', 'error',
    ...inputs,
    '-filter_complex',
    '[0:v]scale=512:-2,format=rgb24[a];[1:v]scale=512:-2,format=rgb24[b];[2:v]scale=512:-2,format=rgb24[c];[a][b][c]hstack=inputs=3[out]',
    '-map', '[out]', '-frames:v', '1', '-update', '1', outputPath,
  ]);
}

function runFfmpeg(args) {
  const result = spawnSync(FFMPEG, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.stderr || result.stdout || 'unknown error'}`);
}

function readPngDimensions(bytes, label) {
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
    throw new Error(`${label} is not a PNG.`);
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function assertSameDimensions(expected, actual, label) {
  if (expected.width !== actual.width || expected.height !== actual.height) {
    throw new Error(`${label} is ${actual.width}x${actual.height}; expected ${expected.width}x${expected.height}.`);
  }
}
