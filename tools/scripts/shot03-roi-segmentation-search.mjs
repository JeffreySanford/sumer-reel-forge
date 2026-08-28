import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { runManagedOllamaVisionChat } from '../runtime/ollama-vision-task.mjs';
import { maybeOpenReviewArtifacts } from './open-review-artifacts.mjs';
import { reviewGeneratedMedia } from './review-generated-media.mjs';

const ROOT = resolve('.');
const SOURCE_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-03.png',
);
const MANIFEST_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const WORK_ROOT = resolve('tmp/animation-assets/resegmentation/shot03-roi-search');
const CANDIDATE_ROOT = resolve('tmp/animation-assets/candidates/shot03-roi-search');
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const SOURCE_WIDTH = 941;
const SOURCE_HEIGHT = 1672;
const STRONG_ALPHA = 128;
const DEFAULT_THRESHOLD = 0.25;
const DEFAULT_PADDINGS = [0.15, 0.3, 0.5];
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL ?? 'qwen3-vl:4b-instruct';
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '');
const COMFY_BASE_URL = (process.env.COMFYUI_BASE_URL ?? 'http://127.0.0.1:8188').replace(/\/$/, '');
const TIMEOUT_MS = positiveInteger(process.env.PLANNING_TIMEOUT_MS, 300_000);

const TARGETS = Object.freeze({
  vessel: Object.freeze({
    key: 'vessel',
    layerId: 'shot03-vessel-v1',
    prompt:
      'complete visible reed boat vessel only, including the full connected hull, prow, stern, gunwales and vessel body; exclude Enki, water, sky, shoreline, rigging lines and unrelated reeds',
    locatorDescription:
      'the complete visible reed boat/vessel body, excluding the man and unrelated foreground rigging',
  }),
  enki: Object.freeze({
    key: 'enki',
    layerId: 'shot03-enki-body-v1',
    prompt:
      'complete visible Enki human figure only, including head, hair, beard, face, torso, shoulders, arms, hands, robe, belt and visible lower clothing; exclude boat, water, sky and foreground rigging',
    locatorDescription:
      'the complete visible Enki human figure, excluding the boat and foreground rigging',
  }),
});

const LOCATOR_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['targets'],
  properties: {
    targets: {
      type: 'array',
      minItems: 2,
      maxItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['target', 'found', 'confidence', 'bboxNormalized', 'notes'],
        properties: {
          target: { type: 'string', enum: ['vessel', 'enki'] },
          found: { type: 'boolean' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          bboxNormalized: {
            type: 'object',
            additionalProperties: false,
            required: ['xMin', 'yMin', 'xMax', 'yMax'],
            properties: {
              xMin: { type: 'number', minimum: 0, maximum: 1 },
              yMin: { type: 'number', minimum: 0, maximum: 1 },
              xMax: { type: 'number', minimum: 0, maximum: 1 },
              yMax: { type: 'number', minimum: 0, maximum: 1 },
            },
          },
          notes: { type: 'string' },
        },
      },
    },
  },
};

const command = process.argv[2] ?? 'preflight';
const options = parseOptions(process.argv.slice(3));

