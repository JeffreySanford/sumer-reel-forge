import { spawn } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const PREVIEW_BASE = resolve('tmp/animation-previews');
const ANIMATION_MANIFEST = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const STYLE_DECISIONS = resolve('tools/creative/style-decisions-v1.json');
const MATERIAL_QA_CALIBRATIONS = resolve(
  'tools/animation/material-qa-calibrations-v1.json',
);

loadLocalEnvFile();
process.env.OLLAMA_VISION_MODEL ??= 'qwen3-vl:4b-instruct';
process.env.OLLAMA_TEXT_MODEL ??= 'qwen3:8b';
process.env.OLLAMA_BASE_URL ??= 'http://localhost:11434';
process.env.PLANNING_TIMEOUT_MS ??= '120000';
process.env.OLLAMA_KEEP_ALIVE ??= '10m';

const VISION_REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'status',
    'confidence',
    'summary',
    'findings',
    'materialAssessments',
    'recommendations',
  ],
  properties: {
    status: {
      type: 'string',
      enum: ['PASS_ADVISORY', 'REVIEW_REQUIRED', 'FAIL_ADVISORY'],
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['category', 'severity', 'layerId', 'description', 'evidence'],
        properties: {
          category: { type: 'string' },
          severity: {
            type: 'string',
            enum: ['info', 'low', 'medium', 'high'],
          },
          layerId: { type: 'string' },
          description: { type: 'string' },
          evidence: { type: 'string' },
        },
      },
    },
    materialAssessments: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['material', 'status', 'notes'],
        properties: {
          material: { type: 'string' },
          status: {
            type: 'string',
            enum: ['credible', 'weak', 'artifact', 'not-visible', 'not-applicable'],
          },
          notes: { type: 'string' },
        },
      },
    },
    recommendations: { type: 'array', items: { type: 'string' } },
  },
};

export function evaluateMaterialCalibrations(materialQa, calibrationLibrary) {
  if (!materialQa?.applicable) {
    return {
      pass: true,
      applicable: false,
      calibratedTargets: [],
      uncalibratedTargets: [],
    };
  }

  const calibrations = calibrationLibrary?.calibrations ?? [];
  const calibratedTargets = [];
  const uncalibratedTargets = [];

  for (const target of materialQa.targets ?? []) {
    const calibration = calibrations.find(
      (entry) =>
        entry.material === target.material &&
        (target.activePresets ?? []).includes(entry.motionPreset),
    );

    if (!calibration) {
      uncalibratedTargets.push({
        layerId: target.layerId,
        material: target.material,
        activePresets: target.activePresets ?? [],
        blocking: false,
        reason: 'No human-approved material QA calibration exists yet.',
      });
      continue;
    }

    const floor = calibration.productionFloor ?? {};
    const comparisons = target.comparisons ?? [];
    const minPassingRatio = Number(floor.minPassingRatio ?? 0.6);
    const requiredPassingFrames = Math.max(
      1,
      Math.ceil(comparisons.length * minPassingRatio),
    );
    const passingFrames = comparisons.filter(
      (comparison) =>
        Number(comparison.meanAbsoluteDifference) >= Number(floor.minMeanDiff) &&
        Number(comparison.changedPixelRatio) >= Number(floor.minChangedRatio),
    ).length;
    const pixelThresholdMatches =
      Number(materialQa.thresholds?.pixelChangeThreshold) ===
      Number(floor.pixelChangeThreshold);
    const pass = pixelThresholdMatches && passingFrames >= requiredPassingFrames;

    calibratedTargets.push({
      layerId: target.layerId,
      material: target.material,
      activePresets: target.activePresets ?? [],
      calibrationId: calibration.id,
      benchmark: calibration.benchmark,
      productionFloor: floor,
      passingFrames,
      requiredPassingFrames,
      totalFrames: comparisons.length,
      pixelThresholdMatches,
      pass,
    });
  }

  return {
    pass: calibratedTargets.every((target) => target.pass),
    applicable: true,
    calibratedTargets,
    uncalibratedTargets,
  };
}

