import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import {
  analyzeRenderedEyeBoxes,
  mapSourceEyeBoxesToRender,
} from '../animation/src/level2-eye-artifact-leak-proof.mjs';
import { evaluateRenderedBlinkVerdict } from '../animation/src/level2-rendered-blink-verdict.mjs';

const PREVIEW_ROOT = resolve('tmp/animation-previews/shot03-level2-preview');
const TARGET_LAYER_ID = 'shot03-enki-eyes-v1';
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL ?? 'qwen3-vl:4b-instruct';

const RENDERED_BLINK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'naturalBlinkVisible',
    'closedFrameIndexes',
    'cyanPatchVisible',
    'flatMaskLeakVisible',
    'bothEyesCloseTogether',
    'returnsOpen',
    'confidence',
    'summary',
  ],
  properties: {
    naturalBlinkVisible: { type: 'boolean' },
    closedFrameIndexes: { type: 'array', items: { type: 'integer', minimum: 0 } },
    cyanPatchVisible: { type: 'boolean' },
    flatMaskLeakVisible: { type: 'boolean' },
    bothEyesCloseTogether: { type: 'boolean' },
    returnsOpen: { type: 'boolean' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    summary: { type: 'string' },
  },
};

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const previewDirectory = await resolvePreviewDirectory(process.argv.slice(2));
  const manifestPath = join(previewDirectory, 'preview-manifest.json');
  const propsPath = join(previewDirectory, 'scene-v2-level2-props.json');
  const [previewManifest, props] = await Promise.all([
    readFile(manifestPath, 'utf8').then(JSON.parse),
    readFile(propsPath, 'utf8').then(JSON.parse),
  ]);

  const candidateRecord = (previewManifest.candidates ?? []).find(
    (item) => item.layerId === TARGET_LAYER_ID,
  );
  if (!candidateRecord) throw new Error('Preview manifest does not contain the Shot 3 eye candidate.');
  const candidateRunPath = join(candidateRecord.candidateRunDirectory, 'candidate-run.json');
  const candidateRun = JSON.parse(await readFile(candidateRunPath, 'utf8'));
  const candidate = (candidateRun.candidates ?? []).find(
    (item) => item.layerId === TARGET_LAYER_ID || item.replacementForLayerId === TARGET_LAYER_ID,
  );
  if (!candidate?.candidatePath || !Array.isArray(candidate.groundedEyeBoxes)) {
    throw new Error('Rendered blink proof requires a grounded eye candidate with two verified source eye boxes.');
  }

  const shot = props.scene?.shots?.find((item) => item.sourceShotNumber === 3);
  if (!shot) throw new Error('Resolved render props do not contain Shot 3.');
  const resolvedLayer = shot.layers?.find(
    (item) => item.assetId === TARGET_LAYER_ID || item.id === TARGET_LAYER_ID,
  );
  if (!resolvedLayer?.assetPath) throw new Error('Resolved Shot 3 props do not contain the eye layer assetPath.');
  const stagedPath = join(previewDirectory, 'public', resolvedLayer.assetPath);
  await access(stagedPath);

  const [selectedBytes, stagedBytes] = await Promise.all([
    readFile(candidate.candidatePath),
    readFile(stagedPath),
  ]);
  const selectedChecksum = prefixedSha(selectedBytes);
  const stagedChecksum = prefixedSha(stagedBytes);
  const previewChecksum = normalizeSha(candidateRecord.candidateChecksum);
  if (normalizeSha(selectedChecksum) !== normalizeSha(stagedChecksum)) {
    throw new Error(`Staged eye asset checksum mismatch: source ${selectedChecksum}, staged ${stagedChecksum}.`);
  }
  if (previewChecksum && previewChecksum !== normalizeSha(selectedChecksum)) {
    throw new Error(
      `Preview manifest eye checksum ${candidateRecord.candidateChecksum} does not match selected candidate ${selectedChecksum}.`,
    );
  }

  console.log('Shot 3 rendered blink proof');
  console.log(`[trace] selected candidate source: ${candidate.candidatePath}`);
  console.log(`[trace] selected candidate checksum: ${selectedChecksum}`);
  console.log(`[trace] staged public eye asset: ${stagedPath}`);
  console.log(`[trace] staged public checksum: ${stagedChecksum}`);
  console.log(`[trace] resolved Scene V2 assetPath: ${resolvedLayer.assetPath}`);
  console.log('[ok] candidate source, staged bytes, and resolved composition asset are checksum-bound.');

  const videoPath = previewManifest.output?.path;
  if (!videoPath) throw new Error('Preview manifest does not declare rendered video path.');
  await access(videoPath);
  const renderDimensions = {
    width: Number(previewManifest.renderCanvas?.width),
    height: Number(previewManifest.renderCanvas?.height),
  };
  const sourceDimensions = candidateRecord.dimensions;
  const fps = Number(previewManifest.renderCanvas?.fps ?? props.scene?.fps ?? 30);
  const durationFrames = Number(previewManifest.renderCanvas?.durationFrames ?? props.scene?.durationFrames);
  const blink = shot.performance?.find((item) => item.preset === 'blinkOnce' && item.enabled !== false);
  if (!blink) throw new Error('Resolved Shot 3 composition has no enabled blinkOnce performance.');
  const blinkStartFrame = clampInt(Math.round(blink.startProgress * Math.max(0, durationFrames - 1)), 0, durationFrames - 1);
  const blinkEndFrame = clampInt(Math.round(blink.endProgress * Math.max(0, durationFrames - 1)), 0, durationFrames - 1);
  const blinkMidFrame = Math.round((blinkStartFrame + blinkEndFrame) / 2);
  const sampleFrames = uniqueSorted([
    blinkStartFrame - 4,
    blinkStartFrame,
    blinkStartFrame + 2,
    blinkMidFrame,
    blinkEndFrame - 2,
    blinkEndFrame,
    blinkEndFrame + 4,
  ].map((frame) => clampInt(frame, 0, durationFrames - 1)));

  const mappedEyeBoxes = mapSourceEyeBoxesToRender({
    eyeBoxes: candidate.groundedEyeBoxes,
    sourceDimensions,
    renderDimensions,
    padRatio: 0.28,
  });
  console.log(
    `[trace] rendered eye boxes: ${mappedEyeBoxes.map((box) => `${box.x},${box.y} ${box.width}x${box.height}`).join(' | ')}`,
  );
  console.log(`[trace] blink window: frames ${blinkStartFrame}-${blinkEndFrame}; sampled ${sampleFrames.join(', ')}`);

  const proofDirectory = join(previewDirectory, 'rendered-blink-proof');
  await mkdir(proofDirectory, { recursive: true });
  const evidenceCrop = paddedUnion(mappedEyeBoxes, renderDimensions, 1.1);
  const frames = [];
  for (const frame of sampleFrames) {
    const framePath = join(proofDirectory, `frame-${String(frame).padStart(4, '0')}.png`);
    const cropPath = join(proofDirectory, `eye-crop-${String(frame).padStart(4, '0')}.png`);
    extractFrame(videoPath, framePath, frame, fps);
    const rgba = decodeRgba(framePath, renderDimensions);
    const appearance = analyzeRenderedEyeBoxes({
      rgba,
      dimensions: renderDimensions,
      eyeBoxes: mappedEyeBoxes,
    });
    cropAndUpscale(framePath, cropPath, evidenceCrop, 4);
    frames.push({
      frame,
      activeBlink: frame >= blinkStartFrame && frame <= blinkEndFrame,
      framePath,
      cropPath,
      appearance,
    });
    console.log(
      `[${appearance.pass ? 'ok' : 'BLOCKED'}] frame ${frame}${frame >= blinkStartFrame && frame <= blinkEndFrame ? ' [blink]' : ''}: cyan ${(appearance.metrics.cyanLikeRatio * 100).toFixed(1)}% · dominant ${(appearance.metrics.dominantQuantizedRatio * 100).toFixed(1)}% · texture Δ ${appearance.metrics.meanNeighborDelta.toFixed(1)}`,
    );
  }

  const contactSheetPath = join(proofDirectory, 'rendered-blink-window-contact-sheet.png');
  makeContactSheet(frames.map((item) => item.cropPath), contactSheetPath);
  const semanticReview = await reviewRenderedBlink(frames);
  const verdict = evaluateRenderedBlinkVerdict({ frameAnalyses: frames, semanticReview });
  const reportPath = join(proofDirectory, 'rendered-blink-proof.json');
  const report = {
    schemaVersion: 1,
    type: 'shot03-rendered-blink-artifact-proof',
    generatedAt: new Date().toISOString(),
    previewDirectory,
    videoPath,
    assetTrace: {
      selectedCandidatePath: candidate.candidatePath,
      selectedCandidateChecksum: selectedChecksum,
      stagedPath,
      stagedChecksum,
      resolvedAssetPath: resolvedLayer.assetPath,
      checksumBound: true,
    },
    grounding: {
      reportPath: candidate.groundingReportPath ?? null,
      reportChecksum: candidate.groundingReportChecksum ?? null,
      sourceEyeBoxes: candidate.groundedEyeBoxes,
      renderedEyeBoxes: mappedEyeBoxes,
    },
    blinkWindow: { startFrame: blinkStartFrame, endFrame: blinkEndFrame, sampleFrames },
    frames,
    semanticReview,
    verdict,
    contactSheetPath,
    canonicalMutated: false,
    humanReviewRequired: true,
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`[${verdict.pass ? 'PASS' : 'BLOCKED'}] rendered semantic review: ${semanticReview.summary}`);
  console.log(`[info] rendered blink contact sheet: ${contactSheetPath}`);
  console.log(`[info] rendered blink report: ${reportPath}`);
  if (!verdict.pass) {
    for (const failure of verdict.failures) console.log(`[BLOCKED] ${failure}`);
    console.log('STATUS: RENDERED BLINK BLOCKED — do not promote this eye state.');
    process.exitCode = 2;
    return;
  }
  console.log('STATUS: RENDERED BLINK PROOF PASS — normal-speed HUMAN review is still required before promotion.');
}