await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  if (!['preflight', 'generate'].includes(command)) {
    throw new Error('Use preflight or generate.');
  }

  const checks = await preflightChecks();
  printPreflight(checks);
  if (!checks.every((item) => item.ok)) {
    process.exitCode = 2;
    return;
  }
  if (command === 'preflight') {
    console.log('');
    console.log('[NEXT] node tools/scripts/shot03-roi-segmentation-search.mjs generate');
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const workDirectory = join(WORK_ROOT, stamp);
  const candidateDirectory = join(CANDIDATE_ROOT, stamp);
  await Promise.all([
    mkdir(workDirectory, { recursive: true }),
    mkdir(candidateDirectory, { recursive: true }),
  ]);

  console.log('');
  console.log('Shot 3 ROI-constrained segmentation search');
  console.log(`Source: ${SOURCE_PATH}`);
  console.log(`Locator: Ollama ${VISION_MODEL}`);
  console.log(`Targets: ${options.targets.map((item) => item.key).join(', ')}`);
  console.log(`SAM threshold: ${options.threshold.toFixed(2)}`);
  console.log(`ROI paddings: ${options.paddings.map((item) => item.toFixed(2)).join(', ')}`);
  console.log('Policy: all crops/candidates remain under tmp/; canonical assets and manifest are never mutated.');

  const locator = await locateSubjects();
  const locatorPath = join(workDirectory, 'ollama-roi-locator.json');
  await writeFile(locatorPath, `${JSON.stringify(locator, null, 2)}\n`, 'utf8');
  console.log('');
  console.log('[LOCATOR]');
  for (const item of locator.targets) {
    console.log(
      `  ${item.target}: confidence ${(item.confidence * 100).toFixed(0)}% · normalized ${formatNormalizedBox(item.bboxNormalized)} · pixels ${formatBbox(item.bboxPixels)}`,
    );
  }

  const canonical = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const results = [];
  let variantIndex = 0;
  for (const target of options.targets) {
    const located = locator.targets.find((item) => item.target === target.key);
    if (!located?.found) {
      throw new Error(`Ollama could not locate ${target.key} in Shot 3.`);
    }
    for (const padding of options.paddings) {
      variantIndex += 1;
      const roi = expandBbox(located.bboxPixels, padding, SOURCE_WIDTH, SOURCE_HEIGHT);
      const variant = `${target.key}-pad-${padding.toFixed(2).replace('.', 'p')}`;
      const variantDirectory = join(workDirectory, variant);
      const sourceAssetRoot = join(variantDirectory, 'source-assets');
      const cropName = `${variant}-source.png`;
      const cropPath = join(sourceAssetRoot, cropName);
      const outputRoot = join(candidateDirectory, variant);
      await Promise.all([
        mkdir(sourceAssetRoot, { recursive: true }),
        mkdir(outputRoot, { recursive: true }),
      ]);

      cropSource(SOURCE_PATH, cropPath, roi);
      const manifest = buildTemporaryManifest(canonical, target, cropName);
      const manifestPath = join(variantDirectory, 'temporary-animation-manifest.json');
      const workflowPath = join(variantDirectory, 'roi-sam3-workflow.json');
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
      await writeFile(
        workflowPath,
        `${JSON.stringify(buildWorkflow(target, options.threshold), null, 2)}\n`,
        'utf8',
      );

      console.log('');
      console.log(
        `[${variantIndex}/${options.targets.length * options.paddings.length}] ${target.key} padding=${padding.toFixed(2)} · ROI ${formatBbox(roi)}`,
      );
      runCandidateGeneration({
        manifestPath,
        assetRoot: sourceAssetRoot,
        workflowPath,
        outputRoot,
        layerId: target.layerId,
      });

      const cropCandidatePath = join(outputRoot, 'shot-03', `${target.layerId}.png`);
      if (!existsSync(cropCandidatePath)) {
        throw new Error(`Expected ROI candidate was not produced: ${cropCandidatePath}`);
      }
      const registeredPath = join(variantDirectory, `${variant}-registered.png`);
      registerCandidate(cropCandidatePath, registeredPath, roi);

      const cropAnalysis = analyzeAlpha(cropCandidatePath, roi.width, roi.height);
      const registeredAnalysis = analyzeAlpha(registeredPath, SOURCE_WIDTH, SOURCE_HEIGHT);
      const risk = structuralRisk({
        largestShare: registeredAnalysis.largestComponentShare,
        significantCount: registeredAnalysis.significantComponentCount,
        touchesFrameEdge: registeredAnalysis.largestTouchesEdge,
        touchesCropEdge: cropAnalysis.anyStrongTouchesEdge,
      });
      const score = structuralScore({
        risk,
        largestShare: registeredAnalysis.largestComponentShare,
        significantCount: registeredAnalysis.significantComponentCount,
        touchesCropEdge: cropAnalysis.anyStrongTouchesEdge,
      });
      const result = {
        target: target.key,
        layerId: target.layerId,
        padding,
        threshold: options.threshold,
        locatorConfidence: located.confidence,
        roi,
        cropPath,
        cropCandidatePath,
        registeredPath,
        cropAnalysis,
        registeredAnalysis,
        structuralRisk: risk,
        structuralScore: score,
      };
      results.push(result);
      console.log(
        `  [RESULT] ${risk} · largest ${(registeredAnalysis.largestComponentShare * 100).toFixed(2)}% · significant ${registeredAnalysis.significantComponentCount} · crop-edge ${cropAnalysis.anyStrongTouchesEdge ? 'YES' : 'no'} · registered bbox ${formatBbox(registeredAnalysis.largestComponentBbox)}`,
      );
    }
  }

  const ranked = rankResults(results);
  const contactSheetPath = join(workDirectory, 'shot03-roi-search-alpha-contact-sheet.png');
  createAlphaContactSheet(results, contactSheetPath);
  console.log('');
  console.log('[RANKING]');
  for (const target of options.targets) {
    console.log(`  ${target.key}:`);
    for (const item of ranked[target.key] ?? []) {
      console.log(
        `    pad=${item.padding.toFixed(2)} · ${item.structuralRisk} · score ${item.structuralScore.toFixed(2)} · largest ${(item.registeredAnalysis.largestComponentShare * 100).toFixed(2)}% · significant ${item.registeredAnalysis.significantComponentCount} · crop-edge ${item.cropAnalysis.anyStrongTouchesEdge ? 'YES' : 'no'}`,
      );
    }
  }

  const reportPath = join(workDirectory, 'shot03-roi-segmentation-search.json');
  const report = {
    schemaVersion: 1,
    type: 'shot03-roi-segmentation-search',
    generatedAt: new Date().toISOString(),
    sourcePath: SOURCE_PATH,
    sourceDimensions: { width: SOURCE_WIDTH, height: SOURCE_HEIGHT },
    locator,
    samThreshold: options.threshold,
    paddings: options.paddings,
    results,
    ranked,
    artifacts: { alphaContactSheet: contactSheetPath },
    canonicalManifestMutated: false,
    canonicalAssetsMutated: false,
    automaticPromotionAllowed: false,
    humanReviewRequired: true,
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  let ai = null;
  if (options.aiReview) {
    const deterministicSummary = results.map((item) => ({
      target: item.target,
      padding: item.padding,
      structuralRisk: item.structuralRisk,
      largestComponentShare: item.registeredAnalysis.largestComponentShare,
      significantComponentCount: item.registeredAnalysis.significantComponentCount,
      cropEdgeTouch: item.cropAnalysis.anyStrongTouchesEdge,
      largestComponentBbox: item.registeredAnalysis.largestComponentBbox,
    }));
    const aiPath = join(workDirectory, 'ollama-roi-segmentation-review.json');
    ai = await reviewGeneratedMedia({
      artifacts: [
        { path: SOURCE_PATH, label: 'approved Shot 3 editorial source' },
        {
          path: contactSheetPath,
          label:
            'ROI segmentation alpha contact sheet; first row vessel padding variants, second row Enki padding variants; white is selected alpha',
        },
      ],
      task: [
        'Judge whether any ROI-constrained mask is a credible complete vessel or Enki silhouette suitable for later background removal and animation.',
        'The editorial source is the visual reference. The contact sheet contains alpha masks only: white is selected, black is transparent.',
        `Deterministic measurements: ${JSON.stringify(deterministicSummary)}`,
        'Do not speculate about nondeterminism, scaling, workflow wiring, model bugs, or root cause unless the deterministic evidence explicitly proves that claim.',
        'Report visible/structural defects only. PASS_ADVISORY means suitable for human review, never automatic promotion.',
      ].join(' '),
      rubric: [
        'complete coherent target silhouette',
        'minimal unrelated scene contamination',
        'no clipping against ROI boundary',
        'few substantial disconnected components',
        'visible assessment must agree with deterministic component evidence',
      ],
      outputPath: aiPath,
      requireAi: options.requireAiReview,
      maxVideoSamples: 1,
    });
    report.ai = ai;
    report.aiReviewPath = aiPath;
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  } else {
    console.log('[ai] final local media review skipped by --no-ai-review (Ollama localization was still required).');
  }

  const bestArtifacts = options.targets
    .map((target) => ranked[target.key]?.[0]?.registeredPath)
    .filter(Boolean);
  console.log('');
  console.log(`[REVIEW] alpha contact sheet: ${contactSheetPath}`);
  for (const path of bestArtifacts) console.log(`[REVIEW] top candidate: ${path}`);
  console.log(`[INFO] search report: ${reportPath}`);
  if (ai?.status) console.log(`[INFO] local vision status: ${ai.status}`);

  const survivors = results.filter((item) => item.structuralRisk !== 'HIGH');
  if (!survivors.length) {
    console.log('[STOP] No structural survivor. Do not rebuild the background or return to Pixi motion.');
  } else {
    console.log(`[NEXT] ${survivors.length} structural survivor(s) are eligible for human review; no candidate is promoted automatically.`);
  }
  await maybeOpenReviewArtifacts([contactSheetPath, ...bestArtifacts], { delayMs: 120 });
}

async function preflightChecks() {
  const checks = [];
  checks.push({
    name: 'Shot 3 editorial source',
    ok: existsSync(SOURCE_PATH),
    detail: SOURCE_PATH,
  });
  checks.push({
    name: 'Animation manifest',
    ok: existsSync(MANIFEST_PATH),
    detail: MANIFEST_PATH,
  });
  checks.push(commandCheck('FFmpeg', FFMPEG, ['-version']));
  checks.push(await httpCheck('ComfyUI', `${COMFY_BASE_URL}/system_stats`));
  checks.push(await ollamaModelCheck());
  return checks;
}

function printPreflight(checks) {
  console.log('Shot 3 ROI segmentation search preflight');
  for (const check of checks) {
    console.log(`${check.ok ? '[ok]' : '[blocked]'} ${check.name}: ${check.detail}`);
  }
}

async function locateSubjects() {
  const source = (await readFile(SOURCE_PATH)).toString('base64');
  const system = [
    'You are a precise bounding-box localizer for Sumer Reel Forge.',
    'Return only JSON conforming to the supplied schema.',
    'Do not segment, critique, redesign, or infer motion. Only localize the requested visible subjects.',
    'Coordinates must be normalized to the full image: 0 is left/top and 1 is right/bottom.',
    'Boxes should tightly contain the complete visible target while excluding unrelated neighboring scene content where possible.',
  ].join(' ');
  const user = {
    imageDimensions: { width: SOURCE_WIDTH, height: SOURCE_HEIGHT },
    targets: Object.values(TARGETS).map((target) => ({
      target: target.key,
      description: target.locatorDescription,
    })),
    instruction:
      'Return exactly one normalized bounding box for vessel and one for Enki. Include the complete visible target, even if partially occluded, but do not expand to the full frame.',
  };
  console.log('');
  console.log(`[ai] Localize vessel and Enki with ${VISION_MODEL}...`);
  const startedAt = Date.now();
  const payload = await runManagedOllamaVisionChat({
    owner: 'shot03-roi-segmentation-locator',
    task: 'shot-3-roi-segmentation-localization',
    baseUrl: OLLAMA_BASE_URL,
    model: VISION_MODEL,
    timeoutMs: TIMEOUT_MS,
    format: LOCATOR_SCHEMA,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(user, null, 2), images: [source] },
    ],
    options: { temperature: 0 },
    errorPrefix: 'Ollama ROI localization',
  });
  const content = payload.message?.content;
  if (!content) throw new Error('Ollama returned no ROI localization content.');
  const parsed = JSON.parse(content);
  assertLocator(parsed);
  const targets = parsed.targets.map((item) => ({
    ...item,
    bboxPixels: normalizedToPixels(item.bboxNormalized),
  }));
  console.log(`[ai] ROI localization complete in ${((Date.now() - startedAt) / 1000).toFixed(1)}s.`);
  return {
    provider: 'ollama',
    model: payload.model ?? VISION_MODEL,
    generatedAt: new Date().toISOString(),
    targets,
  };
}

