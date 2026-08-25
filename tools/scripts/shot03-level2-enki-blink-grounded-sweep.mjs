import { createHash, randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { checkWorkflowHostCompatibility } from '../renderer/comfyui-workflow-doctor.mjs';
import {
  analyzeGroundedEyeState,
  buildGroundedEyeEditMask,
} from '../animation/src/level2-grounded-eye-mask.mjs';
import { evaluateClosedEyeSemantic } from '../animation/src/level2-closed-eye-semantic-proof.mjs';

const MANIFEST_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const ASSET_ROOT = resolve('assets');
const GROUNDING_ROOT = resolve(
  'tmp/animation-assets/character-state-inputs/shot03-enki-eyes-editorial-localization',
);
const INPUT_ROOT = resolve(
  'tmp/animation-assets/character-state-inputs/shot03-enki-eyes-v1-grounded-sweep',
);
const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const INPAINT_WORKFLOW_PATH = resolve(
  'tools/renderer/workflows/shot03-character-state-inpaint-api.json',
);
const COMFY_BASE_URL = (
  process.env.COMFYUI_BASE_URL ?? 'http://127.0.0.1:8188'
).replace(/\/$/, '');
const OLLAMA_BASE_URL = (
  process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434'
).replace(/\/$/, '');
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL ?? 'qwen3-vl:4b-instruct';
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const SHOT_NUMBER = 3;
const LAYER_ID = 'shot03-enki-eyes-v1';
const MASK_THRESHOLD = 16;
const INPAINT_PADDING = 48;
const SEMANTIC_PADDING_X = 24;
const SEMANTIC_PADDING_Y = 22;
const CROP_ALIGNMENT = 8;
const SEMANTIC_SCALE = 8;

const VARIANTS = Object.freeze([
  { id: 'source-safe', denoise: 0.46, cfg: 5.0, steps: 30, seed: 202608261 },
  { id: 'balanced', denoise: 0.60, cfg: 5.5, steps: 34, seed: 202608262 },
  { id: 'assertive', denoise: 0.72, cfg: 6.0, steps: 36, seed: 202608263 },
]);

const CLOSED_EYE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'state',
    'bothEyesClosed',
    'irisOrPupilVisible',
    'scleraVisible',
    'identityStable',
    'patchSeamVisible',
    'confidence',
    'summary',
  ],
  properties: {
    state: { type: 'string', enum: ['closed', 'open', 'ambiguous'] },
    bothEyesClosed: { type: 'boolean' },
    irisOrPupilVisible: { type: 'boolean' },
    scleraVisible: { type: 'boolean' },
    identityStable: { type: 'boolean' },
    patchSeamVisible: { type: 'boolean' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    summary: { type: 'string' },
  },
};

const command = process.argv[2] ?? 'preflight';

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  if (!['preflight', 'generate', 'all'].includes(command)) {
    throw new Error(
      'Usage: node tools/scripts/shot03-level2-enki-blink-grounded-sweep.mjs <preflight|generate|all>',
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

  const result = await generateSweep(context);
  printResult(result);
  if (!result.bestCandidate) {
    process.exitCode = 2;
    return;
  }

  if (command === 'all') {
    console.log('');
    console.log('[info] Semantically closed grounded-eye candidate found; rendering normal-speed human audition...');
    await runInherited('node', ['tools/scripts/shot03-level2-replacement-audition.mjs']);
  }
}

async function loadContext() {
  const manifestBytes = await readFile(MANIFEST_PATH);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const shot = manifest.shots?.find((item) => item.sourceShotNumber === SHOT_NUMBER);
  if (!shot?.sourceFrame) throw new Error('Shot 3 editorial source is missing from animation-v1 manifest.');
  const layer = shot.layers?.find((item) => item.id === LAYER_ID);
  if (!layer?.path || layer.state !== 'approved' || layer.review?.status !== 'approved') {
    throw new Error(`${LAYER_ID} must remain the approved canonical replacement target.`);
  }
  if (!/^sha256:[a-f0-9]{64}$/i.test(layer.sha256 ?? '')) {
    throw new Error(`${LAYER_ID} must remain checksum-backed.`);
  }

  const editorialPath = resolve(ASSET_ROOT, shot.sourceFrame);
  const currentStatePath = resolve(ASSET_ROOT, layer.path);
  const [editorialBytes, currentStateBytes] = await Promise.all([
    readFile(editorialPath),
    readFile(currentStatePath),
  ]);
  verifyChecksum(currentStateBytes, layer.sha256, LAYER_ID);
  const dimensions = readPngDimensions(editorialBytes, 'Shot 3 editorial source');
  const grounding = await newestTrustedGrounding(shot.sourceFrame);
  const maskResult = buildGroundedEyeEditMask({
    eyeBoxes: grounding.report.mappedEyeBoxes,
    dimensions,
  });

  return {
    manifest,
    manifestChecksum: prefixedSha(manifestBytes),
    shot,
    layer,
    editorialPath,
    editorialBytes,
    editorialRgba: decodeRgba(editorialPath, dimensions),
    currentStatePath,
    currentStateChecksum: prefixedSha(currentStateBytes),
    dimensions,
    grounding,
    maskResult,
  };
}

async function newestTrustedGrounding(sourceFrame) {
  let entries = [];
  try {
    entries = await readdir(GROUNDING_ROOT, { withFileTypes: true });
  } catch {
    throw new Error('No editorial eye-grounding runs exist. Run the grounding locator first.');
  }
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(GROUNDING_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));

  for (const directory of directories) {
    const reportPath = join(directory, 'editorial-eye-localization-report.json');
    try {
      const bytes = await readFile(reportPath);
      const report = JSON.parse(bytes.toString('utf8'));
      if (report.type !== 'shot03-editorial-eye-grounding-candidate') continue;
      if (report.semanticPass !== true) continue;
      if (report.sourceAuthority !== 'editorial-v1') continue;
      if (report.legacyCanonicalEyeAlphaUsed !== false || report.sam3Used !== false) continue;
      if (report.sourceFrame !== sourceFrame) continue;
      if (!Array.isArray(report.mappedEyeBoxes) || report.mappedEyeBoxes.length !== 2) continue;
      return {
        directory,
        reportPath,
        report,
        checksum: prefixedSha(bytes),
      };
    } catch {
      continue;
    }
  }
  throw new Error('No semantically trusted two-stage editorial eye grounding is available.');
}