async function main() {
  const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
  const shotLabel = String(options.shotNumber).padStart(2, '0');
  const previewRoot = resolve(PREVIEW_BASE, `shot${shotLabel}-layered-preview`);

  console.log(`Animation shot review — Shot ${options.shotNumber}`);
  console.log(
    'Policy: AI proposes/criticizes. Rules constrain. Human approval remains final.',
  );
  console.log('');

  let previewDirectory = options.previewDir ? resolve(options.previewDir) : undefined;

  if (!options.skipRender) {
    const renderArgs = [
      'exec',
      'tsx',
      'tools/scripts/render-layered-candidate-scene-v2.ts',
      `--shot=${options.shotNumber}`,
    ];
    if (options.reviewGuides) renderArgs.push('--review-guides');
    const renderStatus = await runStep('pnpm', renderArgs, resolve('.'));
    if (renderStatus !== 0) {
      throw new Error(`Candidate render failed with exit code ${renderStatus}.`);
    }
    previewDirectory = newestCompletePreviewDirectory(previewRoot, options.shotNumber);
  } else if (!previewDirectory) {
    previewDirectory = newestCompletePreviewDirectory(previewRoot, options.shotNumber);
  }

  assertInside(previewRoot, previewDirectory, 'Shot review preview directory');
  const previewManifestPath = join(previewDirectory, 'preview-manifest.json');
  if (!existsSync(previewManifestPath)) {
    throw new Error(`Preview manifest not found: ${previewManifestPath}`);
  }

  console.log('');
  console.log('Deterministic aggregate scene review...');
  const verifyStatus = await runStep(
    'node',
    [
      'tools/scripts/verify-layered-candidate-scene-v2.mjs',
      `--shot=${options.shotNumber}`,
      `--preview-dir=${previewDirectory}`,
    ],
    resolve('.'),
  );

  const motionQaPath = join(previewDirectory, 'motion-qa.json');
  if (!existsSync(motionQaPath)) {
    throw new Error(`Deterministic review did not produce ${motionQaPath}.`);
  }
  const motionQa = JSON.parse(readFileSync(motionQaPath, 'utf8'));
  const aggregatePass = verifyStatus === 0 && motionQa.pass === true;

  console.log('');
  console.log('Deterministic material-local review...');
  const materialStatus = await runStep(
    'node',
    [
      'tools/scripts/verify-material-local-motion.mjs',
      `--shot=${options.shotNumber}`,
      `--preview-dir=${previewDirectory}`,
    ],
    resolve('.'),
  );
  const materialQaPath = join(previewDirectory, 'material-motion-qa.json');
  let materialQa;
  if (existsSync(materialQaPath)) {
    materialQa = JSON.parse(readFileSync(materialQaPath, 'utf8'));
  } else {
    materialQa = {
      applicable: true,
      pass: false,
      thresholds: {},
      targets: [],
      error: `Material-local QA exited ${materialStatus} without producing a report.`,
    };
  }

  const calibrationLibrary = JSON.parse(
    readFileSync(MATERIAL_QA_CALIBRATIONS, 'utf8'),
  );
  const calibratedMaterialQa = evaluateMaterialCalibrations(
    materialQa,
    calibrationLibrary,
  );
  const materialPass = materialStatus === 0 && calibratedMaterialQa.pass;
  const deterministicPass = aggregatePass && materialPass;

  for (const target of calibratedMaterialQa.calibratedTargets) {
    console.log(
      `[${target.pass ? 'ok' : 'fail'}] ${target.layerId}: ${target.passingFrames}/${target.totalFrames} beats meet ${target.calibrationId} production floor (need ${target.requiredPassingFrames})`,
    );
  }
  for (const target of calibratedMaterialQa.uncalibratedTargets) {
    console.log(
      `[review] ${target.layerId}: no approved calibration yet; deterministic material measurement is advisory.`,
    );
  }

  let aiReview;
  if (options.skipAi) {
    aiReview = skippedAiReview('AI review disabled with --skip-ai.');
  } else {
    aiReview = await runOllamaVisionReview({
      shotNumber: options.shotNumber,
      previewDirectory,
      motionQa,
      materialQa,
      calibratedMaterialQa,
    });
  }

  if (options.requireAi && aiReview.status === 'SKIPPED') {
    console.log('');
    console.log(
      `[fail] Ollama vision review required but unavailable: ${aiReview.reason}`,
    );
  }

  const finalState = !deterministicPass
    ? 'DETERMINISTIC_FAIL'
    : aiReview.status === 'REVIEW_REQUIRED' || aiReview.status === 'FAIL_ADVISORY'
      ? 'REVIEW_REQUIRED'
      : options.requireAi && aiReview.status === 'SKIPPED'
        ? 'REVIEW_REQUIRED'
        : 'READY_FOR_HUMAN_REVIEW';

  const report = {
    schemaVersion: 2,
    reviewType: 'animation-shot-review',
    generatedAt: new Date().toISOString(),
    sourceShotNumber: options.shotNumber,
    previewDirectory,
    finalState,
    deterministic: {
      pass: deterministicPass,
      aggregateSceneMotion: {
        pass: aggregatePass,
        reportPath: motionQaPath,
        cameraInclusive: true,
      },
      materialLocalMotion: {
        pass: materialPass,
        reportPath: materialQaPath,
        verificationType: 'same-camera-frozen-layer-material-motion',
        calibratedGate: calibratedMaterialQa,
      },
      note:
        'Aggregate frame-difference QA remains camera-inclusive. Calibrated material-local QA compares same-frame normal and frozen-layer renders so camera, grade, framing, and unrelated effects cancel from the differential.',
    },
    ai: aiReview,
    approvalPolicy: {
      humanApprovalRequired: true,
      automaticPromotionAllowed: false,
      candidatesPromoted: false,
      manifestMutated: false,
    },
  };
  const reportPath = join(previewDirectory, 'shot-review.json');
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log('');
  console.log('Review summary');
  console.log(`[${aggregatePass ? 'ok' : 'fail'}] aggregate scene motion gate`);
  console.log(`[${materialPass ? 'ok' : 'fail'}] calibrated material-local gate`);
  if (aiReview.status === 'SKIPPED') {
    console.log(`[skip] Ollama vision review: ${aiReview.reason}`);
  } else {
    console.log(
      `[ai] ${aiReview.status} · confidence ${formatConfidence(aiReview.confidence)}`,
    );
    console.log(`     ${aiReview.summary}`);
    for (const finding of aiReview.findings ?? []) {
      console.log(
        `     - ${finding.severity.toUpperCase()} ${finding.category}${finding.layerId ? ` (${finding.layerId})` : ''}: ${finding.description}`,
      );
    }
  }
  console.log('');
  console.log(`FINAL STATE: ${finalState.replaceAll('_', ' ')}`);
  console.log(`Report: ${reportPath}`);
  console.log('No candidate was promoted and no human approval was recorded.');

  if (!deterministicPass) process.exitCode = 2;
  else if (options.requireAi && aiReview.status === 'SKIPPED') process.exitCode = 3;
}

