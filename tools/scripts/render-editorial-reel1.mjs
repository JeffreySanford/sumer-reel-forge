import 'dotenv/config';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { runProcess } from '../renderer/process-runner.mjs';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000/api';
const episodeId = 1;
const job = await request('/render-jobs', {
  method: 'POST',
  body: {
    episodeId,
    mode: 'draft-video',
    voice: process.env.EDITORIAL_VOICE ?? 'Microsoft Mark',
    notes:
      'Editorial v1 with approved visual-bible assets and provisional local narration.',
  },
});
console.log(`Queued editorial Reel 1 job ${job.id}.`);

await runWorker();

const jobs = await request(`/render-jobs?episodeId=${episodeId}`);
const completed = jobs.find((candidate) => candidate.id === job.id);
if (completed?.status !== 'complete') {
  throw new Error(
    `Editorial job ${job.id} ended in ${completed?.status ?? 'unknown'} state.`,
  );
}

const assets = await request(`/generated-assets?renderJobId=${job.id}`);
const video = assets.find((asset) => asset.assetType === 'video');
if (!video) {
  throw new Error(`Editorial job ${job.id} did not persist a video asset.`);
}
const videoPath = fileURLToPath(video.uri);
const probe = await runProcess(
  process.env.FFPROBE_COMMAND ?? 'ffprobe',
  [
    '-v',
    'error',
    '-show_entries',
    'format=duration:stream=index,codec_type,codec_name,width,height,r_frame_rate',
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
const subtitleStream = media.streams?.find(
  (stream) => stream.codec_type === 'subtitle',
);
if (
  Math.abs(duration - 60) > 0.02 ||
  videoStream?.codec_name !== 'h264' ||
  videoStream?.width !== 1080 ||
  videoStream?.height !== 1920 ||
  audioStream?.codec_name !== 'aac' ||
  subtitleStream?.codec_name !== 'mov_text'
) {
  throw new Error(`Editorial media validation failed: ${probe.stdout}`);
}

console.log(
  `Editorial Reel 1 completed with ${assets.length} persisted assets.`,
);
console.log(`Video: ${videoPath}`);

function runWorker() {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      process.execPath,
      [resolve('tools/scripts/renderer-worker.mjs'), '--once'],
      {
        cwd: process.cwd(),
        env: { ...process.env, RENDER_ADAPTER: 'editorial' },
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
