import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { analyzeEyeStateAsset } from '../animation/src/level2-eye-state-proof.mjs';
import { expandTrustedEyeSeedMask } from '../animation/src/level2-trusted-eye-replacement-mask.mjs';
import {
  DETERMINISTIC_CLOSED_EYE_STYLES,
  synthesizeDeterministicClosedEyeState,
} from '../animation/src/level2-deterministic-closed-eye-state.mjs';
import { evaluateClosedEyeSemantic } from '../animation/src/level2-closed-eye-semantic-proof.mjs';

const MANIFEST_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const ASSET_ROOT = resolve('assets');
const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const INPUT_ROOT = resolve(
  'tmp/animation-assets/character-state-inputs/shot03-enki-eyes-v1-deterministic',
);
const OLLAMA_BASE_URL = (
  process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434'
).replace(/\/$/, '');
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL ?? 'qwen3-vl:4b-instruct';
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const SHOT_NUMBER = 3;
const LAYER_ID = 'shot03-enki-eyes-v1';
const BODY_ID = 'shot03-enki-body-v1';
const TARGET_EYE_BAND_FILL = 0.015;
const MAX_EYE_BAND_FILL = 0.03;
const MASK_THRESHOLD = 16;
const SEMANTIC_PADDING_X = 36;
const SEMANTIC_PADDING_Y = 24;
const SEMANTIC_SCALE = 8;

const STYLES = Object.freeze([
  DETERMINISTIC_CLOSED_EYE_STYLES.soft,
  DETERMINISTIC_CLOSED_EYE_STYLES.balanced,
  DETERMINISTIC_CLOSED_EYE_STYLES.defined,
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
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});

async function main() {
  if (!['preflight', 'generate', 'all'].includes(command)) {
    throw new Error(
      'Usage: node tools/scripts/shot03-level2-enki-blink-deterministic.mjs <preflight|generate|all>',
    );
  }

  const context = await loadContext();
  const semantic = await verifyOllama();
  console.log('Shot 3 deterministic closed-eye fallback preflight');
  console.log(
    `[${context.currentProof.metrics.inEyeBandAlphaRatio >= 0.98 ? 'ok' : 'blocked'}] trusted eye localization: ${(context.currentProof.metrics.inEyeBandAlphaRatio * 100).toFixed(2)}% in band`,
  );
  console.log(
    `[${semantic.ok ? 'ok' : 'blocked'}] semantic critic: ${semantic.ok ? VISION_MODEL : semantic.reason}`,
  );
  console.log('[info] no generative image model is used; canonical assets remain read-only.');
  if (context.currentProof.metrics.inEyeBandAlphaRatio < 0.98 || !semantic.ok) {
    process.exitCode = 2;
    return;
  }
  if (command === 'preflight') return;

  const result = await generateDeterministicSweep(context);
  printResult(result);
  if (!result.bestCandidate) {
    process.exitCode = 2;
    return;
  }

  if (command === 'all') {
    console.log('');
    console.log('[info] Semantically closed deterministic candidate found; rendering normal-speed human audition...');
    await runInherited('node', ['tools/scripts/shot03-level2-replacement-audition.mjs']);
  }
}