async function runOllamaVisionReview({
  shotNumber,
  previewDirectory,
  motionQa,
  materialQa,
  calibratedMaterialQa,
}) {
  const model = process.env.OLLAMA_VISION_MODEL;
  if (!model) {
    return skippedAiReview('OLLAMA_VISION_MODEL is not configured.');
  }

  const baseUrl = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(
    /\/$/,
    '',
  );
  const timeoutMs = positiveInteger(process.env.PLANNING_TIMEOUT_MS, 120_000);
  const keepAlive = process.env.OLLAMA_KEEP_ALIVE ?? '10m';

  let tags;
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(Math.min(timeoutMs, 5_000)),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    tags = await response.json();
  } catch (error) {
    return skippedAiReview(
      `Ollama is not reachable at ${baseUrl}: ${errorMessage(error)}`,
    );
  }

  const availableModels = (tags.models ?? [])
    .map((item) => item.name ?? item.model)
    .filter(Boolean);
  if (!availableModels.includes(model)) {
    return skippedAiReview(
      `Configured vision model ${model} is not installed. Available models: ${availableModels.join(', ') || 'none'}.`,
    );
  }

  const previewManifest = JSON.parse(
    readFileSync(join(previewDirectory, 'preview-manifest.json'), 'utf8'),
  );
  const animationManifest = JSON.parse(readFileSync(ANIMATION_MANIFEST, 'utf8'));
  const shot = animationManifest.shots?.find(
    (item) => item.sourceShotNumber === shotNumber,
  );
  if (!shot) {
    return skippedAiReview(`Shot ${shotNumber} is not present in animation-v1 manifest.`);
  }

  const styleLibrary = JSON.parse(readFileSync(STYLE_DECISIONS, 'utf8'));
  const materialNames = new Set(
    (shot.layers ?? [])
      .filter((layer) =>
        (shot.activationPolicy?.requiredLayerIds ?? []).includes(layer.id),
      )
      .map((layer) => layer.material),
  );
  const styleRules = (styleLibrary.decisions ?? [])
    .filter((decision) => {
      if (!['approved', 'provisional'].includes(decision.state)) return false;
      const scope = decision.scope ?? {};
      return (
        scope.type === 'project' ||
        scope.type === 'reel' ||
        (scope.type === 'shot' && scope.shotId === shot.shotId) ||
        (scope.type === 'material' && materialNames.has(scope.material))
      );
    })
    .map((decision) => ({
      id: decision.id,
      state: decision.state,
      path: decision.path,
      value: decision.value,
      rationale: decision.rationale,
    }));

  const imageRecords = collectVisionEvidence({
    previewDirectory,
    previewManifest,
    shot,
    materialQa,
    calibratedMaterialQa,
  });
  const images = imageRecords.map((item) =>
    readFileSync(item.path).toString('base64'),
  );

  const system = [
    'You are a conservative visual quality reviewer for Sumer Reel Forge.',
    'Return only JSON conforming to the supplied schema.',
    'You may critique and recommend; you may never approve or promote a shot.',
    'Judge only visible evidence. Do not invent defects that are not supported by the images.',
    'Distinguish camera motion from material-local motion.',
    'Use the deterministic same-camera frozen-layer material gate as evidence, but still judge whether the visible result is artistically credible.',
    'Preserve source identity, composition, and approved editorial pixels.',
    'Flag translated-card motion, mask bleed, edge ghosts, diagonal streak artifacts, identity drift, caption/eye-target competition, implausible physical behavior, or motion so weak that the intended material remains visually static.',
    'An optional/deferred layer being absent is not a defect unless the shot contract or visible narrative requires it.',
  ].join(' ');

  const user = JSON.stringify(
    {
      task: 'Critique this exact layered candidate audition for human review readiness.',
      imageOrder: imageRecords.map((item, index) => ({ index, label: item.label })),
      shot: {
        shotId: shot.shotId,
        sourceShotNumber: shot.sourceShotNumber,
        requiredLayerIds: shot.activationPolicy?.requiredLayerIds ?? [],
        optionalLayerIds: (shot.layers ?? [])
          .map((layer) => layer.id)
          .filter(
            (id) => !(shot.activationPolicy?.requiredLayerIds ?? []).includes(id),
          ),
        stillnessAnchor: previewManifest.humanReview?.stillnessAnchor ?? null,
        eyeTarget: previewManifest.humanReview?.eyeTarget ?? null,
        emotionalPurpose: previewManifest.humanReview?.emotionalPurpose ?? null,
      },
      candidates: previewManifest.candidates ?? [],
      deterministicQa: {
        aggregateSceneMotion: {
          pass: motionQa.pass === true,
          cameraInclusive: true,
          warning:
            'Whole-frame differences can be dominated by the Scene V2 camera.',
          motion: motionQa.motion ?? null,
        },
        materialLocalMotion: {
          raw: materialQa,
          calibratedGate: calibratedMaterialQa,
        },
      },
      styleRules,
      reviewRubric: [
        'stillness anchor remains stable',
        'motion supports rather than competes with the eye target',
        'physical materials behave like materials rather than translated cards',
        'contained materials remain inside their intended boundaries',
        'no synthetic streaks, edge ghosts, alpha bleed, or duplicated source edges',
        'motion is perceptible enough to serve its intended purpose without spectacle',
        'source identity and approved editorial composition remain intact',
      ],
    },
    null,
    2,
  );

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        think: false,
        keep_alive: keepAlive,
        format: VISION_REVIEW_SCHEMA,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user, images },
        ],
        options: { temperature: 0.1 },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    const payload = await response.json();
    const content = payload.message?.content;
    if (!content) {
      throw new Error('Ollama returned no structured vision-review content.');
    }
    const parsed = JSON.parse(content);
    assertVisionReview(parsed);
    const result = {
      ...parsed,
      provider: 'ollama',
      model: payload.model ?? model,
      advisoryOnly: true,
      evidence: imageRecords.map((item) => ({
        label: item.label,
        path: item.path,
      })),
    };
    writeFileSync(
      join(previewDirectory, 'ollama-vision-review.json'),
      `${JSON.stringify(result, null, 2)}\n`,
      'utf8',
    );
    return result;
  } catch (error) {
    return skippedAiReview(`Ollama vision review failed: ${errorMessage(error)}`);
  }
}

