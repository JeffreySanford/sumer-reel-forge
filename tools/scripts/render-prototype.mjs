import 'dotenv/config';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000/api';
const episodeId = Number(process.env.PROTOTYPE_EPISODE_ID ?? 1);

const job = await request('/render-jobs', {
  method: 'POST',
  body: {
    episodeId,
    mode: 'storyboard',
    notes: `Deterministic prototype for episode ${episodeId}.`,
  },
});
console.log(`Queued prototype job ${job.id}.`);

await runWorker();

const jobs = await request(`/render-jobs?episodeId=${episodeId}`);
const completed = jobs.find((candidate) => candidate.id === job.id);
if (completed?.status !== 'complete') {
  throw new Error(
    `Prototype job ${job.id} ended in ${completed?.status ?? 'unknown'} state.`,
  );
}
const assets = await request(`/generated-assets?renderJobId=${job.id}`);
if (!assets.some((asset) => asset.assetType === 'video')) {
  throw new Error(`Prototype job ${job.id} did not create a video asset.`);
}
console.log(
  `Prototype ${job.id} completed with ${assets.length} persisted assets.`,
);

function runWorker() {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      process.execPath,
      [resolve('tools/scripts/renderer-worker.mjs'), '--once'],
      {
        cwd: process.cwd(),
        env: process.env,
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
