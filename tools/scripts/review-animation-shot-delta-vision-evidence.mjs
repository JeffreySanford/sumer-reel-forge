import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalizeDeltaReview } from './review-animation-shot-delta-vision.mjs';
import { newestCompletePreviewDirectory } from './verify-material-local-motion.mjs';
import {
  buildMaterialMotionStateEvidence,
  selectFocusedMaterialEvidence,
} from './animation-review-motion-state.mjs';

const PREVIEW_BASE = resolve('tmp/animation-previews');
const ANIMATION_MANIFEST = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const STYLE_DECISIONS = resolve('tools/creative/style-decisions-v1.json');

const DELTA_REVIEW_SCHEMA = {
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
        required: [
          'category',
          'severity',
          'layerId',
          'origin',
          'description',
          'evidence',
        ],
        properties: {
          category: { type: 'string' },
          severity: {
            type: 'string',
            enum: ['info', 'low', 'medium', 'high'],
          },
          layerId: { type: 'string' },
          origin: {
            type: 'string',
            enum: ['animation-introduced', 'source-baseline', 'uncertain'],
          },
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

export function buildFocusedEvidence({ previewDirectory, previewManifest, shot, materialQa }) {
  const records = [];
  const editorialPath = resolve('assets', shot.sourceFrame);
  if (existsSync(editorialPath)) {
    records.push({
      label: 'approved editorial source — immutable baseline',
      path: editorialPath,
      kind: 'source',
    });
  }

  const focused = selectFocusedMaterialEvidence(materialQa);
  if (focused) {
    const { target, middle, terminal } = focused;
    pushIfExists(records, {
      label: `candidate material frame ${middle.frame} ${middle.id ?? ''} — normal animated render`,
      path: middle.normalPath,
      kind: 'candidate-normal',
    });
    pushIfExists(records, {
      label: `terminal frame ${terminal.frame} ${terminal.id ?? ''} — normal animated render`,
      path: terminal.normalPath,
      kind: 'terminal-normal',
    });
    pushIfExists(records, {
      label: `terminal frame ${terminal.frame} ${terminal.id ?? ''} — frozen ${target.activePresets?.join(', ') ?? 'material motion'} control`,
      path: terminal.frozenPath,
      kind: 'terminal-frozen-control',
    });
    pushIfExists(records, {
      label: `terminal frame ${terminal.frame} ${terminal.id ?? ''} — animation-only absolute difference; bright pixels mean motion contribution`,
      path: terminal.differencePath,
      kind: 'terminal-animation-difference',
    });
  }

  if (records.length < 2) {
    for (const frame of selectFrameEvidence(previewManifest.reviewFrames ?? [])) {
      const path = resolveEvidencePath(previewDirectory, frame.path);
      pushIfExists(records, {
        label: `candidate review frame ${frame.id ?? frame.frame ?? 'unknown'}`,
        path,
        kind: 'candidate-normal',
      });
    }
  }

  if (records.length < 2) {
    throw new Error('Delta critic requires the editorial source plus candidate evidence.');
  }
  return records.slice(0, 5);
}

async function main() {
  const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
  const shotLabel = String(options.shotNumber).padStart(2, '0');
  const previewRoot = resolve(PREVIEW_BASE, `shot${shotLabel}-layered-preview`);
  const previewDirectory = options.previewDir
    ? resolve(options.previewDir)
    : newestCompletePreviewDirectory(previewRoot, options.shotNumber);
  const reportPath = join(previewDirectory, 'shot-review.json');
  if (!existsSync(reportPath)) {
    throw new Error(`Deterministic shot review report not found: ${reportPath}`);
  }

  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const previewManifest = JSON.parse(
    readFileSync(join(previewDirectory, 'preview-manifest.json'), 'utf8'),
  );
  const animationManifest = JSON.parse(readFileSync(ANIMATION_MANIFEST, 'utf8'));
  const shot = animationManifest.shots?.find(
    (item) => item.sourceShotNumber === options.shotNumber,
  );
  if (!shot) {
    throw new Error(`Shot ${options.shotNumber} is not present in animation-v1 manifest.`);
  }

  const materialQaPath = join(previewDirectory, 'material-motion-qa.json');
  const containmentQaPath = join(
    previewDirectory,
    'contained-material-boundary-qa.json',
  );
  const materialQa = existsSync(materialQaPath)
    ? JSON.parse(readFileSync(materialQaPath, 'utf8'))
    : null;
  const containmentQa = existsSync(containmentQaPath)
    ? JSON.parse(readFileSync(containmentQaPath, 'utf8'))
    : null;
  const motionStates = buildMaterialMotionStateEvidence(materialQa);
  const styleLibrary = JSON.parse(readFileSync(STYLE_DECISIONS, 'utf8'));
  const styleRules = relevantStyleRules(styleLibrary, shot);
  const imageRecords = buildFocusedEvidence({
    previewDirectory,
    previewManifest,
    shot,
    materialQa,
  });
  const images = imageRecords.map((item) => readFileSync(item.path).toString('base64'));

  const model = process.env.OLLAMA_VISION_MODEL ?? 'qwen3-vl:4b-instruct';
  const baseUrl = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(
    /\/$/,
    '',
  );
  const timeoutMs = positiveInteger(process.env.PLANNING_TIMEOUT_MS, 300000);
  const keepAlive = process.env.OLLAMA_KEEP_ALIVE ?? '10m';

  const system = [
    'You are the source-aware delta critic for Sumer Reel Forge.',
    'Return only JSON conforming to the supplied schema.',
    'The approved editorial source is immutable and is the visual baseline, not a candidate to redesign.',
    'Normal/frozen/difference evidence is deliberately paired at the same frame and camera.',
    'A difference image is NOT a natural-looking frame: bright pixels indicate only where animation changed the frozen control. Never critique the appearance of the difference visualization itself.',
    'Runtime motion-state numbers are deterministic facts. Do not claim a broad ripple is visibly generated at a beat where broadRippleWeight is zero.',
    'If broadRippleWeight is zero but the normal frame still appears patterned, distinguish fine refraction or source texture from the disabled broad ripple accent.',
    'Every finding must classify origin as animation-introduced, source-baseline, or uncertain.',
    'Only medium/high animation-introduced or uncertain findings should drive REVIEW_REQUIRED or FAIL_ADVISORY.',
    'Containment pixel measurements are authoritative for literal spill; perceptual rim crowding may still be criticized separately.',
    'Critique translated-card motion, edge ghosts, streaks, identity drift, implausible material behavior, distracting repetition, or loss of source texture when the paired evidence actually supports it.',
    'You may critique and recommend; you may never approve, promote, redraw, or mutate editorial-v1.',
  ].join(' ');

  const prompt = {
    task:
      'Use the paired evidence to determine whether animation introduced a visible defect. For material claims, compare normal against frozen and use the animation-only difference to localize what animation actually changed.',
    imageOrder: imageRecords.map((item, index) => ({
      index,
      label: item.label,
      kind: item.kind,
    })),
    immutableSourcePolicy: {
      editorialVersion: 'editorial-v1',
      sourceFrame: shot.sourceFrame,
      sourceIsAuthoritative: true,
    },
    shot: {
      shotId: shot.shotId,
      sourceShotNumber: shot.sourceShotNumber,
      requiredLayerIds: shot.activationPolicy?.requiredLayerIds ?? [],
      stillnessAnchor: previewManifest.humanReview?.stillnessAnchor ?? null,
      eyeTarget: previewManifest.humanReview?.eyeTarget ?? null,
      emotionalPurpose: previewManifest.humanReview?.emotionalPurpose ?? null,
    },
    deterministicQa: {
      aggregatePass: report.deterministic?.pass === true,
      materialLocalPass: materialQa?.pass ?? null,
      containedMaterialBoundaryPass: containmentQa?.pass ?? null,
      containment: summarizeContainment(containmentQa),
    },
    runtimeMotionState: motionStates.map((state) => ({
      layerId: state.layerId,
      id: state.id,
      frame: state.frame,
      progress: state.progress,
      water: state.water ?? null,
      changedPixelRatio: state.changedPixelRatio,
      meanAbsoluteDifference: state.meanAbsoluteDifference,
    })),
    styleRules,
    reviewRubric: [
      'attribute defects only to pixels/effects actually changed by animation',
      'use normal-vs-frozen evidence before describing material texture defects',
      'do not attribute a disabled broad ripple accent to a terminal frame',
      'fine refraction may remain active after the broad readable ripple settles away',
      'keep motion perceptible but subordinate to source narrative and source texture',
    ],
  };

  console.log(
    `[ai] Evidence-aware delta critic: ${model} · ${imageRecords.length} images · ${motionStates.length} material-state beats · timeout ${Math.round(timeoutMs / 1000)}s`,
  );
  const startedAt = Date.now();

  let rawReview;
  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        think: false,
        keep_alive: keepAlive,
        format: DELTA_REVIEW_SCHEMA,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: JSON.stringify(prompt, null, 2), images },
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
    if (!content) throw new Error('Ollama returned no delta-review content.');
    rawReview = JSON.parse(content);
    assertDeltaReview(rawReview);
    rawReview.provider = 'ollama';
    rawReview.model = payload.model ?? model;
  } catch (error) {
    const skipped = {
      status: 'SKIPPED',
      reason: `Ollama evidence-aware delta review failed: ${errorMessage(error)}`,
      advisoryOnly: true,
      findings: [],
      materialAssessments: [],
      recommendations: [],
      motionStateEvidence: motionStates,
    };
    persistFinalReport({ report, reportPath, ai: skipped });
    console.log(`[skip] Delta vision review: ${skipped.reason}`);
    if (options.requireAi) process.exitCode = 3;
    return;
  }

  const normalized = normalizeDeltaReview({
    ...rawReview,
    advisoryOnly: true,
    elapsedMs: Date.now() - startedAt,
    evidence: imageRecords,
    motionStateEvidence: motionStates,
    evidencePolicy: 'paired-normal-frozen-difference-v1',
  });
  const deltaReportPath = join(
    previewDirectory,
    'ollama-delta-review-evidence.json',
  );
  writeFileSync(deltaReportPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  persistFinalReport({ report, reportPath, ai: normalized, deltaReportPath });

  console.log(
    `[ai] ${normalized.status} · raw ${normalized.rawStatus} · confidence ${Math.round(normalized.confidence * 100)}% · ${(normalized.elapsedMs / 1000).toFixed(1)}s`,
  );
  console.log(`     ${normalized.summary}`);
  for (const finding of normalized.findings) {
    console.log(
      `     - ${finding.severity.toUpperCase()} ${finding.origin} ${finding.category}${finding.layerId ? ` (${finding.layerId})` : ''}: ${finding.description}`,
    );
  }
  console.log(
    `     blocking findings: ${normalized.deltaPolicy.blockingFindingCount}; source-baseline advisories: ${normalized.deltaPolicy.sourceBaselineFindingCount}`,
  );
  console.log(`Delta report: ${deltaReportPath}`);
}

function persistFinalReport({ report, reportPath, ai, deltaReportPath = null }) {
  const deterministicPass = report.deterministic?.pass === true;
  const aiBlocking = ['REVIEW_REQUIRED', 'FAIL_ADVISORY'].includes(ai.status);
  const aiUnavailable = ai.status === 'SKIPPED';
  report.schemaVersion = Math.max(Number(report.schemaVersion ?? 1), 5);
  report.finalState = !deterministicPass
    ? 'DETERMINISTIC_FAIL'
    : aiBlocking || aiUnavailable
      ? 'REVIEW_REQUIRED'
      : 'READY_FOR_HUMAN_REVIEW';
  report.ai = ai;
  report.deltaVisionReportPath = deltaReportPath;
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log('');
  console.log(`FINAL STATE: ${report.finalState.replaceAll('_', ' ')}`);
  console.log(`Report: ${reportPath}`);
  console.log('No candidate was promoted and no human approval was recorded.');
}

function summarizeContainment(containmentQa) {
  return (containmentQa?.targets ?? []).map((target) => ({
    layerId: target.layerId,
    pass: target.pass,
    beats: (target.comparisons ?? []).map((comparison) => ({
      id: comparison.id,
      frame: comparison.frame,
      spillPixels: comparison.spillPixels,
      changedPixels: comparison.changedPixels,
      spillRatio: comparison.spillRatio,
    })),
  }));
}

function relevantStyleRules(styleLibrary, shot) {
  const materials = new Set((shot.layers ?? []).map((layer) => layer.material));
  return (styleLibrary.decisions ?? [])
    .filter((decision) => {
      if (!['approved', 'provisional'].includes(decision.state)) return false;
      const scope = decision.scope ?? {};
      return (
        scope.type === 'project' ||
        scope.type === 'reel' ||
        (scope.type === 'shot' && scope.shotId === shot.shotId) ||
        (scope.type === 'material' && materials.has(scope.material))
      );
    })
    .map((decision) => ({
      id: decision.id,
      state: decision.state,
      path: decision.path,
      value: decision.value,
      rationale: decision.rationale,
    }));
}

function pushIfExists(records, record) {
  if (typeof record.path === 'string' && record.path && existsSync(record.path)) {
    records.push(record);
  }
}

function selectFrameEvidence(frames) {
  const sorted = [...frames].sort(
    (a, b) => Number(a.progress ?? 0) - Number(b.progress ?? 0),
  );
  if (sorted.length <= 3) return sorted;
  return [sorted[0], sorted[Math.floor(sorted.length / 2)], sorted[sorted.length - 1]];
}

function resolveEvidencePath(parent, rawPath) {
  if (typeof rawPath !== 'string' || !rawPath) return undefined;
  return isAbsolute(rawPath) ? resolve(rawPath) : resolve(parent, rawPath);
}

function assertDeltaReview(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Delta vision review is not an object.');
  }
  if (!['PASS_ADVISORY', 'REVIEW_REQUIRED', 'FAIL_ADVISORY'].includes(value.status)) {
    throw new Error(`Invalid delta review status ${value.status}.`);
  }
  if (!Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) {
    throw new Error('Delta review confidence must be between 0 and 1.');
  }
  if (!Array.isArray(value.findings)) throw new Error('Delta review findings are missing.');
  if (!Array.isArray(value.materialAssessments) || !Array.isArray(value.recommendations)) {
    throw new Error('Delta review material assessments/recommendations are missing.');
  }
}

function parseOptions(args) {
  const result = { shotNumber: 0, previewDir: undefined, requireAi: false };
  for (const arg of args) {
    if (arg.startsWith('--shot=')) {
      const value = Number(arg.slice('--shot='.length));
      if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid ${arg}`);
      result.shotNumber = value;
    } else if (arg.startsWith('--preview-dir=')) {
      result.previewDir = arg.slice('--preview-dir='.length);
    } else if (arg === '--require-ai') {
      result.requireAi = true;
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
