import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  mapCropBoxToFrame,
  normalizedBoxToPixels,
  paddedPixelCrop,
  validateEyeGrounding,
} from '../animation/src/level2-qwen-eye-grounding.mjs';

const MANIFEST_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const ASSET_ROOT = resolve('assets');
const OUTPUT_ROOT = resolve(
  'tmp/animation-assets/character-state-inputs/shot03-enki-eyes-editorial-localization',
);
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL ?? 'qwen3-vl:4b-instruct';
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const SHOT_NUMBER = 3;

const BOX_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['x1', 'y1', 'x2', 'y2'],
  properties: {
    x1: { type: 'integer', minimum: 0, maximum: 1000 },
    y1: { type: 'integer', minimum: 0, maximum: 1000 },
    x2: { type: 'integer', minimum: 0, maximum: 1000 },
    y2: { type: 'integer', minimum: 0, maximum: 1000 },
  },
};

const FACE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['faceVisible', 'faceBox', 'confidence', 'summary'],
  properties: {
    faceVisible: { type: 'boolean' },
    faceBox: BOX_SCHEMA,
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    summary: { type: 'string' },
  },
};

const EYES_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['bothEyesVisible', 'leftEye', 'rightEye', 'confidence', 'summary'],
  properties: {
    bothEyesVisible: { type: 'boolean' },
    leftEye: BOX_SCHEMA,
    rightEye: BOX_SCHEMA,
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    summary: { type: 'string' },
  },
};

const VERIFY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'bothBoxesOnActualEyes',
    'bothEyesVisible',
    'headdressIncluded',
    'boxesTooBroad',
    'confidence',
    'summary',
  ],
  properties: {
    bothBoxesOnActualEyes: { type: 'boolean' },
    bothEyesVisible: { type: 'boolean' },
    headdressIncluded: { type: 'boolean' },
    boxesTooBroad: { type: 'boolean' },
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
  const vision = await verifyOllama();
  console.log('Shot 3 editorial eye grounding preflight');
  console.log(`[${vision.ok ? 'ok' : 'blocked'}] semantic grounder: ${vision.ok ? VISION_MODEL : vision.reason}`);
  console.log('[info] localization source is immutable editorial-v1; legacy canonical eye alpha and SAM3 are NOT used.');
  if (!vision.ok) {
    process.exitCode = 2;
    return;
  }
  if (command === 'preflight') return;

  const result = await groundEyes(context);
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

async function groundEyes(context) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDirectory = join(OUTPUT_ROOT, stamp);
  await mkdir(outputDirectory, { recursive: true });

  const faceReview = await locateFace(context.editorialPath);
  const faceConfidence = Number(faceReview.confidence ?? 0);
  if (!faceReview.faceVisible || faceConfidence < 0.65) {
    return await persistBlocked({
      context,
      outputDirectory,
      stage: 'face-grounding',
      summary: faceReview.summary ?? 'Qwen did not confidently locate Enki\'s face.',
      faceReview,
    });
  }

  const facePixels = normalizedBoxToPixels(faceReview.faceBox, context.dimensions);
  const faceCrop = paddedPixelCrop(facePixels, context.dimensions, { padXRatio: 0.2, padYRatio: 0.16 });
  const faceCropPath = join(outputDirectory, 'editorial-enki-face-crop.png');
  cropPng(context.editorialPath, faceCropPath, faceCrop);

  const eyesReview = await locateEyes(faceCropPath);
  const eyeBoxes = [eyesReview.leftEye, eyesReview.rightEye];
  const geometry = validateEyeGrounding({
    faceBox: faceReview.faceBox,
    eyeBoxes,
    frameDimensions: context.dimensions,
    faceCrop,
  });

  const localEyes = eyeBoxes
    .map((box) => normalizedBoxToPixels(box, { width: faceCrop.width, height: faceCrop.height }))
    .sort((a, b) => (a.x + a.width / 2) - (b.x + b.width / 2));
  const mappedEyes = eyeBoxes
    .map((box) => mapCropBoxToFrame(box, faceCrop))
    .sort((a, b) => (a.x + a.width / 2) - (b.x + b.width / 2));

  const annotatedPath = join(outputDirectory, 'editorial-enki-face-eye-boxes.png');
  drawBoxes(faceCropPath, annotatedPath, localEyes);

  const eyeCropPaths = [];
  for (const [index, eye] of localEyes.entries()) {
    const crop = paddedPixelCrop(eye, { width: faceCrop.width, height: faceCrop.height }, {
      padXRatio: 0.65,
      padYRatio: 1.1,
    });
    const path = join(outputDirectory, `editorial-eye-${index + 1}-crop.png`);
    cropPng(faceCropPath, path, crop);
    eyeCropPaths.push(path);
  }

  const contactSheetPath = join(outputDirectory, 'editorial-eye-grounding-contact-sheet.png');
  makeContactSheet([faceCropPath, annotatedPath, ...eyeCropPaths], contactSheetPath);

  const verification = await verifyGrounding({ annotatedPath, eyeCropPaths });
  const semanticPass =
    geometry.pass &&
    eyesReview.bothEyesVisible === true &&
    Number(eyesReview.confidence ?? 0) >= 0.65 &&
    verification.bothBoxesOnActualEyes === true &&
    verification.bothEyesVisible === true &&
    verification.headdressIncluded === false &&
    verification.boxesTooBroad === false &&
    Number(verification.confidence ?? 0) >= 0.7;

  const report = {
    schemaVersion: 2,
    type: 'shot03-editorial-eye-grounding-candidate',
    generatedAt: new Date().toISOString(),
    sourceShotNumber: SHOT_NUMBER,
    sourceFrame: context.shot.sourceFrame,
    sourceAuthority: 'editorial-v1',
    localizationSource: 'immutable editorial source via two-stage Qwen grounding',
    legacyCanonicalEyeAlphaUsed: false,
    sam3Used: false,
    faceReview,
    faceCrop,
    eyesReview,
    geometry,
    mappedEyeBoxes: mappedEyes,
    verification,
    semanticPass,
    humanReviewRequired: true,
    automaticUseForBlinkSynthesis: false,
    canonicalMutated: false,
    artifacts: { faceCropPath, annotatedPath, eyeCropPaths, contactSheetPath },
  };
  const reportPath = join(outputDirectory, 'editorial-eye-localization-report.json');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return { ...report, reportPath, outputDirectory };
}

