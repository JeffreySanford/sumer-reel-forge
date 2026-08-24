import {
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { newestCompletePreviewDirectory } from './verify-material-local-motion.mjs';

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

export function normalizeDeltaReview(review) {
  const findings = Array.isArray(review?.findings) ? review.findings : [];
  const blockingFindings = findings.filter(
    (finding) =>
      ['medium', 'high'].includes(finding.severity) &&
      finding.origin !== 'source-baseline',
  );
  const sourceBaselineFindings = findings.filter(
    (finding) => finding.origin === 'source-baseline',
  );

  let effectiveStatus = review.status;
  if (!blockingFindings.length) {
    effectiveStatus = 'PASS_ADVISORY';
  } else if (effectiveStatus === 'PASS_ADVISORY') {
    effectiveStatus = 'REVIEW_REQUIRED';
  }

  return {
    ...review,
    rawStatus: review.status,
    status: effectiveStatus,
    deltaPolicy: {
      blockingFindingCount: blockingFindings.length,
      sourceBaselineFindingCount: sourceBaselineFindings.length,
      blockingFindingIndexes: blockingFindings.map((finding) => findings.indexOf(finding)),
      sourceBaselineFindingIndexes: sourceBaselineFindings.map((finding) =>
        findings.indexOf(finding),
      ),
      rule:
        'Only medium/high findings attributed to animation-introduced or uncertain changes can block readiness. Source-baseline findings are advisory because editorial-v1 is immutable and authoritative.',
    },
  };
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
  if (!shot) throw new Error(`Shot ${options.shotNumber} is not present in animation-v1 manifest.`);

  const model = process.env.OLLAMA_VISION_MODEL ?? 'qwen3-vl:4b-instruct';
  const baseUrl = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(
    /\/$/,
    '',
  );
  const timeoutMs = positiveInteger(process.env.PLANNING_TIMEOUT_MS, 300000);
  const keepAlive = process.env.OLLAMA_KEEP_ALIVE ?? '10m';

  const availability = await verifyOllama({ baseUrl, model, timeoutMs });
  if (!availability.ok) {
    const skipped = {
      status: 'SKIPPED',
      reason: availability.reason,
      advisoryOnly: true,
      findings: [],
      materialAssessments: [],
      recommendations: [],
    };
    persistFinalReport({ report, reportPath, ai: skipped });
    console.log(`[skip] Delta vision review: ${availability.reason}`);
    if (options.requireAi) process.exitCode = 3;
    return;
  }

  const materialQa = existsSync(join(previewDirectory, 'material-motion-qa.json'))
    ? JSON.parse(readFileSync(join(previewDirectory, 'material-motion-qa.json'), 'utf8'))
    : null;
  const containmentQa = existsSync(join(previewDirectory, 'contained-material-boundary-qa.json'))
    ? JSON.parse(
        readFileSync(join(previewDirectory, 'contained-material-boundary-qa.json'), 'utf8'),
      )
    : null;
  const styleLibrary = JSON.parse(readFileSync(STYLE_DECISIONS, 'utf8'));
  const styleRules = relevantStyleRules(styleLibrary, shot);
  const imageRecords = collectEvidence({
    previewDirectory,
    previewManifest,
    shot,
    materialQa,
  });
  const images = imageRecords.map((item) => readFileSync(item.path).toString('base64'));

  const system = [
    'You are the source-aware delta critic for Sumer Reel Forge.',
    'Return only JSON conforming to the supplied schema.',
    'The first image labeled approved editorial source is immutable editorial-v1 and is the visual baseline, not a candidate to redesign.',
    'Your job is to identify defects introduced or materially worsened by animation relative to that baseline.',
    'Every finding must classify origin as animation-introduced, source-baseline, or uncertain.',
    'A pre-existing composition, pose, tableau quality, missing object, or narrative limitation visible in editorial-v1 must be source-baseline and cannot by itself justify REVIEW_REQUIRED.',
    'Optional or deferred layers being absent are not defects unless animation itself creates a new contradiction.',
    'Only medium/high animation-introduced or uncertain findings should drive REVIEW_REQUIRED or FAIL_ADVISORY.',
    'Do not penalize a candidate merely because deterministic QA reports camera motion; judge whether that camera motion introduces a visible defect relative to the baseline.',
    'Flag animation-introduced translated-card motion, mask bleed, edge ghosts, diagonal streaks, identity drift, boundary leakage, implausible physical behavior, or motion that becomes distracting or visually static.',
    'You may critique and recommend; you may never approve, promote, redraw, or mutate editorial-v1.',
  ].join(' ');

  const user = JSON.stringify(
    {
      task:
        'Compare the immutable editorial source with the candidate evidence and critique only the visual delta introduced by animation.',
      imageOrder: imageRecords.map((item, index) => ({ index, label: item.label })),
      immutableSourcePolicy: {
        editorialVersion: 'editorial-v1',
        sourceFrame: shot.sourceFrame,
        sourceIsAuthoritative: true,
        sourceCompositionIsNotAReviewFailure: true,
      },
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
      deterministicQa: {
        pass: report.deterministic?.pass === true,
        aggregateSceneMotion: report.deterministic?.aggregateSceneMotion ?? null,
        materialLocalMotion: report.deterministic?.materialLocalMotion ?? null,
        containedMaterialBoundary: containmentQa,
      },
      styleRules,
      reviewRubric: [
        'identify only animation-introduced or animation-worsened defects',
        'preserve source identity and immutable composition',
        'keep stillness anchors stable',
        'keep contained material motion inside physical boundaries',
        'avoid translated-card motion, edge ghosts, streaks, bleed, and duplicated edges',
        'keep motion perceptible but subordinate to the source narrative',
      ],
    },
    null,
    2,
  );

  console.log(
    `[ai] Delta vision critic: ${model} · ${imageRecords.length} evidence images · timeout ${Math.round(timeoutMs / 1000)}s`,
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
    if (!content) throw new Error('Ollama returned no delta-review content.');
    rawReview = JSON.parse(content);
    assertDeltaReview(rawReview);
    rawReview.provider = 'ollama';
    rawReview.model = payload.model ?? model;
  } catch (error) {
    const skipped = {
      status: 'SKIPPED',
      reason: `Ollama delta vision review failed: ${errorMessage(error)}`,
      advisoryOnly: true,
      findings: [],
      materialAssessments: [],
      recommendations: [],
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
  });
  const deltaReportPath = join(previewDirectory, 'ollama-delta-review.json');
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
  const containment = existsSync(join(report.previewDirectory, 'contained-material-boundary-qa.json'))
    ? JSON.parse(
        readFileSync(
          join(report.previewDirectory, 'contained-material-boundary-qa.json'),
          'utf8',
        ),
      )
    : null;
  const containmentPass = containment ? containment.pass === true : true;
  const aiBlocking = ['REVIEW_REQUIRED', 'FAIL_ADVISORY'].includes(ai.status);
  const aiUnavailable = ai.status === 'SKIPPED';
  const finalState = !deterministicPass || !containmentPass
    ? 'DETERMINISTIC_FAIL'
    : aiBlocking
      ? 'REVIEW_REQUIRED'
      : aiUnavailable
        ? 'REVIEW_REQUIRED'
        : 'READY_FOR_HUMAN_REVIEW';

  report.schemaVersion = Math.max(Number(report.schemaVersion ?? 1), 3);
  report.finalState = finalState;
  report.ai = ai;
  report.deltaVisionReportPath = deltaReportPath;
  report.deterministic = report.deterministic ?? {};
  report.deterministic.containedMaterialBoundary = containment
    ? {
        pass: containment.pass === true,
        applicable: containment.applicable !== false,
        reportPath: join(report.previewDirectory, 'contained-material-boundary-qa.json'),
      }
    : {
        pass: true,
        applicable: false,
        reportPath: null,
      };
  report.deterministic.pass = deterministicPass && containmentPass;
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log('');
  console.log(`FINAL STATE: ${finalState.replaceAll('_', ' ')}`);
  console.log(`Report: ${reportPath}`);
  console.log('No candidate was promoted and no human approval was recorded.');
}

async function verifyOllama({ baseUrl, model, timeoutMs }) {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(Math.min(timeoutMs, 5000)),
    });
    if (!response.ok) return { ok: false, reason: `Ollama tags returned HTTP ${response.status}.` };
    const tags = await response.json();
    const models = (tags.models ?? []).map((item) => item.name ?? item.model).filter(Boolean);
    if (!models.includes(model)) {
      return {
        ok: false,
        reason: `Configured vision model ${model} is not installed.`,
      };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: `Ollama is unavailable: ${errorMessage(error)}` };
  }
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