async function reviewRenderedBlink(frames) {
  const images = await Promise.all(
    frames.map((item) => readFile(item.cropPath).then((bytes) => bytes.toString('base64'))),
  );
  const system = [
    'You are a literal rendered-animation inspector. Return only JSON matching the schema.',
    'The images are chronological close-ups from the actual rendered Shot 3 MP4 around one intended blink.',
    'A valid blink must visibly transition from open eyes to both eyelids physically shut and then back to the original open-eye appearance.',
    'A cyan/light-blue/gray opaque patch over the eyes is NOT a blink. A rectangular, flat, mask-like, proof-like, or debug-colored eye overlay is a hard failure.',
    'closedFrameIndexes must contain the zero-based IMAGE INDEXES in this supplied sequence that visibly show both eyes closed. Do not report source video frame numbers.',
  ].join(' ');
  const user = JSON.stringify({
    task: 'Judge the actual rendered blink sequence. Require at least one literal both-eyes-closed frame and reject any cyan or flat mask overlay.',
    imageOrder: frames.map((item, index) => ({
      imageIndex: index,
      sourceVideoFrame: item.frame,
      intendedBlinkActive: item.activeBlink,
    })),
  });
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: VISION_MODEL,
      stream: false,
      think: false,
      keep_alive: process.env.OLLAMA_KEEP_ALIVE ?? '10m',
      format: RENDERED_BLINK_SCHEMA,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user, images },
      ],
      options: { temperature: 0.02 },
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) {
    throw new Error(`Ollama rendered-blink review returned HTTP ${response.status}: ${await response.text()}`);
  }
  const payload = await response.json();
  if (!payload.message?.content) throw new Error('Ollama returned no rendered-blink review content.');
  return JSON.parse(payload.message.content);
}

