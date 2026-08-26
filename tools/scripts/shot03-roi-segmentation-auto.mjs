import { existsSync } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { maybeOpenReviewArtifacts } from './open-review-artifacts.mjs';

const ROOT = resolve('.');
const SEARCH_SCRIPT = resolve('tools/scripts/shot03-roi-segmentation-search.mjs');
const WORK_ROOT = resolve('tmp/animation-assets/resegmentation/shot03-roi-search');
const SOURCE_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-03.png',
);
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '');
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL ?? 'qwen3-vl:4b-instruct';
const TIMEOUT_MS = positiveInteger(process.env.PLANNING_TIMEOUT_MS, 300_000);

const REPAIR_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'threshold', 'paddings', 'reason', 'confidence'],
  properties: {
    action: { type: 'string', enum: ['retry', 'stop'] },
    threshold: { type: 'number', minimum: 0.05, maximum: 0.6 },
    paddings: {
      type: 'array',
      minItems: 1,
      maxItems: 4,
      items: { type: 'number', minimum: 0.05, maximum: 0.9 },
    },
    reason: { type: 'string' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
};

const options = parseOptions(process.argv.slice(2));

await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  console.log('Shot 3 ROI segmentation autopilot');
  console.log(`Max attempts: ${options.maxAttempts}`);
  console.log(`Initial threshold: ${options.threshold.toFixed(2)}`);
  console.log(`Initial paddings: ${options.paddings.map((value) => value.toFixed(2)).join(', ')}`);
  console.log('Policy: bounded parameter repair only; no canonical asset, manifest, or source-code mutation.');
  console.log('');

  console.log('[PREFLIGHT]');
  runSearch(['preflight', '--no-open']);
  console.log('[AUTO] preflight passed; starting generation.');

  let threshold = options.threshold;
  let paddings = [...options.paddings];
  let finalReport = null;
  const attempts = [];

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    console.log('');
    console.log(`===== AUTO ATTEMPT ${attempt}/${options.maxAttempts} =====`);
    console.log(`threshold=${threshold.toFixed(2)} · paddings=${paddings.map((value) => value.toFixed(2)).join(',')}`);

    const startedBefore = Date.now();
    const args = [
      'generate',
      `--threshold=${threshold}`,
      `--paddings=${paddings.join(',')}`,
      '--no-open',
    ];
    if (options.noAiReview) args.push('--no-ai-review');
    if (options.requireAiReview) args.push('--require-ai-review');
    runSearch(args);

    const reportPath = await newestReportAfter(startedBefore);
    const report = JSON.parse(await readFile(reportPath, 'utf8'));
    finalReport = { path: reportPath, report };
    const survivors = (report.results ?? []).filter((item) => item.structuralRisk !== 'HIGH');
    const bestByTarget = bestPerTarget(report.ranked ?? {});

    attempts.push({
      attempt,
      threshold,
      paddings,
      reportPath,
      survivorCount: survivors.length,
      bestByTarget: summarizeBest(bestByTarget),
      aiStatus: report.ai?.status ?? null,
    });

    console.log(`[AUTO] structural survivors: ${survivors.length}`);
    if (report.ai?.status) console.log(`[AUTO] local vision status: ${report.ai.status}`);

    const hasTargetSurvivor = ['vessel', 'enki'].every((target) =>
      survivors.some((item) => item.target === target),
    );
    const aiAllowsReview = !report.ai || report.ai.status === 'PASS_ADVISORY';

    if (hasTargetSurvivor && aiAllowsReview) {
      console.log('[AUTO] both targets have structural survivors and local vision is non-blocking.');
      console.log('[AUTO] stopping parameter search and opening final review package.');
      break;
    }

    if (attempt >= options.maxAttempts) {
      console.log('[AUTO] maximum attempt count reached.');
      break;
    }

    if (options.noAiRepair) {
      console.log('[AUTO] AI repair disabled; stopping after failed attempt.');
      break;
    }

    const repair = await proposeRepair({ report, reportPath, attempt, threshold, paddings });
    const repairPath = join(resolve(reportPath, '..'), `ollama-auto-repair-plan-attempt-${attempt}.json`);
    await writeFile(repairPath, `${JSON.stringify(repair, null, 2)}\n`, 'utf8');
    console.log(
      `[AUTO] Ollama repair plan: ${repair.action} · threshold=${repair.threshold.toFixed(2)} · paddings=${repair.paddings.map((value) => value.toFixed(2)).join(', ')} · confidence ${Math.round(repair.confidence * 100)}%`,
    );
    console.log(`       ${repair.reason}`);
    console.log(`       plan: ${repairPath}`);

    if (repair.action === 'stop') {
      console.log('[AUTO] Ollama recommends stopping parameter search rather than repeating an unproductive configuration family.');
      break;
    }

    threshold = clamp(round2(repair.threshold), 0.05, 0.6);
    paddings = uniqueSorted(repair.paddings.map((value) => clamp(round2(value), 0.05, 0.9)));
  }

  if (!finalReport) throw new Error('Autopilot did not produce a generation report.');

  const autopilotPath = join(resolve(finalReport.path, '..'), 'shot03-roi-autopilot.json');
  const receipt = {
    schemaVersion: 1,
    type: 'shot03-roi-segmentation-autopilot',
    generatedAt: new Date().toISOString(),
    maxAttempts: options.maxAttempts,
    attempts,
    finalReportPath: finalReport.path,
    canonicalAssetsMutated: false,
    canonicalManifestMutated: false,
    sourceCodeMutatedByOllama: false,
    automaticPromotionAllowed: false,
    humanReviewRequired: true,
  };
  await writeFile(autopilotPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');

  const finalRanked = finalReport.report.ranked ?? {};
  const reviewArtifacts = [
    finalReport.report.artifacts?.alphaContactSheet,
    finalRanked.vessel?.[0]?.registeredPath,
    finalRanked.enki?.[0]?.registeredPath,
  ].filter(Boolean);

  console.log('');
  console.log(`[INFO] autopilot receipt: ${autopilotPath}`);
  console.log(`[INFO] final search report: ${finalReport.path}`);
  await maybeOpenReviewArtifacts(reviewArtifacts, { enabled: !options.noOpen, delayMs: 120 });
}