async function loadContext() {
  const manifestBytes = await readFile(MANIFEST_PATH);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const shot = manifest.shots?.find((item) => item.sourceShotNumber === SHOT_NUMBER);
  if (!shot) throw new Error('Shot 3 is missing from animation-v1 manifest.');
  const layer = shot.layers?.find((item) => item.id === LAYER_ID);
  const body = shot.layers?.find((item) => item.id === BODY_ID);
  if (!layer?.path || !body?.path) throw new Error('Shot 3 eye/body canonical configuration is incomplete.');
  if (
    layer.state !== 'approved' ||
    layer.review?.status !== 'approved' ||
    !/^sha256:[a-f0-9]{64}$/i.test(layer.sha256 ?? '')
  ) {
    throw new Error(`${LAYER_ID} must remain approved and checksum-backed during fallback synthesis.`);
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
  assertSameDimensions(dimensions, readPngDimensions(currentStateBytes, LAYER_ID), LAYER_ID);
  const currentProof = analyzeEyeStateAsset({
    bodyPath,
    statePath: currentStatePath,
    referencePath: editorialPath,
  });
  return {
    manifestChecksum: prefixedSha(manifestBytes),
    shot,
    layer,
    body,
    editorialPath,
    bodyPath,
    currentStatePath,
    currentStateChecksum: prefixedSha(currentStateBytes),
    dimensions,
    editorialRgba: decodeRgba(editorialPath, dimensions),
    currentStateRgba: decodeRgba(currentStatePath, dimensions),
    currentProof,
  };
}

async function generateDeterministicSweep(context) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const inputDirectory = join(INPUT_ROOT, stamp);
  const runDirectory = join(CANDIDATE_ROOT, stamp);
  const shotDirectory = join(runDirectory, 'shot-03');
  await Promise.all([
    mkdir(inputDirectory, { recursive: true }),
    mkdir(shotDirectory, { recursive: true }),
  ]);

  const seedMask = alphaMaskFromRgba(context.currentStateRgba, context.dimensions);
  const expansion = expandTrustedEyeSeedMask({
    seedMask,
    dimensions: context.dimensions,
    eyeBand: context.currentProof.metrics.eyeBand,
    threshold: MASK_THRESHOLD,
    targetFillRatio: TARGET_EYE_BAND_FILL,
    maxFillRatio: MAX_EYE_BAND_FILL,
    minSeedInBandRatio: 0.98,
    maxHorizontalRadius: 24,
    maxVerticalRadius: 10,
  });
  console.log(
    `[ok] trusted eyelid edit mask: ${(expansion.metrics.fillRatio * 100).toFixed(3)}% of eye band · radius ${expansion.metrics.usedHorizontalRadius}x${expansion.metrics.usedVerticalRadius}`,
  );

  const editBounds = alphaBounds(expansion.mask, context.dimensions, MASK_THRESHOLD);
  if (!editBounds) throw new Error('Deterministic closed-eye edit mask is empty.');
  const semanticCrop = paddedCrop(
    editBounds,
    SEMANTIC_PADDING_X,
    SEMANTIC_PADDING_Y,
    context.dimensions,
  );
  const sourceSemanticPath = join(inputDirectory, 'source-open-eyes-zoom.png');
  cropAndUpscale(context.editorialPath, sourceSemanticPath, semanticCrop, SEMANTIC_SCALE);

  const attempts = [];
  for (const style of STYLES) {
    const synthesis = synthesizeDeterministicClosedEyeState({
      referenceRgba: context.editorialRgba,
      seedMask,
      editMask: expansion.mask,
      dimensions: context.dimensions,
      eyeBand: context.currentProof.metrics.eyeBand,
      style,
      threshold: MASK_THRESHOLD,
    });
    const candidatePath = join(
      shotDirectory,
      `${LAYER_ID}-deterministic-${style.id}.png`,
    );
    writeRgbaPng(synthesis.rgba, context.dimensions, candidatePath);
    const compositePath = join(inputDirectory, `deterministic-${style.id}-on-editorial.png`);
    composeOverlay(context.editorialPath, candidatePath, compositePath);
    const candidateSemanticPath = join(inputDirectory, `deterministic-${style.id}-eyes-zoom.png`);
    cropAndUpscale(compositePath, candidateSemanticPath, semanticCrop, SEMANTIC_SCALE);

    const eyeStateProof = analyzeEyeStateAsset({
      bodyPath: context.bodyPath,
      statePath: candidatePath,
      referencePath: context.editorialPath,
    });
    const rawSemantic = await reviewClosedEyes({
      sourcePath: sourceSemanticPath,
      candidatePath: candidateSemanticPath,
    });
    const semanticEyeStateProof = evaluateClosedEyeSemantic(rawSemantic);
    const semanticArtifactPass =
      semanticEyeStateProof.identityStable === true &&
      semanticEyeStateProof.patchSeamVisible === false;
    const eligibleForAudition =
      eyeStateProof.pass && semanticEyeStateProof.pass && semanticArtifactPass;

    const candidateBytes = await readFile(candidatePath);
    const attempt = {
      schemaVersion: 1,
      state: 'pending-human-review',
      replacementForLayerId: LAYER_ID,
      sourceShotNumber: SHOT_NUMBER,
      variant: {
        id: `deterministic-${style.id}`,
        method: 'source-sampled-eyelid-synthesis',
        style,
      },
      candidatePath,
      candidateChecksum: prefixedSha(candidateBytes),
      currentCanonicalPath: context.currentStatePath,
      currentCanonicalChecksum: context.currentStateChecksum,
      sourceManifestChecksum: context.manifestChecksum,
      canonicalMutated: false,
      automaticPromotionAllowed: false,
      eligibleForAudition,
      eyeStateProof,
      semanticEyeStateProof,
      semanticArtifactPass,
      synthesis: synthesis.metrics,
      trustedLocalizationSeed: {
        source: 'current approved eye alpha only',
        expansion: expansion.metrics,
      },
      reviewArtifacts: {
        compositePath,
        sourceSemanticPath,
        semanticCandidatePath: candidateSemanticPath,
      },
    };
    attempts.push(attempt);
    await writeJson(
      join(shotDirectory, `${LAYER_ID}-deterministic-${style.id}.candidate.json`),
      attempt,
    );

    console.log(
      `[${eligibleForAudition ? 'ELIGIBLE' : 'REJECT'}] ${style.id}: structural ${eyeStateProof.pass ? 'PASS' : 'FAIL'} · semantic ${semanticEyeStateProof.state} ${Math.round(semanticEyeStateProof.confidence * 100)}% · identity ${semanticEyeStateProof.identityStable ? 'stable' : 'changed'} · seam ${semanticEyeStateProof.patchSeamVisible ? 'visible' : 'clean'}`,
    );
    if (!semanticEyeStateProof.pass) {
      for (const failure of semanticEyeStateProof.failures) console.log(`         - ${failure}`);
    }
    if (!semanticArtifactPass) {
      if (!semanticEyeStateProof.identityStable) console.log('         - semantic review did not confirm identity stability');
      if (semanticEyeStateProof.patchSeamVisible) console.log('         - semantic review sees a visible patch seam');
    }
  }

  const eligible = attempts
    .filter((attempt) => attempt.eligibleForAudition)
    .sort((a, b) =>
      b.semanticEyeStateProof.confidence - a.semanticEyeStateProof.confidence ||
      STYLES.findIndex((style) => style.id === a.variant.style.id) -
        STYLES.findIndex((style) => style.id === b.variant.style.id),
    );
  const bestCandidate = eligible[0] ?? null;
  const contactSheetPath = join(inputDirectory, 'deterministic-closed-eye-contact-sheet.png');
  makeContactSheet(
    [sourceSemanticPath, ...attempts.map((attempt) => attempt.reviewArtifacts.semanticCandidatePath)],
    contactSheetPath,
  );

  await writeJson(join(runDirectory, 'candidate-run.json'), {
    schemaVersion: 4,
    type: 'shot03-character-state-replacement-candidate',
    generatedAt: new Date().toISOString(),
    sourceManifestChecksum: context.manifestChecksum,
    candidates: bestCandidate ? [bestCandidate] : [],
    attempts,
    selectedVariant: bestCandidate?.variant?.id ?? null,
    reviewArtifacts: { contactSheetPath },
    approvalPolicy: {
      canonicalMutated: false,
      automaticPromotionAllowed: false,
      humanIdentityReviewRequired: true,
      explicitReplacementPromotionRequired: true,
      semanticClosedEyeRequired: true,
      semanticIdentityStableRequired: true,
      visiblePatchSeamForbidden: true,
    },
  });
  return { runDirectory, attempts, bestCandidate, contactSheetPath };
}