function collectVisionEvidence({
  previewDirectory,
  previewManifest,
  shot,
  materialQa,
  calibratedMaterialQa,
}) {
  const records = [];
  const editorialPath = resolve('assets', shot.sourceFrame);
  if (existsSync(editorialPath)) {
    records.push({ label: 'approved editorial source', path: editorialPath });
  }

  const contactSheetPath = resolveEvidencePath(
    previewDirectory,
    previewManifest.contactSheet?.path,
  );
  if (contactSheetPath && existsSync(contactSheetPath)) {
    records.push({ label: 'review contact sheet', path: contactSheetPath });
  }

  const frames = Array.isArray(previewManifest.reviewFrames)
    ? [...previewManifest.reviewFrames].sort((a, b) => a.progress - b.progress)
    : [];
  for (const frame of selectFrameEvidence(frames)) {
    const path = resolveEvidencePath(previewDirectory, frame.path);
    if (path && existsSync(path)) {
      records.push({
        label: `review frame ${frame.id ?? frame.frame ?? 'unknown'} @ ${Math.round((frame.progress ?? 0) * 100)}%`,
        path,
      });
    }
  }

  const calibratedLayerIds = new Set(
    (calibratedMaterialQa.calibratedTargets ?? []).map((target) => target.layerId),
  );
  const materialTarget = (materialQa.targets ?? []).find((target) =>
    calibratedLayerIds.has(target.layerId),
  );
  if (materialTarget?.comparisons?.length) {
    const strongest = [...materialTarget.comparisons].sort(
      (a, b) =>
        Number(b.meanAbsoluteDifference ?? 0) -
        Number(a.meanAbsoluteDifference ?? 0),
    )[0];
    if (strongest?.differencePath && existsSync(strongest.differencePath)) {
      records.push({
        label: `material-local difference ${materialTarget.layerId} @ ${strongest.id ?? strongest.frame}`,
        path: strongest.differencePath,
      });
    }
  }

  if (!records.length) {
    throw new Error('No image evidence is available for Ollama vision review.');
  }
  return records.slice(0, 6);
}