async function persistBlocked({ context, outputDirectory, stage, summary, faceReview }) {
  const report = {
    schemaVersion: 2,
    type: 'shot03-editorial-eye-grounding-candidate',
    generatedAt: new Date().toISOString(),
    sourceShotNumber: SHOT_NUMBER,
    sourceFrame: context.shot.sourceFrame,
    sourceAuthority: 'editorial-v1',
    localizationSource: 'immutable editorial source via two-stage Qwen grounding',
    legacyCanonicalEyeAlphaUsed: false,
    sam3Used: false,
    blockedStage: stage,
    faceReview,
    semanticPass: false,
    humanReviewRequired: true,
    automaticUseForBlinkSynthesis: false,
    canonicalMutated: false,
    summary,
    artifacts: {},
  };
  const reportPath = join(outputDirectory, 'editorial-eye-localization-report.json');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return { ...report, reportPath, outputDirectory };
}

function printResult(result) {
  console.log('');
  console.log('Shot 3 editorial eye grounding');
  if (result.faceReview) {
    console.log(`[info] face grounding: ${Math.round(Number(result.faceReview.confidence ?? 0) * 100)}% · ${result.faceReview.summary}`);
  }
  if (result.eyesReview) {
    console.log(`[info] eye grounding: ${Math.round(Number(result.eyesReview.confidence ?? 0) * 100)}% · ${result.eyesReview.summary}`);
  }
  if (result.geometry) {
    console.log(`[${result.geometry.pass ? 'PASS' : 'BLOCKED'}] geometry: ${result.geometry.pass ? 'two compact peer eye boxes' : result.geometry.failures.join('; ')}`);
  }
  if (result.verification) {
    console.log(`[${result.semanticPass ? 'PASS' : 'BLOCKED'}] Qwen annotated-box check: ${result.verification.summary}`);
  }
  for (const [index, box] of (result.mappedEyeBoxes ?? []).entries()) {
    console.log(`[info] eye ${index + 1} source box: ${box.x},${box.y} ${box.width}x${box.height}`);
  }
  if (result.artifacts?.contactSheetPath) console.log(`[info] contact sheet: ${result.artifacts.contactSheetPath}`);
  console.log(`[info] report: ${result.reportPath}`);
  console.log('[info] no blink PNG was generated and canonical assets were NOT modified.');
  console.log(
    result.semanticPass
      ? 'STATUS: EYE BOX CANDIDATE — semantic + geometry checks say these are the actual eyes; HUMAN confirmation is still required before synthesis.'
      : 'STATUS: BLOCKED — eye grounding is not trusted. Do not use it for blink synthesis.',
  );
}

