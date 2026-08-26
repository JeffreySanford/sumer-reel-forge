import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov']);
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const FFPROBE = process.env.FFPROBE_COMMAND ?? 'ffprobe';

const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'confidence', 'summary', 'findings', 'artifactAssessments', 'recommendations'],
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
        required: ['severity', 'category', 'artifact', 'description', 'evidence'],
        properties: {
          severity: { type: 'string', enum: ['info', 'low', 'medium', 'high'] },
          category: { type: 'string' },
          artifact: { type: 'string' },
          description: { type: 'string' },
          evidence: { type: 'string' },
        },
      },
    },
    artifactAssessments: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['artifact', 'status', 'notes'],
        properties: {
          artifact: { type: 'string' },
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

export async function reviewGeneratedMedia({
  artifacts,
  task,
  rubric = [],
  outputPath,
  requireAi = false,
  maxVideoSamples = 4,
} = {}) {
  if (!Array.isArray(artifacts) || !artifacts.length) {
    throw new Error('reviewGeneratedMedia requires at least one artifact.');
  }
  const normalized = artifacts.map((artifact, index) => normalizeArtifact(artifact, index));
  const evidenceDirectory = resolve(`${outputPath}.evidence`);
  mkdirSync(evidenceDirectory, { recursive: true });

  const imageRecords = [];
  for (const artifact of normalized) {
    if (IMAGE_EXTENSIONS.has(artifact.extension)) {
      imageRecords.push({
        label: artifact.label,
        sourceArtifact: artifact.path,
        path: artifact.path,
        kind: 'image',
      });
      continue;
    }
    if (VIDEO_EXTENSIONS.has(artifact.extension)) {
      imageRecords.push(...extractVideoEvidence(artifact, evidenceDirectory, maxVideoSamples));
      continue;
    }
    throw new Error(`Unsupported review artifact type: ${artifact.path}`);
  }

  const model = process.env.OLLAMA_VISION_MODEL ?? 'qwen3-vl:4b-instruct';
  const baseUrl = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '');
  const timeoutMs = positiveInteger(process.env.PLANNING_TIMEOUT_MS, 300000);
  const keepAlive = process.env.OLLAMA_KEEP_ALIVE ?? '10m';
  const availability = await verifyOllama({ baseUrl, model, timeoutMs });
  if (!availability.ok) {
    const skipped = {
      status: 'SKIPPED',
      reason: availability.reason,
      provider: 'ollama',
      model,
      advisoryOnly: true,
      evidence: imageRecords,
    };
    writeFileSync(outputPath, `${JSON.stringify(skipped, null, 2)}\n`, 'utf8');
    console.log(`[ai] SKIPPED · ${availability.reason}`);
    if (requireAi) throw new Error(availability.reason);
    return skipped;
  }

  const images = imageRecords.map((record) => readFileSync(record.path).toString('base64'));
  const system = [
    'You are the local visual QA critic for Sumer Reel Forge.',
    'Return only JSON conforming to the supplied schema.',
    'Treat deterministic measurements supplied by the caller as authoritative facts.',
    'Do not claim human approval or promote assets.',
    'Flag obvious segmentation contamination, disconnected fragments, edge artifacts, static-looking motion, ghosting, duplicated subjects, identity drift, or implausible compositing when supported by the evidence.',
    'For video evidence, each supplied image is a deterministic sampled frame from the named video artifact.',
    'Use REVIEW_REQUIRED or FAIL_ADVISORY for medium/high visible problems. PASS_ADVISORY only means suitable for human review.',
  ].join(' ');

  const prompt = {
    task: task ?? 'Review the generated visual artifacts for obvious defects before human review.',
    imageOrder: imageRecords.map((item, index) => ({
      index,
      label: item.label,
      kind: item.kind,
      sourceArtifact: item.sourceArtifact,
    })),
    rubric,
    policy: {
      advisoryOnly: true,
      humanReviewStillRequired: true,
      automaticPromotionForbidden: true,
    },
  };

  console.log(`[ai] Local media critic: ${model} · ${imageRecords.length} image evidence item(s)`);
  const startedAt = Date.now();
  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        think: false,
        keep_alive: keepAlive,
        format: REVIEW_SCHEMA,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: JSON.stringify(prompt, null, 2), images },
        ],
        options: { temperature: 0.1 },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    const payload = await response.json();
    const content = payload.message?.content;
    if (!content) throw new Error('Ollama returned no media-review content.');
    const review = JSON.parse(content);
    assertReview(review);
    const normalizedReview = {
      ...review,
      advisoryOnly: true,
      provider: 'ollama',
      model: payload.model ?? model,
      elapsedMs: Date.now() - startedAt,
      evidence: imageRecords,
    };
    writeFileSync(outputPath, `${JSON.stringify(normalizedReview, null, 2)}\n`, 'utf8');
    console.log(
      `[ai] ${normalizedReview.status} · confidence ${Math.round(normalizedReview.confidence * 100)}% · ${(normalizedReview.elapsedMs / 1000).toFixed(1)}s`,
    );
    console.log(`     ${normalizedReview.summary}`);
    for (const finding of normalizedReview.findings) {
      console.log(`     - ${finding.severity.toUpperCase()} ${finding.category}: ${finding.description}`);
    }
    console.log(`     report: ${outputPath}`);
    return normalizedReview;
  } catch (error) {
    const skipped = {
      status: 'SKIPPED',
      reason: `Ollama media review failed: ${errorMessage(error)}`,
      provider: 'ollama',
      model,
      advisoryOnly: true,
      evidence: imageRecords,
    };
    writeFileSync(outputPath, `${JSON.stringify(skipped, null, 2)}\n`, 'utf8');
    console.log(`[ai] SKIPPED · ${skipped.reason}`);
    if (requireAi) throw error;
    return skipped;
  }
}