async function runPreflight(context) {
  const comfy = await endpointCheck(`${COMFY_BASE_URL}/system_stats`);
  let compatibility = { ok: false, nodeCount: 0, missingNodeTypes: [] };
  if (comfy.ok) {
    compatibility = await checkWorkflowHostCompatibility({
      workflowPath: INPAINT_WORKFLOW_PATH,
      baseUrl: COMFY_BASE_URL,
    });
  }
  const vision = await verifyOllama();
  return {
    ok: comfy.ok && compatibility.ok && vision.ok,
    comfy,
    compatibility,
    vision,
    groundingPass: context.grounding.report.semanticPass === true,
  };
}

function printPreflight(result, context) {
  console.log('Shot 3 grounded-eye closed-state sweep preflight');
  console.log(`[ok] grounding: ${context.grounding.reportPath}`);
  for (const [index, box] of context.grounding.report.mappedEyeBoxes.entries()) {
    console.log(`[ok] eye ${index + 1}: ${box.x},${box.y} ${box.width}x${box.height}`);
  }
  console.log(
    `[ok] grounded edit mask: ${(context.maskResult.metrics.fillRatio * 100).toFixed(2)}% of padded eye boxes · ${context.maskResult.metrics.selectedPixels} px`,
  );
  console.log(`[${result.comfy.ok ? 'ok' : 'blocked'}] ComfyUI: ${result.comfy.detail}`);
  console.log(
    `[${result.compatibility.ok ? 'ok' : 'blocked'}] inpaint workflow: ${result.compatibility.nodeCount ?? 0} nodes`,
  );
  console.log(
    `[${result.vision.ok ? 'ok' : 'blocked'}] semantic critic: ${result.vision.ok ? VISION_MODEL : result.vision.reason}`,
  );
  console.log('[info] legacy canonical eye alpha is replacement provenance only and is NOT used for localization or masking.');
  console.log('[info] canonical assets remain read-only; all generated states stay under tmp/.');
}