function collectEvidence({ previewDirectory, previewManifest, shot, materialQa }) {
  const records = [];
  const editorialPath = resolve('assets', shot.sourceFrame);
  if (existsSync(editorialPath)) {
    records.push({ label: 'approved editorial source', path: editorialPath });
  }

  const frames = Array.isArray(previewManifest.reviewFrames)
    ? [...previewManifest.reviewFrames].sort(
        (a, b) => Number(a.progress ?? 0) - Number(b.progress ?? 0),
      )
    : [];
  for (const frame of selectFrameEvidence(frames)) {
    const path = resolveEvidencePath(previewDirectory, frame.path);
    if (path && existsSync(path)) {
      records.push({
        label: `candidate review frame ${frame.id ?? frame.frame ?? 'unknown'} @ ${Math.round((frame.progress ?? 0) * 100)}%`,
        path,
      });
    }
  }

  const target = (materialQa?.targets ?? []).find(
    (item) => item.comparisons?.length,
  );
  if (target) {
    const strongest = [...target.comparisons].sort(
      (a, b) =>
        Number(b.meanAbsoluteDifference ?? 0) - Number(a.meanAbsoluteDifference ?? 0),
    )[0];
    if (strongest?.differencePath && existsSync(strongest.differencePath)) {
      records.push({
        label: `material-only animation delta ${target.layerId}`,
        path: strongest.differencePath,
      });
    }
  }

  if (records.length < 2) {
    throw new Error('Delta critic requires the editorial source plus candidate evidence.');
  }
  return records.slice(0, 5);
}

function selectFrameEvidence(frames) {
  if (frames.length <= 3) return frames;
  return [frames[0], frames[Math.floor(frames.length / 2)], frames[frames.length - 1]];
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
  for (const finding of value.findings) {
    if (!['animation-introduced', 'source-baseline', 'uncertain'].includes(finding.origin)) {
      throw new Error(`Invalid delta finding origin ${finding.origin}.`);
    }
  }
  if (!Array.isArray(value.materialAssessments) || !Array.isArray(value.recommendations)) {
    throw new Error('Delta review material assessments/recommendations are missing.');
  }
}

function parseOptions(args) {
  const result = {
    shotNumber: 0,
    previewDir: undefined,
    requireAi: false,
  };
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