function normalizeArtifact(artifact, index) {
  const value = typeof artifact === 'string' ? { path: artifact } : artifact ?? {};
  const path = resolve(String(value.path ?? ''));
  if (!path || !existsSync(path)) throw new Error(`Review artifact not found: ${path || `<index ${index}>`}`);
  return {
    path,
    label: value.label ?? `artifact ${index + 1}`,
    extension: extname(path).toLowerCase(),
  };
}

function extractVideoEvidence(artifact, evidenceDirectory, maxSamples) {
  const duration = videoDurationSeconds(artifact.path);
  const fractions = maxSamples <= 1 ? [0.5] : [0.1, 0.35, 0.65, 0.9].slice(0, maxSamples);
  return fractions.map((fraction, index) => {
    const second = Math.max(0, Math.min(duration - 0.001, duration * fraction));
    const outputPath = join(
      evidenceDirectory,
      `${safeName(artifact.label)}-${String(index + 1).padStart(2, '0')}.png`,
    );
    const result = spawnSync(
      FFMPEG,
      [
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',
        '-ss',
        second.toFixed(3),
        '-i',
        artifact.path,
        '-frames:v',
        '1',
        outputPath,
      ],
      { encoding: 'utf8', windowsHide: true, shell: false },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`FFmpeg could not sample ${artifact.path}: ${result.stderr || result.stdout}`);
    }
    return {
      label: `${artifact.label} sampled at ${(fraction * 100).toFixed(0)}%`,
      sourceArtifact: artifact.path,
      path: outputPath,
      kind: 'video-sample',
      second,
    };
  });
}

function videoDurationSeconds(path) {
  const result = spawnSync(
    FFPROBE,
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      path,
    ],
    { encoding: 'utf8', windowsHide: true, shell: false },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffprobe could not inspect ${path}: ${result.stderr || result.stdout}`);
  const duration = Number(String(result.stdout).trim());
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Could not determine video duration for ${path}.`);
  return duration;
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
      return { ok: false, reason: `Configured vision model ${model} is not installed.` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: `Ollama is unavailable: ${errorMessage(error)}` };
  }
}

function assertReview(review) {
  if (!['PASS_ADVISORY', 'REVIEW_REQUIRED', 'FAIL_ADVISORY'].includes(review?.status)) {
    throw new Error('Invalid media-review status.');
  }
  if (!Number.isFinite(review?.confidence) || review.confidence < 0 || review.confidence > 1) {
    throw new Error('Invalid media-review confidence.');
  }
  if (!Array.isArray(review?.findings) || !Array.isArray(review?.artifactAssessments) || !Array.isArray(review?.recommendations)) {
    throw new Error('Invalid media-review array fields.');
  }
}

function safeName(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'artifact';
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