function assertLocator(value) {
  if (!Array.isArray(value?.targets) || value.targets.length !== 2) {
    throw new Error('Ollama ROI locator must return exactly two targets.');
  }
  const names = new Set(value.targets.map((item) => item.target));
  if (!names.has('vessel') || !names.has('enki')) {
    throw new Error('Ollama ROI locator must return vessel and enki.');
  }
  for (const item of value.targets) {
    if (!item.found) throw new Error(`Ollama did not locate ${item.target}.`);
    const box = item.bboxNormalized;
    if (
      !box ||
      ![box.xMin, box.yMin, box.xMax, box.yMax].every(
        (number) => Number.isFinite(number) && number >= 0 && number <= 1,
      ) ||
      box.xMax <= box.xMin ||
      box.yMax <= box.yMin
    ) {
      throw new Error(`Ollama returned invalid normalized bounds for ${item.target}.`);
    }
    const area = (box.xMax - box.xMin) * (box.yMax - box.yMin);
    if (area > 0.8) {
      throw new Error(`Ollama ${item.target} box covers ${(area * 100).toFixed(1)}% of the frame; refusing near-full-frame ROI.`);
    }
  }
}

function normalizedToPixels(box) {
  const xMin = clamp(Math.floor(box.xMin * SOURCE_WIDTH), 0, SOURCE_WIDTH - 1);
  const yMin = clamp(Math.floor(box.yMin * SOURCE_HEIGHT), 0, SOURCE_HEIGHT - 1);
  const xMax = clamp(Math.ceil(box.xMax * SOURCE_WIDTH), xMin + 1, SOURCE_WIDTH);
  const yMax = clamp(Math.ceil(box.yMax * SOURCE_HEIGHT), yMin + 1, SOURCE_HEIGHT);
  return { x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin };
}