async function generateSweep(context) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const inputDirectory = join(INPUT_ROOT, stamp);
  const runDirectory = join(CANDIDATE_ROOT, stamp);
  const shotDirectory = join(runDirectory, 'shot-03');
  await Promise.all([
    mkdir(inputDirectory, { recursive: true }),
    mkdir(shotDirectory, { recursive: true }),
  ]);

  const maskPath = join(inputDirectory, 'grounded-eye-edit-mask.png');
  writeGrayPng(context.maskResult.mask, context.dimensions, maskPath);
  const inpaintCrop = paddedAlignedCrop(
    context.maskResult.metrics.bounds,
    INPAINT_PADDING,
    context.dimensions.width,
    context.dimensions.height,
  );
  const semanticCrop = paddedEyePairCrop(
    context.grounding.report.mappedEyeBoxes,
    context.dimensions,
  );
  const sourceCropPath = join(inputDirectory, 'editorial-grounded-eye-source-crop.png');
  const maskCropPath = join(inputDirectory, 'grounded-eye-edit-mask-crop.png');
  const semanticSourcePath = join(inputDirectory, 'semantic-open-eyes.png');
  cropPng(context.editorialPath, sourceCropPath, inpaintCrop);
  cropPng(maskPath, maskCropPath, inpaintCrop);
  cropAndUpscale(context.editorialPath, semanticSourcePath, semanticCrop);

  const [sourceUpload, maskUpload] = await Promise.all([
    uploadImage(sourceCropPath, `srf-shot03-grounded-eye-source-${stamp}.png`),
    uploadImage(maskCropPath, `srf-shot03-grounded-eye-mask-${stamp}.png`),
  ]);
  const workflowTemplate = JSON.parse(await readFile(INPAINT_WORKFLOW_PATH, 'utf8'));
  const attempts = [];

  for (const variant of VARIANTS) {
    console.log(
      `[generate] ${variant.id}: denoise ${variant.denoise.toFixed(2)} · cfg ${variant.cfg.toFixed(1)} · ${variant.steps} steps`,
    );
    const prompt = [
      'The supplied painted source crop is the sole identity authority.',
      'The supplied mask is verified to cover Enki\'s two actual visible eyes and immediate eyelids.',
      'Close BOTH eyes fully for the closed instant of one natural calm blink.',
      'Replace each open eye opening with a narrow natural closed upper/lower eyelid contact crease.',
      'No iris, pupil, sclera, eyeball opening, catchlight or open-eye highlight may remain in either eye.',
      'Do not squint; the eyelids must be physically shut.',
      'Preserve the exact same identity, gaze direction implied by the head pose, brows, nose, beard, skin tone, lighting, perspective and painterly realism.',
      'Modify only the supplied grounded eye mask. Do not alter unmasked facial features.',
    ].join(' ');
    const workflow = replaceTokens(structuredClone(workflowTemplate), {
      '{{SOURCE_IMAGE}}': sourceUpload.name,
      '{{AUXILIARY_IMAGE}}': maskUpload.name,
      '{{LAYER_PROMPT}}': prompt,
      '{{PROMPT}}': prompt,
      '{{NEGATIVE_PROMPT}}':
        'open eyes, partly open eyes, iris, pupil, sclera, eyeball, eye catchlight, visible eye opening, changed eyebrows, changed face, changed identity',
      '{{SEED}}': variant.seed,
      '{{OUTPUT_PREFIX}}': `srf-shot03-grounded-closed-${variant.id}`,
    });
    workflow['7'].inputs.seed = variant.seed;
    workflow['7'].inputs.steps = variant.steps;
    workflow['7'].inputs.cfg = variant.cfg;
    workflow['7'].inputs.denoise = variant.denoise;

    const generated = await runWorkflowForImage(workflow);
    const generatedCropPath = join(inputDirectory, `generated-${variant.id}.png`);
    await writeFile(generatedCropPath, generated.bytes);
    const generatedDimensions = readPngDimensions(
      generated.bytes,
      `${variant.id} generated grounded-eye crop`,
    );
    if (
      generatedDimensions.width !== inpaintCrop.width ||
      generatedDimensions.height !== inpaintCrop.height
    ) {
      throw new Error(
        `${variant.id} generated crop is ${generatedDimensions.width}x${generatedDimensions.height}; expected ${inpaintCrop.width}x${inpaintCrop.height}.`,
      );
    }

    const candidatePath = join(
      shotDirectory,
      `${LAYER_ID}-grounded-${variant.id}.png`,
    );
    createFullCanvasStateLayer({
      generatedCropPath,
      maskCropPath,
      crop: inpaintCrop,
      dimensions: context.dimensions,
      outputPath: candidatePath,
    });
    const compositePath = join(inputDirectory, `composite-${variant.id}.png`);
    composeOverlay(context.editorialPath, candidatePath, compositePath);
    const semanticCandidatePath = join(
      inputDirectory,
      `semantic-candidate-${variant.id}.png`,
    );
    cropAndUpscale(compositePath, semanticCandidatePath, semanticCrop);

    const candidateRgba = decodeRgba(candidatePath, context.dimensions);
    const eyeStateProof = analyzeGroundedEyeState({
      referenceRgba: context.editorialRgba,
      stateRgba: candidateRgba,
      editMask: context.maskResult.mask,
      dimensions: context.dimensions,
      boxArea: context.maskResult.metrics.boxArea,
    });
    const semanticRaw = await reviewClosedEyes({
      sourcePath: semanticSourcePath,
      candidatePath: semanticCandidatePath,
    });
    const semanticEyeStateProof = {
      raw: semanticRaw,
      ...evaluateClosedEyeSemantic(semanticRaw),
      provider: 'ollama',
      model: VISION_MODEL,
    };
    const eligibleForAudition =
      eyeStateProof.pass &&
      semanticEyeStateProof.pass &&
      semanticEyeStateProof.identityStable === true &&
      semanticEyeStateProof.patchSeamVisible === false;
    const candidateBytes = await readFile(candidatePath);
    const attempt = {
      schemaVersion: 3,
      state: 'pending-human-review',
      replacementForLayerId: LAYER_ID,
      sourceShotNumber: SHOT_NUMBER,
      variant,
      candidatePath,
      candidateChecksum: prefixedSha(candidateBytes),
      currentCanonicalPath: context.currentStatePath,
      currentCanonicalChecksum: context.currentStateChecksum,
      sourceManifestChecksum: context.manifestChecksum,
      groundingReportPath: context.grounding.reportPath,
      groundingReportChecksum: context.grounding.checksum,
      groundedEyeBoxes: context.grounding.report.mappedEyeBoxes,
      canonicalMutated: false,
      automaticPromotionAllowed: false,
      eligibleForAudition,
      eyeStateProof,
      semanticEyeStateProof,
      inputs: {
        sourceCropPath,
        maskCropPath,
        generatedCropPath,
        inpaintCrop,
        semanticCrop,
        promptId: generated.promptId,
      },
      reviewArtifacts: {
        compositePath,
        semanticSourcePath,
        semanticCandidatePath,
      },
    };
    attempts.push(attempt);
    await writeJson(
      join(shotDirectory, `${LAYER_ID}-grounded-${variant.id}.candidate.json`),
      attempt,
    );

    console.log(
      `           structural ${eyeStateProof.pass ? 'PASS' : 'BLOCKED'} · semantic ${semanticEyeStateProof.pass ? 'CLOSED' : semanticEyeStateProof.state.toUpperCase()} ${Math.round(semanticEyeStateProof.confidence * 100)}% · identity ${semanticEyeStateProof.identityStable ? 'stable' : 'changed'} · seam ${semanticEyeStateProof.patchSeamVisible ? 'visible' : 'clean'}`,
    );
    for (const failure of eyeStateProof.failures) console.log(`           - ${failure}`);
    if (!semanticEyeStateProof.pass) {
      for (const failure of semanticEyeStateProof.failures) console.log(`           - ${failure}`);
    }
  }

  const eligible = attempts
    .filter((attempt) => attempt.eligibleForAudition)
    .sort(
      (a, b) =>
        a.variant.denoise - b.variant.denoise ||
        b.semanticEyeStateProof.confidence - a.semanticEyeStateProof.confidence,
    );
  const bestCandidate = eligible[0] ?? null;
  const contactSheetPath = join(inputDirectory, 'grounded-closed-eye-sweep-contact-sheet.png');
  makeContactSheet(
    [semanticSourcePath, ...attempts.map((attempt) => attempt.reviewArtifacts.semanticCandidatePath)],
    contactSheetPath,
  );

  await writeJson(join(runDirectory, 'candidate-run.json'), {
    schemaVersion: 4,
    type: 'shot03-character-state-replacement-candidate',
    generatedAt: new Date().toISOString(),
    sourceManifestChecksum: context.manifestChecksum,
    groundingReportPath: context.grounding.reportPath,
    groundingReportChecksum: context.grounding.checksum,
    groundingHumanReviewRequired: true,
    candidates: bestCandidate ? [bestCandidate] : [],
    attempts,
    selectedVariant: bestCandidate?.variant?.id ?? null,
    reviewArtifacts: { contactSheetPath },
    approvalPolicy: {
      canonicalMutated: false,
      automaticPromotionAllowed: false,
      humanIdentityReviewRequired: true,
      semanticClosedEyeRequired: true,
      groundedEyeLocalizationRequired: true,
      explicitReplacementPromotionRequired: true,
    },
  });

  return { runDirectory, attempts, bestCandidate, contactSheetPath };
}