function selectFrameEvidence(frames) {
  if (frames.length <= 3) return frames;
  return [
    frames[0],
    frames[Math.floor(frames.length / 2)],
    frames[frames.length - 1],
  ];
}

function resolveEvidencePath(parent, rawPath) {
  if (typeof rawPath !== 'string' || !rawPath) return undefined;
  return isAbsolute(rawPath) ? resolve(rawPath) : resolve(parent, rawPath);
}

function assertVisionReview(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Vision review is not an object.');
  }
  if (
    !['PASS_ADVISORY', 'REVIEW_REQUIRED', 'FAIL_ADVISORY'].includes(value.status)
  ) {
    throw new Error(`Invalid vision review status ${value.status}.`);
  }
  if (
    !Number.isFinite(value.confidence) ||
    value.confidence < 0 ||
    value.confidence > 1
  ) {
    throw new Error('Vision review confidence must be between 0 and 1.');
  }
  if (typeof value.summary !== 'string' || !Array.isArray(value.findings)) {
    throw new Error('Vision review is missing summary/findings.');
  }
  if (
    !Array.isArray(value.materialAssessments) ||
    !Array.isArray(value.recommendations)
  ) {
    throw new Error('Vision review is missing material assessments/recommendations.');
  }
}

function skippedAiReview(reason) {
  return {
    status: 'SKIPPED',
    reason,
    advisoryOnly: true,
    findings: [],
    materialAssessments: [],
    recommendations: [],
  };
}