function expandBbox(box, padding, width, height) {
  const padX = Math.max(16, Math.round(box.width * padding));
  const padY = Math.max(16, Math.round(box.height * padding));
  const x = clamp(box.x - padX, 0, width - 1);
  const y = clamp(box.y - padY, 0, height - 1);
  const right = clamp(box.x + box.width + padX, x + 1, width);
  const bottom = clamp(box.y + box.height + padY, y + 1, height);
  return { x, y, width: right - x, height: bottom - y };
}

function cropSource(sourcePath, outputPath, roi) {
  runFfmpeg([
    '-i',
    sourcePath,
    '-vf',
    `crop=${roi.width}:${roi.height}:${roi.x}:${roi.y}`,
    '-frames:v',
    '1',
    outputPath,
  ]);
}

function registerCandidate(candidatePath, outputPath, roi) {
  runFfmpeg([
    '-f',
    'lavfi',
    '-i',
    `color=c=black@0.0:s=${SOURCE_WIDTH}x${SOURCE_HEIGHT}:d=1`,
    '-i',
    candidatePath,
    '-filter_complex',
    `[0:v]format=rgba,colorchannelmixer=aa=0[base];[1:v]format=rgba[fg];[base][fg]overlay=x=${roi.x}:y=${roi.y}:format=auto[out]`,
    '-map',
    '[out]',
    '-frames:v',
    '1',
    outputPath,
  ]);
}