function printResult(result) {
  console.log('');
  console.log('Shot 3 grounded-eye closed-state sweep');
  for (const attempt of result.attempts) {
    console.log(
      `[${attempt.eligibleForAudition ? 'ELIGIBLE' : 'REJECT'}] ${attempt.variant.id}: structural ${attempt.eyeStateProof.pass ? 'PASS' : 'FAIL'} · semantic ${attempt.semanticEyeStateProof.state} ${Math.round(attempt.semanticEyeStateProof.confidence * 100)}%`,
    );
  }
  console.log(`[info] comparison sheet: ${result.contactSheetPath}`);
  console.log(`[info] run: ${result.runDirectory}`);
  console.log('[info] canonical asset and manifest were NOT modified.');
  console.log(
    result.bestCandidate
      ? `STATUS: GROUNDED CLOSED-EYE CANDIDATE — ${result.bestCandidate.variant.id} selected for normal-speed HUMAN audition; no promotion performed.`
      : 'STATUS: BLOCKED — none of the correctly grounded eye candidates actually proved both eyes closed. Do not render or promote a blink.',
  );
}

async function reviewClosedEyes({ sourcePath, candidatePath }) {
  const images = await Promise.all([
    readFile(sourcePath).then((bytes) => bytes.toString('base64')),
    readFile(candidatePath).then((bytes) => bytes.toString('base64')),
  ]);
  const system = [
    'You are a literal visual state inspector. Return only JSON matching the schema.',
    'Image 1 shows Enki\'s verified actual open eyes from immutable editorial-v1. Image 2 shows the exact same grounded eye region after candidate editing.',
    'Judge Image 2 only by visible pixels, never by requested intent.',
    'Call state closed only when BOTH eyelids are physically shut and no iris, pupil, sclera, catchlight or open eye aperture remains.',
    'The head pose and brows should remain the same. Reject identity drift or a pasted/rectangular patch seam.',
  ].join(' ');
  const user = JSON.stringify({
    task: 'Determine whether Image 2 literally shows both of Enki\'s verified eyes fully closed for a natural blink.',
  });
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: VISION_MODEL,
      stream: false,
      think: false,
      keep_alive: process.env.OLLAMA_KEEP_ALIVE ?? '10m',
      format: CLOSED_EYE_SCHEMA,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user, images },
      ],
      options: { temperature: 0.05 },
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) {
    throw new Error(`Ollama grounded closed-eye review returned HTTP ${response.status}: ${await response.text()}`);
  }
  const payload = await response.json();
  if (!payload.message?.content) throw new Error('Ollama returned no grounded closed-eye review content.');
  return JSON.parse(payload.message.content);
}

