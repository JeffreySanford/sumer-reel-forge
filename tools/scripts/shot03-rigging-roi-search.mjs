import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { evaluateRiggingRoiCandidate } from '../animation/src/rigging-roi-structure.mjs';
import { runManagedOllamaVisionChat } from '../runtime/ollama-vision-task.mjs';
import { maybeOpenReviewArtifacts } from './open-review-artifacts.mjs';
import { reviewGeneratedMedia } from './review-generated-media.mjs';

try {
  process.loadEnvFile?.();
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const ROOT = resolve('.');
const SOURCE_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-03.png',
);
const MANIFEST_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const WORK_ROOT = resolve(
  'tmp/animation-assets/resegmentation/shot03-rigging-roi-search',
);
const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/shot03-rigging-roi-search',
);
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const SOURCE_WIDTH = 941;
const SOURCE_HEIGHT = 1672;
const STRONG_ALPHA = 128;
const LAYER_ID = 'shot03-rigging-v1';
const DEFAULT_THRESHOLD = 0.25;
const DEFAULT_PADDINGS = [0.15, 0.3, 0.5];
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL ?? 'qwen3-vl:4b-instruct';
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '');
const COMFY_BASE_URL = (process.env.COMFYUI_BASE_URL ?? 'http://127.0.0.1:8188').replace(/\/$/, '');
const TIMEOUT_MS = positiveInteger(process.env.PLANNING_TIMEOUT_MS, 300_000);

const RIGGING_PROMPT = [
  'one complete visually prominent coherent rope rigging cluster from the vessel only',
  'include the full visible ropes cords lashings and tied junctions belonging to that single cluster from anchor to anchor where visible',
  'prefer a cluster near the mast or sail edge that does not cross Enki face',
  'exclude Enki body face hair beard clothing, vessel hull, mast, sail fabric, water, sky, shoreline, cargo and unrelated reeds',
].join('; ');