function buildTemporaryManifest(canonical, target, cropName) {
  const manifest = structuredClone(canonical);
  const shot = manifest.shots?.find((item) => item.sourceShotNumber === 3);
  if (!shot) throw new Error('Shot 3 is missing from the animation manifest.');
  shot.sourceFrame = cropName;
  for (const layer of shot.layers ?? []) {
    if (layer.id !== target.layerId) continue;
    layer.state = 'pending';
    layer.review = {
      ...(layer.review ?? {}),
      status: 'pending-roi-segmentation-review',
      notes: [
        `Temporary ROI-search candidate for ${target.key}.`,
        'Canonical assets and manifest remain unchanged.',
      ],
    };
  }
  return manifest;
}

function buildWorkflow(target, threshold) {
  return {
    '1': {
      inputs: { image: '{{SOURCE_IMAGE}}' },
      class_type: 'LoadImage',
      _meta: { title: `Shot 3 ${target.key} ROI source` },
    },
    '2': {
      inputs: { ckpt_name: 'sam3.1_multiplex_fp16.safetensors' },
      class_type: 'CheckpointLoaderSimple',
      _meta: { title: 'SAM 3.1 Multiplex FP16' },
    },
    '3': {
      inputs: { text: target.prompt, clip: ['2', 1] },
      class_type: 'CLIPTextEncode',
      _meta: { title: `ROI-only ${target.key} query`, source_contract: '{{LAYER_PROMPT}}' },
    },
    '4': {
      inputs: {
        model: ['2', 0],
        image: ['1', 0],
        conditioning: ['3', 0],
        threshold,
        refine_iterations: 4,
        individual_masks: false,
      },
      class_type: 'SAM3_Detect',
      _meta: { title: `Segment ${target.key} inside constrained ROI` },
    },
    '5': {
      inputs: { image: ['1', 0], alpha: ['4', 0] },
      class_type: 'JoinImageWithAlpha',
      _meta: { title: `Preserve ROI source pixels under ${target.key} alpha` },
    },
    '6': {
      inputs: { filename_prefix: '{{OUTPUT_PREFIX}}', images: ['5', 0] },
      class_type: 'SaveImage',
      _meta: { title: `Save ${target.key} ROI candidate` },
    },
  };
}

