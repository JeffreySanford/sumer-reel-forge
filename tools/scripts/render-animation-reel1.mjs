import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { runProcess } from '../renderer/process-runner.mjs';

loadLocalEnvFile();

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000/api';
const episodeId = 1;
const maxWorkerRuns = Number(process.env.ANIMATION_RENDER_MAX_WORKER_RUNS ?? 6);
const existingJobId = process.env.ANIMATION_RENDER_JOB_ID;

const job = existingJobId
  ? await findJob(existingJobId)
  : await request('/render-jobs', {
      method: 'POST',
      body: {
        episodeId,
        mode: 'draft-video',
        pipeline: 'animation',
        notes:
          'Complete approved canonical Scene V2 Reel 1 animation routed through the renderer worker.',
      },
    });
const jobId = existingJobId ?? job?.id;
if (!jobId) {
  throw new Error('Animation Reel 1 job creation did not return a job id.');
}
assertKnownJob(jobId, job);
assertAnimationPipeline(jobId, job);
console.log(
  existingJobId
    ? `Using existing animation Reel 1 job ${jobId}.`
    : `Queued animation Reel 1 job ${jobId}.`,
);

await runWorkerUntilComplete(jobId);

const assets = await request(`/generated-assets?renderJobId=${jobId}`);
const video = assets.find(
  (asset) =>
    asset.assetType === 'video' &&
    asset.metadata?.adapter === 'animation' &&
    asset.metadata?.canonicalSceneV2 === true,
);
if (!video) {
  throw new Error(
    `Animation job ${jobId} did not persist a canonical Scene V2 animation video asset.`,
  );
}

const videoPath = fileURLToPath(video.uri);
const probe = await runProcess(
  process.env.FFPROBE_COMMAND ?? 'ffprobe',
  [
    '-v',
    'error',
    '-show_entries',
    'format=duration:stream=index,codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels,duration',
    '-of',
    'json',
    videoPath,
  ],
  { timeoutMs: 30000 },
);
const media = JSON.parse(probe.stdout);
const duration = Number(media.format?.duration);
const videoStream = media.streams?.find(
  (stream) => stream.codec_type === 'video',
);
const audioStream = media.streams?.find(
  (stream) => stream.codec_type === 'audio',
);
if (
  Math.abs(duration - 60) > 0.05 ||
  videoStream?.codec_name !== 'h264' ||
  videoStream?.width !== 1080 ||
  videoStream?.height !== 1920 ||
  audioStream?.codec_name !== 'aac' ||
  audioStream?.sample_rate !== '48000' ||
  audioStream?.channels !== 2
) {
  throw new Error(`Animation media validation failed: ${probe.stdout}`);
}

console.log(
  `Animation Reel 1 completed with ${assets.length} persisted assets.`,
);
console.log(`Video: ${videoPath}`);

function loadLocalEnvFile() {
  const envPath = resolve('.env');
  if (!existsSync(envPath)) return;
  if (typeof process.loadEnvFile !== 'function') {
    throw new Error(
      'Native .env loading requires Node 20.12 or newer. This workspace targets Node 22.',
    );
  }

  const inheritedEnvironment = { ...process.env };
  process.loadEnvFile(envPath);
  Object.assign(process.env, inheritedEnvironment);
}

function runWorker() {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      process.execPath,
      [resolve('tools/scripts/renderer-worker.mjs'), '--once'],
      {
        cwd: process.cwd(),
        env: { ...process.env, RENDER_ADAPTER: 'animation' },
        shell: false,
        stdio: 'inherit',
        windowsHide: true,
      },
    );
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`Renderer worker exited with code ${code}.`));
      }
    });
  });
}

async function runWorkerUntilComplete(targetJobId) {
  for (let attempt = 1; attempt <= maxWorkerRuns; attempt += 1) {
    const before = await findJob(targetJobId);
    assertKnownJob(targetJobId, before);
    assertAnimationPipeline(targetJobId, before);
    if (before.status === 'complete') {
      return before;
    }
    assertNotFailed(targetJobId, before);

    console.log(
      `Worker pass ${attempt}/${maxWorkerRuns}; target job ${targetJobId} is ${before.status}.`,
    );
    await runWorker();

    const after = await findJob(targetJobId);
    assertKnownJob(targetJobId, after);
    assertAnimationPipeline(targetJobId, after);
    if (after.status === 'complete') {
      return after;
    }
    assertNotFailed(targetJobId, after);
  }

  const last = await findJob(targetJobId);
  throw new Error(
    `Animation job ${targetJobId} ended in ${last?.status ?? 'unknown'} state after ${maxWorkerRuns} worker passes.`,
  );
}

async function findJob(targetJobId) {
  const jobs = await request(`/render-jobs?episodeId=${episodeId}`);
  return jobs.find((candidate) => candidate.id === targetJobId);
}

function assertKnownJob(targetJobId, jobRecord) {
  if (!jobRecord) {
    throw new Error(`Animation job ${targetJobId} was not found.`);
  }
}

function assertAnimationPipeline(targetJobId, jobRecord) {
  if (jobRecord.pipeline !== 'animation') {
    throw new Error(
      `Animation job ${targetJobId} is routed to ${jobRecord.pipeline ?? 'unknown'}, not animation. Refusing to render or accept an editorial fallback.`,
    );
  }
}

function assertNotFailed(targetJobId, jobRecord) {
  if (jobRecord.status === 'failed') {
    throw new Error(
      `Animation job ${targetJobId} failed: ${jobRecord.notes ?? 'no notes recorded'}`,
    );
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new Error(
      `${path} returned HTTP ${response.status}: ${await response.text()}`,
    );
  }
  return response.json();
}