const LOCATOR_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['target'],
  properties: {
    target: {
      type: 'object',
      additionalProperties: false,
      required: ['found', 'confidence', 'bboxNormalized', 'notes'],
      properties: {
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
  console.log('Shot 3 bounded rigging ROI recovery preflight');
  for (const check of checks) {
    console.log(`${check.ok ? '[ok]' : '[blocked]'} ${check.name}: ${check.detail}`);
  }
  if (!checks.every((item) => item.ok)) {
    process.exitCode = 2;
    return;
  }
  if (command === 'preflight') {
    console.log('');
    console.log(
      '[NEXT] node tools/scripts/shot03-rigging-roi-search.mjs generate',
    );
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
  console.log('Shot 3 bounded rigging ROI recovery search');
  console.log(`Source: ${SOURCE_PATH}`);
  console.log(`Locator: Ollama ${VISION_MODEL}`);
  console.log(`SAM threshold: ${options.threshold.toFixed(2)}`);
  console.log(
    `ROI paddings: ${options.paddings.map((value) => value.toFixed(2)).join(', ')}`,
  );
  console.log(
    'Target: one coherent source-backed rigging/rope cluster away from Enki face; not the old full-frame sparse rigging layer.',
  );
  console.log(
    'Policy: candidate-only under tmp/; no canonical asset/manifest mutation, no automatic promotion, no motion activation.',
  );

  const locator = await locateRiggingCluster();
  const locatorPath = join(workDirectory, 'ollama-rigging-roi-locator.json');
  await writeFile(locatorPath, `${JSON.stringify(locator, null, 2)}\n`, 'utf8');
  console.log(
    `[LOCATOR] confidence ${(locator.confidence * 100).toFixed(0)}% · normalized ${formatNormalizedBox(locator.bboxNormalized)} · pixels ${formatBbox(locator.bboxPixels)}`,
  );
  console.log(`[LOCATOR] ${locator.notes}`);

  const canonical = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const results = [];

  for (let index = 0; index < options.paddings.length; index += 1) {
    const padding = options.paddings[index];
    const roi = expandBbox(
      locator.bboxPixels,
      padding,
      SOURCE_WIDTH,
      SOURCE_HEIGHT,
    );
    const variant = `rigging-cluster-pad-${padding.toFixed(2).replace('.', 'p')}`;
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
    const manifest = buildTemporaryManifest(canonical, cropName);
    const manifestPath = join(
      variantDirectory,
      'temporary-rigging-animation-manifest.json',
    );
    const workflowPath = join(variantDirectory, 'rigging-roi-sam3-workflow.json');
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    await writeFile(
      workflowPath,
      `${JSON.stringify(buildWorkflow(options.threshold), null, 2)}\n`,
      'utf8',
    );

    console.log('');
    console.log(
      `[${index + 1}/${options.paddings.length}] padding=${padding.toFixed(2)} · ROI ${formatBbox(roi)}`,
    );
    runCandidateGeneration({
      manifestPath,
      assetRoot: sourceAssetRoot,
      workflowPath,
      outputRoot,
    });

    const cropCandidatePath = join(outputRoot, 'shot-03', `${LAYER_ID}.png`);
    if (!existsSync(cropCandidatePath)) {
      throw new Error(`Expected rigging ROI candidate was not produced: ${cropCandidatePath}`);
    }
    const registeredPath = join(variantDirectory, `${variant}-registered.png`);
    registerCandidate(cropCandidatePath, registeredPath, roi);

    const cropAnalysis = analyzeAlpha(cropCandidatePath, roi.width, roi.height);
    const registeredAnalysis = analyzeAlpha(
      registeredPath,
      SOURCE_WIDTH,
      SOURCE_HEIGHT,
    );
    const sourceFidelity = analyzeSourceFidelity(
      cropPath,
      cropCandidatePath,
      roi.width,
      roi.height,
    );
    const evaluation = evaluateRiggingRoiCandidate({
      cropAnalysis,
      registeredAnalysis,
      sourceFidelity,
    });

    const result = {
      target: 'rigging-cluster',
      layerId: LAYER_ID,
      padding,
      threshold: options.threshold,
      locatorConfidence: locator.confidence,
      roi,
      cropPath,
      cropCandidatePath,
      registeredPath,
      cropAnalysis,
      registeredAnalysis,
      sourceFidelity,
      structuralRisk: evaluation.risk,
      structuralPass: evaluation.pass,
      structuralScore: evaluation.score,
      failures: evaluation.failures,
      advisories: evaluation.advisories,
    };
    results.push(result);

    console.log(
      `  [${evaluation.pass ? 'SURVIVOR' : 'REJECT'}] ${evaluation.risk} · strong=${cropAnalysis.strongAlphaPixels}px · crop=${(cropAnalysis.strongCoverage * 100).toFixed(2)}% · bbox-fill=${(cropAnalysis.strongBboxFill * 100).toFixed(2)}% · significant=${cropAnalysis.significantComponentCount} · top8=${(cropAnalysis.topEightComponentShare * 100).toFixed(2)}% · edge=${cropAnalysis.anyStrongTouchesEdge ? 'YES' : 'no'} · source-mismatch=${(sourceFidelity.strongMismatchRatio * 100).toFixed(3)}%`,
    );
    for (const failure of evaluation.failures) {
      console.log(`    [BLOCKED] ${failure}`);
    }
    for (const advisory of evaluation.advisories) {
      console.log(`    [ADVISORY] ${advisory}`);
    }
  }

  const ranked = [...results].sort(
    (left, right) => left.structuralScore - right.structuralScore,
  );
  const contactSheetPath = join(
    workDirectory,
    'shot03-rigging-roi-alpha-contact-sheet.png',
  );
  createAlphaContactSheet(ranked, contactSheetPath);

  console.log('');
  console.log('[RANKING]');
  for (const result of ranked) {
    console.log(
      `  pad=${result.padding.toFixed(2)} · ${result.structuralRisk} · ${result.structuralPass ? 'PASS' : 'FAIL'} · score=${result.structuralScore.toFixed(2)} · strong=${result.cropAnalysis.strongAlphaPixels} · significant=${result.cropAnalysis.significantComponentCount}`,
    );
  }

  const reportPath = join(workDirectory, 'shot03-rigging-roi-search.json');
  const report = {
    schemaVersion: 1,
    type: 'shot03-rigging-roi-search',
    generatedAt: new Date().toISOString(),
    sourcePath: SOURCE_PATH,
    sourceDimensions: { width: SOURCE_WIDTH, height: SOURCE_HEIGHT },
    semanticIntent: {
      vesselPart: 'stag.rigging',
      channels: ['rigging.tension', 'rigging.lag'],
      target:
        'one complete visible rope/rigging cluster that can later receive vessel-driven delayed local deformation',
      faceSafetyRequired: true,
    },
    locator,
    samThreshold: options.threshold,
    paddings: options.paddings,
    results,
    ranked,
    artifacts: { alphaContactSheet: contactSheetPath },
    canonicalManifestMutated: false,
    canonicalAssetsMutated: false,
    automaticPromotionAllowed: false,
    motionActivationAllowed: false,
    humanReviewRequired: true,
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  let ai = null;
  if (options.aiReview) {
    const aiPath = join(workDirectory, 'ollama-rigging-roi-review.json');
    const artifacts = [
      { path: SOURCE_PATH, label: 'approved Shot 3 editorial source' },
      {
        path: contactSheetPath,
        label:
          'three rigging ROI alpha candidates ordered by deterministic structural score; white is selected alpha',
      },
      ...ranked.slice(0, 3).map((item, index) => ({
        path: item.registeredPath,
        label: `actual source-backed rigging candidate rank ${index + 1}, padding ${item.padding.toFixed(2)}`,
      })),
    ];
    ai = await reviewGeneratedMedia({
      artifacts,
      task: [
        'Review one bounded Shot 3 rigging recovery experiment.',
        'The target is NOT every rope in the shot. It is one visually meaningful coherent rope/rigging cluster suitable for subtle delayed motion.',
        'The editorial source is authoritative. Candidate pixels must correspond to actual source rigging, not sail fabric, hull, Enki, water, sky, shoreline, cargo, or random reeds.',
        'Reject a candidate if it crosses or obscures Enki face, is visibly clipped by the ROI boundary, contains obvious unrelated scene fragments, or fails to preserve a recognizable rope/rigging cluster.',
        `Deterministic evidence: ${JSON.stringify(ranked.map((item) => ({ padding: item.padding, risk: item.structuralRisk, pass: item.structuralPass, strongAlphaPixels: item.cropAnalysis.strongAlphaPixels, cropCoverage: item.cropAnalysis.strongCoverage, bboxFill: item.cropAnalysis.strongBboxFill, significantComponents: item.cropAnalysis.significantComponentCount, topEightShare: item.cropAnalysis.topEightComponentShare, cropEdge: item.cropAnalysis.anyStrongTouchesEdge, sourceMismatch: item.sourceFidelity.strongMismatchRatio })))}`,
        'Deterministic HIGH/FAIL is authoritative. PASS_ADVISORY can only recommend a survivor for human review and can never promote or animate it.',
      ].join(' '),
      rubric: [
        'selected pixels visibly correspond to real source rigging/rope',
        'cluster is coherent enough to move as one bounded secondary element',
        'no Enki face crossing or facial occlusion',
        'no obvious sail/hull/body/background contamination',
        'no ROI clipping',
        'source painterly texture is preserved',
      ],
      outputPath: aiPath,
      requireAi: options.requireAiReview,
      maxVideoSamples: 1,
    });
    report.ai = ai;
    report.aiReviewPath = aiPath;
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  } else {
    console.log('[ai] semantic media review skipped by --no-ai-review; deterministic QA still ran.');
  }

  const survivors = ranked.filter((item) => item.structuralPass);
  console.log('');
  console.log(`[REVIEW] editorial source: ${SOURCE_PATH}`);
  console.log(`[REVIEW] alpha contact sheet: ${contactSheetPath}`);
  for (const item of ranked.slice(0, 3)) {
    console.log(`[REVIEW] candidate: ${item.registeredPath}`);
  }
  console.log(`[INFO] rigging ROI report: ${reportPath}`);
  if (ai?.status) console.log(`[INFO] local vision status: ${ai.status}`);

  if (!survivors.length) {
    console.log(
      '[STOP] No deterministic rigging survivor. Do not inpaint behind rigging and do not animate a candidate.',
    );
  } else {
    console.log(
      `[GATE] ${survivors.length} deterministic survivor(s). Human must confirm the top candidate is real coherent rigging, stays away from Enki face, and is worth animating.`,
    );
    console.log(
      '[STOP] Do not rebuild the local background or activate rigging motion until that visual gate passes.',
    );
  }

  await maybeOpenReviewArtifacts(
    [SOURCE_PATH, contactSheetPath, ...ranked.slice(0, 3).map((item) => item.registeredPath)],
    { enabled: options.open, delayMs: 120 },
  );
}

async function preflightChecks() {
  return [
    {
      name: 'Shot 3 editorial source',
      ok: existsSync(SOURCE_PATH),
      detail: SOURCE_PATH,
    },
    {
      name: 'Animation manifest',
      ok: existsSync(MANIFEST_PATH),
      detail: MANIFEST_PATH,
    },
    commandCheck('FFmpeg', FFMPEG, ['-version']),
    await httpCheck('ComfyUI', `${COMFY_BASE_URL}/system_stats`),
    await ollamaModelCheck(),
  ];
}

async function locateRiggingCluster() {
  const source = (await readFile(SOURCE_PATH)).toString('base64');
  const system = [
    'You are a precise bounding-box localizer for Sumer Reel Forge.',
    'Return only JSON matching the supplied schema.',
    'Do not segment, redesign, critique, or infer animation.',
    'Choose exactly one coherent visible rope/rigging cluster on the vessel that can plausibly move as a secondary element.',
    'Prefer a cluster that is clearly separated from Enki face and does not require selecting sail fabric or hull to be recognizable.',
    'Coordinates are normalized to the full image: 0 left/top, 1 right/bottom.',
  ].join(' ');
  const user = {
    imageDimensions: { width: SOURCE_WIDTH, height: SOURCE_HEIGHT },
    target: {
      name: 'rigging-cluster',
      description:
        'one most visually prominent coherent vessel rope/rigging cluster, preferably near mast/sail edge, fully away from Enki face; include complete visible rope strands and tied junctions belonging to that cluster; exclude mast, sail fabric, hull, Enki, cargo, water, sky and unrelated reeds',
    },
    instruction:
      'Return a tight box around exactly one rigging cluster. Do not return the entire vessel and do not return a near-full-frame box.',
  };

  console.log('');
  console.log(`[ai] Localize one bounded rigging cluster with ${VISION_MODEL}...`);
  const startedAt = Date.now();
  const payload = await runManagedOllamaVisionChat({
    owner: 'shot03-rigging-roi-locator',
    task: 'shot-3-rigging-roi-localization',
    baseUrl: OLLAMA_BASE_URL,
    model: VISION_MODEL,
    timeoutMs: TIMEOUT_MS,
    format: LOCATOR_SCHEMA,
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: JSON.stringify(user, null, 2),
        images: [source],
      },
    ],
    options: { temperature: 0 },
    errorPrefix: 'Ollama rigging localization',
  });
  const content = payload.message?.content;
  if (!content) throw new Error('Ollama returned no rigging localization content.');
  const parsed = JSON.parse(content);
  const item = parsed.target;
  assertLocator(item);
  console.log(
    `[ai] Rigging localization complete in ${((Date.now() - startedAt) / 1000).toFixed(1)}s.`,
  );
  return {
    provider: 'ollama',
    model: payload.model ?? VISION_MODEL,
    generatedAt: new Date().toISOString(),
    ...item,
    bboxPixels: normalizedToPixels(item.bboxNormalized),
  };
}

function assertLocator(item) {
  if (!item?.found) throw new Error('Ollama did not locate a usable rigging cluster.');
  const box = item.bboxNormalized;
  if (
    !box ||
    ![box.xMin, box.yMin, box.xMax, box.yMax].every(
      (value) => Number.isFinite(value) && value >= 0 && value <= 1,
    ) ||
    box.xMax <= box.xMin ||
    box.yMax <= box.yMin
  ) {
    throw new Error('Ollama returned invalid rigging bounds.');
  }
  const area = (box.xMax - box.xMin) * (box.yMax - box.yMin);
  if (area > 0.35) {
    throw new Error(
      `Ollama rigging box covers ${(area * 100).toFixed(1)}% of the frame; refusing an overly broad rigging ROI.`,
    );
  }
  if (area < 0.0005) {
    throw new Error(
      `Ollama rigging box covers only ${(area * 100).toFixed(3)}% of the frame; refusing a likely point fragment.`,
    );
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

function buildTemporaryManifest(canonical, cropName) {
  const manifest = structuredClone(canonical);
  const shot = manifest.shots?.find((item) => item.sourceShotNumber === 3);
  if (!shot) throw new Error('Shot 3 is missing from the animation manifest.');
  const layer = shot.layers?.find((item) => item.id === LAYER_ID);
  if (!layer) throw new Error(`${LAYER_ID} is missing from Shot 3.`);
  shot.sourceFrame = cropName;
  layer.state = 'pending';
  layer.review = {
    ...(layer.review ?? {}),
    status: 'pending-bounded-rigging-roi-review',
    notes: [
      'Temporary candidate for one bounded source-backed rigging cluster.',
      'The legacy canonical rigging asset remains untouched and is not trusted for this recovery lane.',
      'Canonical assets and manifest remain unchanged.',
    ],
  };
  return manifest;
}

function buildWorkflow(threshold) {
  return {
    '1': {
      inputs: { image: '{{SOURCE_IMAGE}}' },
      class_type: 'LoadImage',
      _meta: { title: 'Shot 3 bounded rigging ROI source' },
    },
    '2': {
      inputs: { ckpt_name: 'sam3.1_multiplex_fp16.safetensors' },
      class_type: 'CheckpointLoaderSimple',
      _meta: { title: 'SAM 3.1 Multiplex FP16' },
    },
    '3': {
      inputs: { text: RIGGING_PROMPT, clip: ['2', 1] },
      class_type: 'CLIPTextEncode',
      _meta: {
        title: 'ROI-only coherent rigging cluster query',
        source_contract: '{{LAYER_PROMPT}}',
      },
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
      _meta: { title: 'Segment one rigging cluster inside constrained ROI' },
    },
    '5': {
      inputs: { image: ['1', 0], alpha: ['4', 0] },
      class_type: 'JoinImageWithAlpha',
      _meta: { title: 'Preserve source RGB under rigging alpha' },
    },
    '6': {
      inputs: { filename_prefix: '{{OUTPUT_PREFIX}}', images: ['5', 0] },
      class_type: 'SaveImage',
      _meta: { title: 'Save bounded rigging ROI candidate' },
    },
  };
}

function runCandidateGeneration({ manifestPath, assetRoot, workflowPath, outputRoot }) {
  const result = spawnSync(
    process.execPath,
    [
      resolve('tools/scripts/animation-layer-candidates.mjs'),
      'generate',
      `--manifest=${manifestPath}`,
      `--asset-root=${assetRoot}`,
      '--shot=3',
      `--layer=${LAYER_ID}`,
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
    throw new Error(
      `Bounded rigging candidate generation failed with exit ${result.status}.`,
    );
  }
}

function analyzeAlpha(path, width, height) {
  const rgba = decodeRgba(path, width, height);
  const pixels = width * height;
  const alpha = new Uint8Array(pixels);
  let strongAlphaPixels = 0;
  let edgeStrongPixels = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const value = rgba[pixel * 4 + 3];
    alpha[pixel] = value;
    if (value <= STRONG_ALPHA) continue;
    strongAlphaPixels += 1;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
      edgeStrongPixels += 1;
    }
  }

  const components = connectedComponents(alpha, width, height);
  const significantFloor = Math.max(12, Math.floor(strongAlphaPixels * 0.002));
  const significant = components.filter((item) => item.pixels >= significantFloor);
  const topEightPixels = components
    .slice(0, 8)
    .reduce((total, component) => total + component.pixels, 0);
  const strongBbox =
    strongAlphaPixels > 0
      ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
      : null;
  const strongBboxArea = strongBbox ? strongBbox.width * strongBbox.height : 0;

  return {
    width,
    height,
    strongAlphaPixels,
    strongCoverage: pixels ? strongAlphaPixels / pixels : 0,
    edgeStrongPixels,
    edgeStrongRatio: strongAlphaPixels ? edgeStrongPixels / strongAlphaPixels : 0,
    anyStrongTouchesEdge: edgeStrongPixels > 0,
    componentCount: components.length,
    significantComponentCount: significant.length,
    significantFloor,
    largestComponentPixels: components[0]?.pixels ?? 0,
    largestComponentShare:
      strongAlphaPixels && components[0]
        ? components[0].pixels / strongAlphaPixels
        : 0,
    topEightComponentShare: strongAlphaPixels
      ? topEightPixels / strongAlphaPixels
      : 0,
    strongBbox,
    strongBboxFill:
      strongBboxArea && strongAlphaPixels
        ? strongAlphaPixels / strongBboxArea
        : 0,
    topComponents: components.slice(0, 12),
  };
}

function analyzeSourceFidelity(sourcePath, candidatePath, width, height) {
  const source = decodeRgba(sourcePath, width, height);
  const candidate = decodeRgba(candidatePath, width, height);
  const pixels = width * height;
  let selected = 0;
  let mismatched = 0;
  let deltaSum = 0;
  let maxDelta = 0;

  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const offset = pixel * 4;
    if (candidate[offset + 3] <= STRONG_ALPHA) continue;
    selected += 1;
    const delta = Math.max(
      Math.abs(candidate[offset] - source[offset]),
      Math.abs(candidate[offset + 1] - source[offset + 1]),
      Math.abs(candidate[offset + 2] - source[offset + 2]),
    );
    deltaSum += delta;
    maxDelta = Math.max(maxDelta, delta);
    if (delta > 2) mismatched += 1;
  }

  return {
    strongSelectedPixels: selected,
    strongMismatchPixels: mismatched,
    strongMismatchRatio: selected ? mismatched / selected : 1,
    meanMaxChannelDelta: selected ? deltaSum / selected : 255,
    maxChannelDelta: maxDelta,
  };
}

function decodeRgba(path, width, height) {
  const pixels = width * height;
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
    {
      cwd: ROOT,
      encoding: null,
      maxBuffer: Math.max(32 * 1024 * 1024, pixels * 4 + 1024),
      windowsHide: true,
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (
    result.status !== 0 ||
    !Buffer.isBuffer(result.stdout) ||
    result.stdout.length !== pixels * 4
  ) {
    throw new Error(
      `Could not decode ${path} as ${width}x${height} RGBA (${result.stdout?.length ?? 0} bytes).`,
    );
  }
  return result.stdout;
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
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        touchesEdge = true;
      }
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
      bbox: {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      },
      touchesEdge,
    });
  }

  components.sort((left, right) => right.pixels - left.pixels);
  return components;
}