async function verifyOllama() {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
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
    body: JSON.stringify({
      prompt: workflow,
      client_id: `srf-${randomUUID()}`,
    }),
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
  if (result.status !== 0) throw new Error('Could not write grounded eye mask PNG.');
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

function paddedEyePairCrop(boxes, dimensions) {
  const minX = Math.max(0, Math.min(...boxes.map((box) => box.x)) - SEMANTIC_PADDING_X);
  const minY = Math.max(0, Math.min(...boxes.map((box) => box.y)) - SEMANTIC_PADDING_Y);
  const maxX = Math.min(
    dimensions.width,
    Math.max(...boxes.map((box) => box.x + box.width)) + SEMANTIC_PADDING_X,
  );
  const maxY = Math.min(
    dimensions.height,
    Math.max(...boxes.map((box) => box.y + box.height)) + SEMANTIC_PADDING_Y,
  );
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
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

function cropAndUpscale(inputPath, outputPath, crop) {
  runFfmpeg([
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    inputPath,
    '-vf',
    `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y},scale=iw*${SEMANTIC_SCALE}:ih*${SEMANTIC_SCALE}:flags=neighbor`,
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

function makeContactSheet(paths, outputPath) {
  const inputs = paths.flatMap((path) => ['-i', path]);
  const filters = paths
    .map((_, index) => `[${index}:v]scale=-2:420:flags=lanczos[p${index}]`)
    .join(';');
  const stack = paths.map((_, index) => `[p${index}]`).join('');
  runFfmpeg([
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    ...inputs,
    '-filter_complex',
    `${filters};${stack}hstack=inputs=${paths.length}[out]`,
    '-map',
    '[out]',
    '-frames:v',
    '1',
    '-update',
    '1',
    outputPath,
  ]);
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

function verifyChecksum(bytes, expected, label) {
  const actual = prefixedSha(bytes);
  if (normalizeSha(actual) !== normalizeSha(expected)) {
    throw new Error(`${label} checksum no longer matches canonical manifest.`);
  }
}

function prefixedSha(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function normalizeSha(value) {
  return String(value ?? '').replace(/^sha256:/i, '').toLowerCase();
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
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
      if (code === 0) return resolvePromise();
      rejectPromise(
        new Error(
          `${commandName} failed with ${signal ? `signal ${signal}` : `exit code ${code ?? 'unknown'}`}.`,
        ),
      );
    });
  });
}
