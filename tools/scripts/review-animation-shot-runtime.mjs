import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

loadLocalEnvFile();

process.env.OLLAMA_VISION_MODEL ??= 'qwen3-vl:4b-instruct';
process.env.OLLAMA_TEXT_MODEL ??= 'qwen3:8b';
process.env.OLLAMA_BASE_URL ??= 'http://localhost:11434';
process.env.OLLAMA_KEEP_ALIVE ??= '10m';

const visionTimeoutMs = positiveInteger(
  process.env.OLLAMA_VISION_TIMEOUT_MS,
  300000,
);
process.env.PLANNING_TIMEOUT_MS = String(visionTimeoutMs);

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const skipAi = args.includes('--skip-ai');
const requireAi = args.includes('--require-ai');
const shotArg = args.find((arg) => arg.startsWith('--shot='));
const previewArg = args.find((arg) => arg.startsWith('--preview-dir='));
if (!shotArg) throw new Error('--shot=<number> is required.');

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

console.log('[review-runtime] Phase 1/3 · deterministic scene + material review');
const deterministicArgs = args.filter(
  (arg) => arg !== '--require-ai' && arg !== '--skip-ai',
);
deterministicArgs.push('--skip-ai');
const deterministicExit = await runNode(
  'tools/scripts/review-animation-shot.mjs',
  deterministicArgs,
);
if (deterministicExit === 1) {
  process.exitCode = 1;
} else {
  console.log('');
  console.log('[review-runtime] Phase 2/3 · contained-material boundary review');
  const containmentArgs = [shotArg];
  if (previewArg) containmentArgs.push(previewArg);
  const containmentExit = await runNode(
    'tools/scripts/verify-contained-material-boundary.mjs',
    containmentArgs,
  );

  if (deterministicExit !== 0 || containmentExit !== 0) {
    console.log(
      '[review-runtime] Deterministic review is not clean; delta vision critique is skipped until hard gates pass.',
    );
    process.exitCode = 2;
  } else if (skipAi) {
    console.log('');
    console.log('[review-runtime] Phase 3/3 · delta vision review skipped by --skip-ai');
    process.exitCode = 0;
  } else {
    console.log('');
    console.log('[review-runtime] Phase 3/3 · source-aware delta vision review');
    if (model) {
      await warmVisionModel().catch((error) => {
        console.warn(
          `[review-runtime] Vision warm-up did not complete: ${errorMessage(error)}`,
        );
      });
    }

    const deltaArgs = [shotArg];
    if (previewArg) deltaArgs.push(previewArg);
    if (requireAi) deltaArgs.push('--require-ai');
    const deltaExit = await runNode(
      'tools/scripts/review-animation-shot-delta-vision.mjs',
      deltaArgs,
    );
    process.exitCode = deltaExit;
  }
}

async function warmVisionModel() {
  console.log(
    `[review-runtime] Warming ${model} for delta vision review (load timeout ${Math.round(loadTimeoutMs / 1000)}s, review timeout ${Math.round(visionTimeoutMs / 1000)}s)...`,
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

async function runNode(scriptPath, scriptArgs) {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      process.execPath,
      [resolve(scriptPath), ...scriptArgs],
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
        console.error(`[review-runtime] ${scriptPath} exited with signal ${signal}.`);
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