function printResult(result) {
  console.log('');
  console.log('Shot 3 deterministic closed-eye fallback');
  for (const attempt of result.attempts) {
    console.log(
      `[${attempt.eligibleForAudition ? 'ELIGIBLE' : 'REJECT'}] ${attempt.variant.id}: semantic ${attempt.semanticEyeStateProof.state} ${Math.round(attempt.semanticEyeStateProof.confidence * 100)}% · structural ${attempt.eyeStateProof.pass ? 'PASS' : 'FAIL'}`,
    );
  }
  console.log(`[info] eye comparison sheet: ${result.contactSheetPath}`);
  console.log(`[info] run: ${result.runDirectory}`);
  console.log('[info] canonical asset and manifest were NOT modified.');
  console.log(
    result.bestCandidate
      ? `STATUS: DETERMINISTIC CLOSED-EYE CANDIDATE — ${result.bestCandidate.variant.id} selected for human audition; no promotion performed.`
      : 'STATUS: BLOCKED — deterministic synthesis did not produce a semantically clean closed-eye state. Do not render or promote a blink.',
  );
}

async function reviewClosedEyes({ sourcePath, candidatePath }) {
  const images = await Promise.all([
    readFile(sourcePath).then((bytes) => bytes.toString('base64')),
    readFile(candidatePath).then((bytes) => bytes.toString('base64')),
  ]);
  const system = [
    'You are a literal visual state inspector.',
    'Return only JSON matching the schema.',
    'Image 1 is the immutable open-eye source reference. Image 2 is a candidate closed-eye state.',
    'Judge the pixels actually visible in Image 2, never the requested intent.',
    'Call state closed only when BOTH eyes are physically shut: no iris, pupil, sclera, eyeball opening, or open-eye highlight remains, and the eyelids read as closed creases.',
    'If either eye remains open, partly open, or uncertain, use open or ambiguous.',
    'Also report whether the same painted identity is preserved and whether an obvious pasted or synthetic patch seam is visible.',
  ].join(' ');
  const user = JSON.stringify({
    task: 'Determine whether Image 2 literally shows both of Enki\'s eyes fully closed without an obvious patch artifact.',
    checks: [
      'both eyelids physically closed',
      'no visible iris or pupil',
      'no visible sclera or eye opening',
      'same painted identity',
      'no obvious patch seam',
    ],
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
    throw new Error(`Ollama deterministic closed-eye review returned HTTP ${response.status}: ${await response.text()}`);
  }
  const payload = await response.json();
  if (!payload.message?.content) throw new Error('Ollama returned no deterministic closed-eye review content.');
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
    if (!models.includes(VISION_MODEL)) return { ok: false, reason: `${VISION_MODEL} is not installed` };
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

function alphaMaskFromRgba(rgba, dimensions) {
  const mask = new Uint8Array(dimensions.width * dimensions.height);
  for (let pixel = 0; pixel < mask.length; pixel += 1) mask[pixel] = rgba[pixel * 4 + 3];
  return mask;
}

function alphaBounds(mask, dimensions, threshold) {
  let minX = dimensions.width;
  let minY = dimensions.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < dimensions.height; y += 1) {
    for (let x = 0; x < dimensions.width; x += 1) {
      if (mask[y * dimensions.width + x] <= threshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return maxX >= minX ? { minX, minY, maxX, maxY } : null;
}

function paddedCrop(bounds, padX, padY, dimensions) {
  const x = Math.max(0, bounds.minX - padX);
  const y = Math.max(0, bounds.minY - padY);
  const x1 = Math.min(dimensions.width, bounds.maxX + 1 + padX);
  const y1 = Math.min(dimensions.height, bounds.maxY + 1 + padY);
  return { x, y, width: x1 - x, height: y1 - y };
}

function cropAndUpscale(inputPath, outputPath, crop, scale) {
  runFfmpeg([
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', inputPath,
    '-vf', `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y},scale=iw*${scale}:ih*${scale}:flags=lanczos`,
    '-frames:v', '1', '-update', '1', outputPath,
  ]);
}

function writeRgbaPng(rgba, dimensions, outputPath) {
  const result = spawnSync(
    FFMPEG,
    [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${dimensions.width}x${dimensions.height}`,
      '-i', '-', '-frames:v', '1', '-update', '1', outputPath,
    ],
    { input: Buffer.from(rgba), encoding: null, maxBuffer: 16 * 1024 * 1024 },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Could not write deterministic closed-eye PNG: ${String(result.stderr ?? '')}`);
}

function composeOverlay(referencePath, statePath, outputPath) {
  runFfmpeg([
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', referencePath, '-i', statePath,
    '-filter_complex', '[0:v][1:v]overlay=0:0:format=auto,format=rgb24[out]',
    '-map', '[out]', '-frames:v', '1', '-update', '1', outputPath,
  ]);
}

function makeContactSheet(paths, outputPath) {
  const inputs = paths.flatMap((path) => ['-i', path]);
  const filters = paths
    .map((_path, index) => `[${index}:v]scale=-1:360:flags=lanczos[v${index}]`)
    .join(';');
  const stack = paths.map((_path, index) => `[v${index}]`).join('');
  runFfmpeg([
    '-y', '-hide_banner', '-loglevel', 'error',
    ...inputs,
    '-filter_complex', `${filters};${stack}hstack=inputs=${paths.length}[out]`,
    '-map', '[out]', '-frames:v', '1', '-update', '1', outputPath,
  ]);
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

function readPngDimensions(bytes, label) {
  if (bytes.length < 24 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error(`${label} is not a PNG.`);
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function assertSameDimensions(expected, actual, label) {
  if (expected.width !== actual.width || expected.height !== actual.height) {
    throw new Error(`${label} is ${actual.width}x${actual.height}; expected ${expected.width}x${expected.height}.`);
  }
}

function verifyChecksum(bytes, expected, label) {
  if (normalizeSha(prefixedSha(bytes)) !== normalizeSha(expected)) {
    throw new Error(`${label} checksum no longer matches the canonical manifest.`);
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
  const result = spawnSync(FFMPEG, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.stderr || result.stdout || 'unknown error'}`);
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
      rejectPromise(new Error(`${commandName} failed with ${signal ? `signal ${signal}` : `exit code ${code ?? 'unknown'}`}.`));
    });
  });
}
