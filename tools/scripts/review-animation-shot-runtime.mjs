import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

loadLocalEnvFile();

process.env.OLLAMA_VISION_MODEL ??= 'qwen3-vl:4b-instruct';
process.env.OLLAMA_TEXT_MODEL ??= 'qwen3:8b';
process.env.OLLAMA_BASE_URL ??= 'http://localhost:11434';
process.env.OLLAMA_KEEP_ALIVE ??= '10m';

// Keep normal planning latency independent from the heavier visual review path.
// The existing review implementation reads PLANNING_TIMEOUT_MS for its Ollama
// request, so the wrapper deliberately scopes that child value to the dedicated
// vision timeout instead of inheriting the normal text-planning timeout.
const visionTimeoutMs = positiveInteger(
  process.env.OLLAMA_VISION_TIMEOUT_MS,
  300000,
);
process.env.PLANNING_TIMEOUT_MS = String(visionTimeoutMs);

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const skipAi = args.includes('--skip-ai');
const model = process.env.OLLAMA_VISION_MODEL;
const baseUrl = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(
  /\/$/,
  '',
);
const keepAlive = process.env.OLLAMA_KEEP_ALIVE ?? '10m';
const loadTimeoutMs = positiveInteger(
  process.env.OLLAMA_VISION_LOAD_TIMEOUT_MS,
  180000,
);

if (!skipAi && model) {
  await warmVisionModel().catch((error) => {
    // The core review owns --require-ai semantics and will produce the canonical
    // REVIEW_REQUIRED/exit-3 result if Ollama remains unavailable. Warm-up is a
    // reliability optimization, not a separate approval gate.
    console.warn(
      `[review-runtime] Vision warm-up did not complete: ${errorMessage(error)}`,
    );
  });
}

const exitCode = await runReview();
process.exitCode = exitCode;

async function warmVisionModel() {
  console.log(
    `[review-runtime] Warming ${model} for vision review (load timeout ${Math.round(loadTimeoutMs / 1000)}s, review timeout ${Math.round(visionTimeoutMs / 1000)}s)...`,
  );
  const startedAt = Date.now();

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      keep_alive: keepAlive,
    }),
    signal: AbortSignal.timeout(loadTimeoutMs),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Ollama warm-up HTTP ${response.status}: ${text}`);
  }

  const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `[review-runtime] ${model} loaded and kept alive for ${keepAlive} (${elapsedSeconds}s).`,
  );
}

async function runReview() {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      process.execPath,
      [resolve('tools/scripts/review-animation-shot.mjs'), ...args],
      {
        cwd: resolve('.'),
        env: process.env,
        stdio: 'inherit',
        windowsHide: true,
      },
    );

    child.once('error', rejectPromise);
    child.once('exit', (code, signal) => {
      if (signal) {
        console.error(`[review-runtime] Review exited with signal ${signal}.`);
        resolvePromise(1);
        return;
      }
      resolvePromise(code ?? 1);
    });
  });
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

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