function createAlphaContactSheet(results, outputPath) {
  if (results.length !== 3) {
    console.warn(
      `[WARN] rigging contact sheet expects exactly 3 padding variants; found ${results.length}.`,
    );
    return;
  }
  const args = ['-y', '-hide_banner', '-loglevel', 'error'];
  for (const item of results) args.push('-i', item.registeredPath);
  const filters = results.map(
    (_item, index) =>
      `[${index}:v]alphaextract,scale=282:502:flags=neighbor,format=gray[m${index}]`,
  );
  filters.push('[m0][m1][m2]hstack=inputs=3[sheet]');
  args.push(
    '-filter_complex',
    filters.join(';'),
    '-map',
    '[sheet]',
    '-frames:v',
    '1',
    outputPath,
  );
  const result = spawnSync(FFMPEG, args, {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `FFmpeg could not create rigging contact sheet: ${String(result.stderr ?? '').trim()}`,
    );
  }
}

function runFfmpeg(args) {
  const result = spawnSync(
    FFMPEG,
    ['-y', '-hide_banner', '-loglevel', 'error', ...args],
    {
      cwd: ROOT,
      encoding: 'utf8',
      windowsHide: true,
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `FFmpeg failed with exit ${result.status ?? 'unknown'}: ${result.stderr || result.stdout}`,
    );
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
    return {
      name,
      ok: response.ok,
      detail: response.ok ? url : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function ollamaModelCheck() {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      return {
        name: 'Ollama vision model',
        ok: false,
        detail: `HTTP ${response.status}`,
      };
    }
    const payload = await response.json();
    const models = (payload.models ?? [])
      .map((item) => item.name ?? item.model)
      .filter(Boolean);
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
    paddings: [...DEFAULT_PADDINGS],
    threshold: DEFAULT_THRESHOLD,
    aiReview: true,
    requireAiReview: false,
    open: true,
  };

  for (const arg of args) {
    if (arg === '--no-open') {
      result.open = false;
      continue;
    }
    if (arg === '--no-ai-review') {
      result.aiReview = false;
      continue;
    }
    if (arg === '--require-ai-review') {
      result.requireAiReview = true;
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
      if (
        values.length !== 3 ||
        values.some((item) => !Number.isFinite(item) || item < 0 || item > 1)
      ) {
        throw new Error(
          '--paddings must contain exactly three comma-separated numbers between 0 and 1.',
        );
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

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
