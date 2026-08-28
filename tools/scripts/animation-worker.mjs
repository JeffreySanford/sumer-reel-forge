import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const apiBase = (process.env.API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');
const workerId = process.env.ANIMATION_WORKER_ID ?? 'local-animation-worker';
const pollMs = positiveInt(process.env.ANIMATION_WORKER_POLL_MS, 5000);
const heartbeatMs = positiveInt(process.env.ANIMATION_WORKER_HEARTBEAT_MS, 15000);
const once = process.argv.includes('--once');

const PLAN_SCRIPT = resolve('tools/scripts/plan-animation-shot.mjs');
const LANE_SCRIPT = resolve('tools/scripts/run-animation-production-lane.mjs');
const CANDIDATES_SCRIPT = resolve('tools/scripts/run-animation-shot-candidates.mjs');

console.log(`Animation worker ${workerId} polling ${apiBase}.`);
console.log('Safety: worker delegates production logic; it never promotes animation-v1.');

let stopping = false;
process.once('SIGINT', () => { stopping = true; });
process.once('SIGTERM', () => { stopping = true; });

while (!stopping) {
  const job = await claim();
  if (!job) {
    if (once) break;
    await delay(pollMs);
    continue;
  }
  await executeJob(job);
  if (once) break;
}

async function executeJob(job) {
  await log(job.id, 'info', 'system', `Claimed ${job.operation} for Shot ${job.shot}${job.layer ? ` / ${job.layer}` : ''}.`);
  const heartbeat = setInterval(() => {
    request(`/animation-jobs/${job.id}/heartbeat`, {
      method: 'PATCH',
      body: { notes: 'Animation worker heartbeat.' },
    }).catch((error) => console.error(`[${job.id}] heartbeat failed: ${error.message}`));
  }, heartbeatMs);
  heartbeat.unref?.();

  try {
    const command = commandFor(job);
    await runCommand(job, command);
    await request(`/animation-jobs/${job.id}/status`, {
      method: 'PATCH',
      body: {
        status: 'complete',
        notes: 'Animation operation completed. Candidate artifacts remain outside animation-v1 pending human review.',
      },
    });
    await log(job.id, 'info', 'system', 'Animation operation completed; no promotion occurred.');
  } catch (error) {
    const message = truncate(error instanceof Error ? error.message : String(error), 1000);
    await request(`/animation-jobs/${job.id}/status`, {
      method: 'PATCH',
      body: { status: 'failed', notes: message },
    }).catch(() => undefined);
    await log(job.id, 'error', 'system', message).catch(() => undefined);
  } finally {
    clearInterval(heartbeat);
  }
}

function commandFor(job) {
  if (job.operation === 'plan') {
    return [process.execPath, PLAN_SCRIPT, `--shot=${job.shot}`];
  }
  if (job.operation === 'candidates') {
    return [process.execPath, CANDIDATES_SCRIPT, `--shot=${job.shot}`];
  }
  if (!job.layer) throw new Error(`${job.operation} requires a layer id.`);
  return [process.execPath, LANE_SCRIPT, job.operation, `--shot=${job.shot}`, `--layer=${job.layer}`];
}

async function runCommand(job, [command, ...args]) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: { ...process.env, SRF_NO_OPEN: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    const pending = new Set();
    const persist = (level, stream, line) => {
      const promise = log(job.id, level, stream, line);
      pending.add(promise);
      promise.finally(() => pending.delete(promise));
    };
    pipeLines(child.stdout, (line) => {
      console.log(`[${job.id}] ${line}`);
      persist('info', 'stdout', line);
    });
    pipeLines(child.stderr, (line) => {
      console.error(`[${job.id}] ${line}`);
      persist('error', 'stderr', line);
    });
    child.once('error', rejectPromise);
    child.once('exit', async (code, signal) => {
      await Promise.allSettled([...pending]);
      if (code === 0) return resolvePromise();
      rejectPromise(new Error(`Animation command failed with ${signal ? `signal ${signal}` : `exit code ${code ?? 'unknown'}`}. Review persisted stdout/stderr; deterministic QA failures are not auto-retried.`));
    });
  });
}

function pipeLines(stream, onLine) {
  let buffer = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) if (line.trim()) onLine(truncate(line, 4000));
  });
  stream.on('end', () => {
    if (buffer.trim()) onLine(truncate(buffer, 4000));
  });
}

async function claim() {
  return request('/animation-jobs/claim', {
    method: 'POST',
    body: { workerId },
    allowEmpty: true,
  });
}

function log(jobId, level, stream, message) {
  return request(`/animation-jobs/${jobId}/logs`, {
    method: 'POST',
    body: { workerId, level, stream, message: truncate(message, 4000) },
  });
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    method: options.method ?? 'GET',
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${path} failed (${response.status}): ${text}`);
  if (!text.trim()) return options.allowEmpty ? null : undefined;
  return JSON.parse(text);
}

function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function truncate(value, max) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function delay(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}