function runSearch(args) {
  const result = spawnSync(process.execPath, [SEARCH_SCRIPT, ...args], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ROI segmentation search failed with exit ${result.status}.`);
  }
}

async function newestReportAfter(startedBefore) {
  const directories = (await readdir(WORK_ROOT, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(WORK_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));

  for (const directory of directories) {
    const path = join(directory, 'shot03-roi-segmentation-search.json');
    if (!existsSync(path)) continue;
    const report = JSON.parse(await readFile(path, 'utf8'));
    const generatedAt = Date.parse(report.generatedAt ?? '');
    if (Number.isFinite(generatedAt) && generatedAt >= startedBefore - 2_000) return path;
  }
  throw new Error(`No completed ROI segmentation report found after ${new Date(startedBefore).toISOString()}.`);
}

async function proposeRepair({ report, reportPath, attempt, threshold, paddings }) {
  const contactSheetPath = report.artifacts?.alphaContactSheet;
  if (!contactSheetPath || !existsSync(contactSheetPath)) {
    throw new Error('Cannot request Ollama repair plan without the generated alpha contact sheet.');
  }
  if (!existsSync(SOURCE_PATH)) throw new Error(`Source image missing: ${SOURCE_PATH}`);

  const images = [
    (await readFile(SOURCE_PATH)).toString('base64'),
    (await readFile(contactSheetPath)).toString('base64'),
  ];

  const compactResults = (report.results ?? []).map((item) => ({
    target: item.target,
    padding: item.padding,
    threshold: item.threshold,
    risk: item.structuralRisk,
    score: item.structuralScore,
    largestShare: item.registeredAnalysis?.largestComponentShare,
    significantComponents: item.registeredAnalysis?.significantComponentCount,
    cropEdge: item.cropAnalysis?.anyStrongTouchesEdge,
    bbox: item.registeredAnalysis?.largestComponentBbox,
  }));

  const system = [
    'You are the bounded segmentation tuning advisor for Sumer Reel Forge.',
    'Return only JSON conforming to the supplied schema.',
    'You may change only SAM threshold and ROI padding values.',
    'You may recommend stop when the evidence indicates this parameter family is unlikely to improve the semantic masks.',
    'Do not propose source-code edits, manifest edits, promotion, manual image editing, or arbitrary shell commands.',
    'Do not invent root causes. Base the next experiment only on visible alpha masks and deterministic measurements.',
    'Prefer changing spatial context before repeatedly nudging threshold when prior thresholds have plateaued.',
  ].join(' ');

  const user = {
    task: 'Choose the next bounded ROI segmentation experiment, or stop if another retry is not justified.',
    attempt,
    current: { threshold, paddings },
    deterministicResults: compactResults,
    priorVisionReview: report.ai ?? null,
    imageOrder: [
      'approved Shot 3 editorial source',
      'current ROI alpha contact sheet; white is selected alpha, black is transparent',
    ],
    constraints: {
      threshold: { min: 0.05, max: 0.6 },
      padding: { min: 0.05, max: 0.9, maxValues: 4 },
      noCodeMutation: true,
      noAutomaticPromotion: true,
    },
  };

  console.log('[AUTO] asking Ollama for bounded next-step parameters...');
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: VISION_MODEL,
      stream: false,
      think: false,
      keep_alive: process.env.OLLAMA_KEEP_ALIVE ?? '10m',
      format: REPAIR_SCHEMA,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(user, null, 2), images },
      ],
      options: { temperature: 0.1 },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Ollama repair proposal returned HTTP ${response.status}: ${await response.text()}`);
  }
  const payload = await response.json();
  const content = payload.message?.content;
  if (!content) throw new Error('Ollama returned no repair-plan content.');
  const plan = JSON.parse(content);
  assertRepairPlan(plan);
  return {
    ...plan,
    provider: 'ollama',
    model: payload.model ?? VISION_MODEL,
    generatedAt: new Date().toISOString(),
    sourceReportPath: reportPath,
  };
}