async function resolvePreviewDirectory(args) {
  const explicit = args.find((arg) => arg.startsWith('--preview-dir='));
  if (explicit) return resolve(explicit.slice('--preview-dir='.length));
  const entries = await readdir(PREVIEW_ROOT, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(PREVIEW_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  for (const directory of directories) {
    try {
      await Promise.all([
        access(join(directory, 'preview-manifest.json')),
        access(join(directory, 'scene-v2-level2-props.json')),
        access(join(directory, 'shot03-level2-candidate-preview.mp4')),
      ]);
      return directory;
    } catch {
      continue;
    }
  }
  throw new Error('No complete Shot 3 Level 2 preview directory exists.');
}

function extractFrame(videoPath, outputPath, frame, fps) {
  runFfmpeg([
    '-y', '-hide_banner', '-loglevel', 'error',
    '-ss', (frame / fps).toFixed(6), '-i', videoPath,
    '-frames:v', '1', '-update', '1', outputPath,
  ]);
}

function cropAndUpscale(inputPath, outputPath, crop, scale) {
  runFfmpeg([
    '-y', '-hide_banner', '-loglevel', 'error', '-i', inputPath,
    '-vf', `crop=${crop.width}:${crop.height}:${crop.x}:${crop.y},scale=iw*${scale}:ih*${scale}:flags=neighbor`,
    '-frames:v', '1', '-update', '1', outputPath,
  ]);
}

function makeContactSheet(paths, outputPath) {
  const inputs = paths.flatMap((path) => ['-i', path]);
  const filters = paths.map((_path, index) => `[${index}:v]scale=-2:360:flags=lanczos[p${index}]`).join(';');
  const stack = paths.map((_path, index) => `[p${index}]`).join('');
  runFfmpeg([
    '-y', '-hide_banner', '-loglevel', 'error', ...inputs,
    '-filter_complex', `${filters};${stack}hstack=inputs=${paths.length}[out]`,
    '-map', '[out]', '-frames:v', '1', '-update', '1', outputPath,
  ]);
}

function decodeRgba(path, dimensions) {
  const result = spawnSync(
    FFMPEG,
    ['-hide_banner', '-loglevel', 'error', '-i', path, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'],
    { encoding: null, maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Could not decode ${path}.`);
  const expected = dimensions.width * dimensions.height * 4;
  if (result.stdout.length !== expected) {
    throw new Error(`Decoded ${path} to ${result.stdout.length} bytes; expected ${expected}.`);
  }
  return new Uint8Array(result.stdout);
}

function paddedUnion(boxes, dimensions, paddingScale) {
  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));
  const width = maxX - minX;
  const height = maxY - minY;
  const padX = Math.round(width * paddingScale);
  const padY = Math.round(height * paddingScale);
  const x = Math.max(0, minX - padX);
  const y = Math.max(0, minY - padY);
  const x1 = Math.min(dimensions.width, maxX + padX);
  const y1 = Math.min(dimensions.height, maxY + padY);
  return { x, y, width: x1 - x, height: y1 - y };
}

function runFfmpeg(args) {
  const result = spawnSync(FFMPEG, args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.stderr || result.stdout}`);
}

function prefixedSha(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function normalizeSha(value) {
  return String(value ?? '').replace(/^sha256:/i, '').toLowerCase();
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a - b);
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