function newestCompletePreviewDirectory(root, shotNumber) {
  if (!existsSync(root)) {
    throw new Error(
      `Shot ${shotNumber} preview root does not exist: ${root}. Render a candidate audition first.`,
    );
  }
  const directories = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));

  const complete = directories.find((directory) =>
    isCompletePreviewDirectory(directory, shotNumber),
  );
  if (complete) return complete;

  throw new Error(
    `No complete Shot ${shotNumber} preview found under ${root}. A complete preview requires preview-manifest.json, scene-v2-candidate-props.json, and public/.`,
  );
}

function isCompletePreviewDirectory(directory, shotNumber) {
  const manifestPath = join(directory, 'preview-manifest.json');
  const propsPath = join(directory, 'scene-v2-candidate-props.json');
  const publicDirectory = join(directory, 'public');
  if (
    !existsSync(manifestPath) ||
    !existsSync(propsPath) ||
    !existsSync(publicDirectory)
  ) {
    return false;
  }
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const props = JSON.parse(readFileSync(propsPath, 'utf8'));
    return (
      manifest.sourceShotNumber === shotNumber &&
      Array.isArray(props.scene?.shots) &&
      props.scene.shots.length > 0
    );
  } catch {
    return false;
  }
}

function loadLocalEnvFile() {
  const envPath = resolve('.env');
  if (!existsSync(envPath)) return;
  if (typeof process.loadEnvFile !== 'function') {
    throw new Error(
      'Native .env loading requires Node 20.12 or newer. This workspace targets Node 22.',
    );
  }
  const inherited = { ...process.env };
  process.loadEnvFile(envPath);
  Object.assign(process.env, inherited);
}

function assertInside(parent, child, label) {
  const path = relative(resolve(parent), resolve(child));
  if (path.startsWith('..') || isAbsolute(path)) {
    throw new Error(`${label} must remain under ${parent}: ${child}`);
  }
}

async function runStep(command, args, cwd) {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      shell: process.platform === 'win32',
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', rejectPromise);
    child.once('exit', (code) => resolvePromise(code ?? 1));
  });
}

function parseOptions(args) {
  const result = {
    shotNumber: 0,
    previewDir: undefined,
    skipRender: false,
    skipAi: false,
    requireAi: false,
    reviewGuides: false,
  };
  for (const arg of args) {
    if (arg.startsWith('--shot=')) {
      const value = Number(arg.slice('--shot='.length));
      if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid ${arg}`);
      result.shotNumber = value;
    } else if (arg.startsWith('--preview-dir=')) {
      result.previewDir = arg.slice('--preview-dir='.length);
    } else if (arg === '--skip-render') {
      result.skipRender = true;
    } else if (arg === '--skip-ai') {
      result.skipAi = true;
    } else if (arg === '--require-ai') {
      result.requireAi = true;
    } else if (arg === '--review-guides') {
      result.reviewGuides = true;
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  if (!result.shotNumber) throw new Error('--shot=<number> is required.');
  return result;
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function formatConfidence(value) {
  return Number.isFinite(value) ? `${Math.round(value * 100)}%` : 'unknown';
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : '';
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  });
}