async function locateFace(editorialPath) {
  const image = (await readFile(editorialPath)).toString('base64');
  return askVision({
    schema: FACE_SCHEMA,
    system: [
      'You are a precise visual grounding tool. Return only JSON matching the schema.',
      'Coordinates are integers normalized 0..1000 relative to the supplied image.',
      'Locate Enki\'s actual exposed human face, not his horned headdress.',
      'The face box should tightly include the facial skin containing both eyes, nose and mouth/chin while excluding horns and crown as much as possible.',
      'Do not use the top of the headdress as the face.',
    ].join(' '),
    user: 'Return one tight normalized bounding box for Enki\'s visible face in this Shot 3 editorial image.',
    images: [image],
  });
}

async function locateEyes(faceCropPath) {
  const image = (await readFile(faceCropPath)).toString('base64');
  return askVision({
    schema: EYES_SCHEMA,
    system: [
      'You are a precise visual grounding tool. Return only JSON matching the schema.',
      'Coordinates are integers normalized 0..1000 relative to this FACE CROP, not the original frame.',
      'Return two tight boxes around the actual visible eye openings and immediate eyelids only.',
      'Do not box eyebrows, forehead, crown, headdress decorations, nose, or hair.',
      'leftEye means the eye on the viewer\'s left; rightEye means the eye on the viewer\'s right.',
      'If an eye is partly visible, tightly box the visible opening rather than enlarging the box.',
    ].join(' '),
    user: 'Locate Enki\'s two actual eyes in this face crop.',
    images: [image],
  });
}

async function verifyGrounding({ annotatedPath, eyeCropPaths }) {
  const images = await Promise.all(
    [annotatedPath, ...eyeCropPaths].map((path) => readFile(path).then((bytes) => bytes.toString('base64'))),
  );
  return askVision({
    schema: VERIFY_SCHEMA,
    system: [
      'You are a literal localization inspector. Return only JSON matching the schema.',
      'Image 1 is Enki\'s face with two white bounding boxes. Images 2 and 3 are enlarged crops from those boxes.',
      'Approve only if BOTH boxes are on the two actual human eye openings/eyelids.',
      'Reject boxes on the horned crown, headdress, forehead, eyebrows, decorative marks, hair, nose, or other regions.',
      'boxesTooBroad is true if either box contains substantially more than the eye opening and immediate eyelid.',
    ].join(' '),
    user: 'Verify that both white boxes literally enclose Enki\'s two actual eyes and not his headdress or another feature.',
    images,
  });
}

async function askVision({ schema, system, user, images }) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: VISION_MODEL,
      stream: false,
      think: false,
      keep_alive: process.env.OLLAMA_KEEP_ALIVE ?? '10m',
      format: schema,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user, images },
      ],
      options: { temperature: 0.05 },
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error(`Ollama grounding request returned HTTP ${response.status}: ${await response.text()}`);
  const payload = await response.json();
  if (!payload.message?.content) throw new Error('Ollama returned no grounding content.');
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

function cropPng(inputPath, outputPath, crop) {
  runFfmpeg([
    '-y', '-hide_banner', '-loglevel', 'error', '-i', inputPath,
    '-vf', `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`,
    '-frames:v', '1', '-update', '1', outputPath,
  ]);
}

function drawBoxes(inputPath, outputPath, boxes) {
  const filters = boxes.map((box) =>
    `drawbox=x=${box.x}:y=${box.y}:w=${box.width}:h=${box.height}:color=white@0.95:t=3`,
  ).join(',');
  runFfmpeg([
    '-y', '-hide_banner', '-loglevel', 'error', '-i', inputPath,
    '-vf', filters,
    '-frames:v', '1', '-update', '1', outputPath,
  ]);
}

function makeContactSheet(paths, outputPath) {
  const args = ['-y', '-hide_banner', '-loglevel', 'error'];
  for (const path of paths) args.push('-i', path);
  const filters = paths.map((_, index) =>
    `[${index}:v]scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2:color=white[p${index}]`,
  );
  filters.push('[p0][p1][p2][p3]xstack=inputs=4:layout=0_0|640_0|0_360|640_360[out]');
  args.push('-filter_complex', filters.join(';'), '-map', '[out]', '-frames:v', '1', '-update', '1', outputPath);
  runFfmpeg(args);
}

function readPngDimensions(bytes, label) {
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
    throw new Error(`${label} is not a PNG.`);
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function runFfmpeg(args) {
  const result = spawnSync(FFMPEG, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.stderr || result.stdout || 'unknown error'}`);
}