function runCandidateGeneration({ manifestPath, assetRoot, workflowPath, outputRoot, layerId }) {
  const result = spawnSync(
    process.execPath,
    [
      resolve('tools/scripts/animation-layer-candidates.mjs'),
      'generate',
      `--manifest=${manifestPath}`,
      `--asset-root=${assetRoot}`,
      '--shot=3',
      `--layer=${layerId}`,
      `--workflow=${workflowPath}`,
      `--output=${outputRoot}`,
    ],
    {
      cwd: ROOT,
      env: process.env,
      stdio: 'inherit',
      windowsHide: true,
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ROI candidate generation failed for ${layerId} with exit ${result.status}.`);
  }
}

function analyzeAlpha(path, width, height) {
  const pixels = width * height;
  const decoded = spawnSync(
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
    {
      cwd: ROOT,
      encoding: null,
      maxBuffer: Math.max(32 * 1024 * 1024, pixels * 4 + 1024),
      windowsHide: true,
      shell: false,
    },
  );
  if (decoded.error) throw decoded.error;
  if (decoded.status !== 0) {
    throw new Error(`ffmpeg could not decode ${path}: ${String(decoded.stderr ?? '').trim()}`);
  }
  if (!Buffer.isBuffer(decoded.stdout) || decoded.stdout.length !== pixels * 4) {
    throw new Error(`${path} decoded to ${decoded.stdout?.length ?? 0} bytes; expected ${pixels * 4}.`);
  }
  const alpha = new Uint8Array(pixels);
  let strongAlphaPixels = 0;
  let anyStrongTouchesEdge = false;
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const value = decoded.stdout[pixel * 4 + 3];
    alpha[pixel] = value;
    if (value <= STRONG_ALPHA) continue;
    strongAlphaPixels += 1;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
      anyStrongTouchesEdge = true;
    }
  }

  const components = connectedComponents(alpha, width, height);
  const significantFloor = Math.max(50, strongAlphaPixels * 0.001);
  const significant = components.filter((item) => item.pixels >= significantFloor);
  const largest = components[0] ?? null;
  const second = components[1] ?? null;
  const largestArea = largest ? largest.bbox.width * largest.bbox.height : 0;
  return {
    width,
    height,
    strongAlphaPixels,
    strongCoverage: pixels ? strongAlphaPixels / pixels : 0,
    componentCount: components.length,
    significantComponentCount: significant.length,
    largestComponentPixels: largest?.pixels ?? 0,
    largestComponentShare: strongAlphaPixels && largest ? largest.pixels / strongAlphaPixels : 0,
    secondComponentShare: strongAlphaPixels && second ? second.pixels / strongAlphaPixels : 0,
    largestComponentBbox: largest?.bbox ?? null,
    largestComponentBboxFill: largestArea && largest ? largest.pixels / largestArea : 0,
    largestTouchesEdge: Boolean(largest?.touchesEdge),
    anyStrongTouchesEdge,
    topComponents: components.slice(0, 10),
  };
}

function connectedComponents(alpha, width, height) {
  const pixels = width * height;
  const visited = new Uint8Array(pixels);
  const stack = new Int32Array(pixels);
  const components = [];
  for (let seed = 0; seed < pixels; seed += 1) {
    if (visited[seed] || alpha[seed] <= STRONG_ALPHA) continue;
    let top = 0;
    stack[top++] = seed;
    visited[seed] = 1;
    let count = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let touchesEdge = false;
    while (top > 0) {
      const index = stack[--top];
      count += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) touchesEdge = true;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const neighbor = ny * width + nx;
          if (visited[neighbor] || alpha[neighbor] <= STRONG_ALPHA) continue;
          visited[neighbor] = 1;
          stack[top++] = neighbor;
        }
      }
    }
    components.push({
      pixels: count,
      bbox: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
      touchesEdge,
    });
  }
  components.sort((a, b) => b.pixels - a.pixels);
  return components;
}

function structuralRisk({ largestShare, significantCount, touchesFrameEdge, touchesCropEdge }) {
  if (!touchesFrameEdge && !touchesCropEdge && largestShare >= 0.9 && significantCount <= 4) return 'LOW';
  if (!touchesFrameEdge && largestShare >= 0.75 && significantCount <= 8) return 'MEDIUM';
  return 'HIGH';
}

function structuralScore({ risk, largestShare, significantCount, touchesCropEdge }) {
  const riskPenalty = { LOW: 0, MEDIUM: 100, HIGH: 200 }[risk] ?? 300;
  return riskPenalty + (touchesCropEdge ? 60 : 0) + (1 - largestShare) * 50 + significantCount * 2;
}

function rankResults(results) {
  const ranked = {};
  for (const target of [...new Set(results.map((item) => item.target))]) {
    ranked[target] = results
      .filter((item) => item.target === target)
      .sort((a, b) => a.structuralScore - b.structuralScore);
  }
  return ranked;
}

function createAlphaContactSheet(results, outputPath) {
  const ordered = [...results].sort((a, b) => {
    if (a.target !== b.target) return a.target === 'vessel' ? -1 : 1;
    return a.padding - b.padding;
  });
  if (![3, 6].includes(ordered.length)) {
    console.warn(`[WARN] Contact sheet supports 3 or 6 candidates; found ${ordered.length}.`);
    return;
  }
  const args = ['-y', '-hide_banner', '-loglevel', 'error'];
  for (const item of ordered) args.push('-i', item.registeredPath);
  const filters = [];
  for (let index = 0; index < ordered.length; index += 1) {
    filters.push(`[${index}:v]alphaextract,scale=282:502:flags=neighbor,format=gray[m${index}]`);
  }
  filters.push('[m0][m1][m2]hstack=inputs=3[row0]');
  if (ordered.length === 6) {
    filters.push('[m3][m4][m5]hstack=inputs=3[row1]');
    filters.push('[row0][row1]vstack=inputs=2[sheet]');
  } else {
    filters.push('[row0]null[sheet]');
  }
  args.push('-filter_complex', filters.join(';'), '-map', '[sheet]', '-frames:v', '1', outputPath);
  const result = spawnSync(FFMPEG, args, {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg could not create ROI contact sheet: ${String(result.stderr ?? '').trim()}`);
  }
}