function assertRepairPlan(plan) {
  if (!['retry', 'stop'].includes(plan?.action)) throw new Error('Invalid Ollama repair action.');
  if (!Number.isFinite(plan.threshold) || plan.threshold < 0.05 || plan.threshold > 0.6) {
    throw new Error('Ollama repair threshold is outside the allowed range.');
  }
  if (
    !Array.isArray(plan.paddings) ||
    !plan.paddings.length ||
    plan.paddings.length > 4 ||
    plan.paddings.some((value) => !Number.isFinite(value) || value < 0.05 || value > 0.9)
  ) {
    throw new Error('Ollama repair paddings are outside the allowed range.');
  }
  if (typeof plan.reason !== 'string' || !plan.reason.trim()) throw new Error('Ollama repair plan requires a reason.');
  if (!Number.isFinite(plan.confidence) || plan.confidence < 0 || plan.confidence > 1) {
    throw new Error('Ollama repair confidence must be 0..1.');
  }
}

function bestPerTarget(ranked) {
  return Object.fromEntries(Object.entries(ranked).map(([target, items]) => [target, items?.[0] ?? null]));
}

function summarizeBest(bestByTarget) {
  return Object.fromEntries(
    Object.entries(bestByTarget).map(([target, item]) => [
      target,
      item
        ? {
            padding: item.padding,
            threshold: item.threshold,
            structuralRisk: item.structuralRisk,
            structuralScore: item.structuralScore,
            largestComponentShare: item.registeredAnalysis?.largestComponentShare,
            significantComponentCount: item.registeredAnalysis?.significantComponentCount,
            cropEdgeTouch: item.cropAnalysis?.anyStrongTouchesEdge,
          }
        : null,
    ]),
  );
}

function parseOptions(args) {
  const result = {
    maxAttempts: 3,
    threshold: 0.25,
    paddings: [0.15, 0.3, 0.5],
    noOpen: false,
    noAiReview: false,
    requireAiReview: false,
    noAiRepair: false,
  };
  for (const arg of args) {
    if (arg === '--no-open') result.noOpen = true;
    else if (arg === '--no-ai-review') result.noAiReview = true;
    else if (arg === '--require-ai-review') result.requireAiReview = true;
    else if (arg === '--no-ai-repair') result.noAiRepair = true;
    else if (arg.startsWith('--max-attempts=')) {
      const value = Number(arg.slice('--max-attempts='.length));
      if (!Number.isInteger(value) || value < 1 || value > 6) throw new Error('--max-attempts must be an integer from 1 to 6.');
      result.maxAttempts = value;
    } else if (arg.startsWith('--threshold=')) {
      const value = Number(arg.slice('--threshold='.length));
      if (!Number.isFinite(value) || value < 0.05 || value > 0.6) throw new Error('--threshold must be between 0.05 and 0.6.');
      result.threshold = value;
    } else if (arg.startsWith('--paddings=')) {
      const values = arg.slice('--paddings='.length).split(',').map((value) => Number(value.trim()));
      if (!values.length || values.length > 4 || values.some((value) => !Number.isFinite(value) || value < 0.05 || value > 0.9)) {
        throw new Error('--paddings must be 1-4 comma-separated numbers between 0.05 and 0.9.');
      }
      result.paddings = uniqueSorted(values);
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  return result;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a - b);
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