function runFfmpeg(args) {
  const result = spawnSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`FFmpeg failed with exit ${result.status ?? 'unknown'}: ${result.stderr || result.stdout}`);
  }
}

function commandCheck(name, commandName, args) {
  const result = spawnSync(commandName, args, {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
    shell: false,
  });
  return {
    name,
    ok: !result.error && result.status === 0,
    detail: result.error ? result.error.message : commandName,
  };
}

async function httpCheck(name, url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    return { name, ok: response.ok, detail: response.ok ? url : `HTTP ${response.status}` };
  } catch (error) {
    return { name, ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

async function ollamaModelCheck() {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return { name: 'Ollama vision model', ok: false, detail: `HTTP ${response.status}` };
    const payload = await response.json();
    const models = (payload.models ?? []).map((item) => item.name ?? item.model).filter(Boolean);
    return {
      name: 'Ollama vision model',
      ok: models.includes(VISION_MODEL),
      detail: models.includes(VISION_MODEL)
        ? `${VISION_MODEL} @ ${OLLAMA_BASE_URL}`
        : `${VISION_MODEL} is not installed; available: ${models.join(', ') || '<none>'}`,
    };
  } catch (error) {
    return {
      name: 'Ollama vision model',
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function parseOptions(args) {
  const result = {
    targets: [TARGETS.vessel, TARGETS.enki],
    paddings: [...DEFAULT_PADDINGS],
    threshold: DEFAULT_THRESHOLD,
    aiReview: true,
    requireAiReview: false,
  };
  for (const arg of args) {
    if (arg === '--no-open') continue;
    if (arg === '--no-ai-review') {
      result.aiReview = false;
      continue;
    }
    if (arg === '--require-ai-review') {
      result.requireAiReview = true;
      continue;
    }
    if (arg.startsWith('--layer=')) {
      const value = arg.slice('--layer='.length);
      if (value === 'both') result.targets = [TARGETS.vessel, TARGETS.enki];
      else if (TARGETS[value]) result.targets = [TARGETS[value]];
      else throw new Error('--layer must be vessel, enki, or both.');
      continue;
    }
    if (arg.startsWith('--threshold=')) {
      const value = Number(arg.slice('--threshold='.length));
      if (!Number.isFinite(value) || value <= 0 || value >= 1) {
        throw new Error('--threshold must be between 0 and 1.');
      }
      result.threshold = value;
      continue;
    }
    if (arg.startsWith('--paddings=')) {
      const values = arg
        .slice('--paddings='.length)
        .split(',')
        .map((item) => Number(item.trim()));
      if (!values.length || values.some((item) => !Number.isFinite(item) || item < 0 || item > 1)) {
        throw new Error('--paddings must be comma-separated numbers between 0 and 1.');
      }
      result.paddings = values;
      continue;
    }
    throw new Error(`Unknown option ${arg}`);
  }
  return result;
}

function formatNormalizedBox(box) {
  return `${box.xMin.toFixed(3)},${box.yMin.toFixed(3)} -> ${box.xMax.toFixed(3)},${box.yMax.toFixed(3)}`;
}

function formatBbox(box) {
  return box ? `${box.x},${box.y} ${box.width}x${box.height}` : '<none>';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
