import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { withGpuAiTask } from '../runtime/gpu-ai-task.mjs';

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
const shotNumber = shotArg.slice('--shot='.length);

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

console.log('[review-runtime] Phase 1/4 · deterministic scene + material review');
const deterministicArgs = args.filter(
  (arg) => arg !== '--require-ai' && arg !== '--skip-ai',
);
deterministicArgs.push('--skip-ai');
const deterministicExit = await runNode(
  'tools/scripts/review-animation-shot.mjs',
  deterministicArgs,
  { suppressTerminalState: true },
);

if (deterministicExit === 1) {
  console.log('');
  console.log('FINAL STATE: REVIEW ERROR');
  process.exitCode = 1;
} else {
  console.log('');
  console.log(
    `PHASE 1 STATE: ${deterministicExit === 0 ? 'DETERMINISTIC PASS' : 'DETERMINISTIC FAIL'}`,
  );

  console.log('');
  console.log('[review-runtime] Phase 2/4 · contained-material boundary review');
  const containmentArgs = [shotArg];
  if (previewArg) containmentArgs.push(previewArg);
  const containmentExit = await runNode(
    'tools/scripts/verify-contained-material-boundary.mjs',
    containmentArgs,
  );
  console.log(
    `PHASE 2 STATE: ${containmentExit === 0 ? 'CONTAINMENT PASS' : 'CONTAINMENT FAIL'}`,
  );

  if (deterministicExit !== 0 || containmentExit !== 0) {
    console.log(
      '[review-runtime] Hard deterministic gates are not clean; delta vision critique is skipped.',
    );
    console.log('');
    console.log('FINAL STATE: DETERMINISTIC FAIL');
    process.exitCode = 2;
  } else {
    let deltaExit = 0;

    if (skipAi) {
      console.log('');
      console.log('[review-runtime] Phase 3/4 · delta vision review skipped by --skip-ai');
      console.log('PHASE 3 STATE: AI SKIPPED');
    } else {
      console.log('');
      console.log('[review-runtime] Phase 3/4 · evidence-aware source delta vision review');

      deltaExit = await withGpuAiTask(
        {
          owner: 'animation-shot-review',
          task: `shot-${shotNumber}-delta-vision-review`,
          backend: 'ollama',
          model,
          timeoutMs: positiveInteger(
            process.env.SRF_GPU_LEASE_TIMEOUT_MS,
            visionTimeoutMs,
          ),
        },
        async (lease) => {
          console.log(
            `[review-runtime] GPU lease acquired for ${lease.metadata.task} · model ${model ?? 'default'} · expires ${lease.metadata.expiresAt}.`,
          );

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
          return runNode(
            'tools/scripts/review-animation-shot-delta-vision-evidence.mjs',
            deltaArgs,
            { suppressTerminalState: true },
          );
        },
      );

      if (deltaExit === 1) {
        console.log('');
        console.log('FINAL STATE: REVIEW ERROR');
        process.exitCode = 1;
      } else {
        console.log(
          `PHASE 3 STATE: ${deltaExit === 3 ? 'AI UNAVAILABLE' : 'AI CRITIQUE COMPLETE'}`,
        );
      }
    }

    if (deltaExit !== 1) {
      console.log('');
      console.log(
        '[review-runtime] Phase 4/4 · deterministic-evidence reconciliation + final state',
      );
      const reconciliationArgs = [shotArg];
      if (previewArg) reconciliationArgs.push(previewArg);
      if (requireAi) reconciliationArgs.push('--require-ai');
      const reconciliationExit = await runNode(
        'tools/scripts/reconcile-animation-review-evidence.mjs',
        reconciliationArgs,
      );
      process.exitCode = deltaExit === 3 ? 3 : reconciliationExit;
    }
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

async function runNode(
  scriptPath,
  scriptArgs,
  { suppressTerminalState = false } = {},
) {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      process.execPath,
      [resolve(scriptPath), ...scriptArgs],
      {
        cwd: resolve('.'),
        env: process.env,
        stdio: suppressTerminalState
          ? ['inherit', 'pipe', 'inherit']
          : 'inherit',
        windowsHide: true,
      },
    );

    if (suppressTerminalState && child.stdout) {
      const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
      lines.on('line', (line) => {
        if (line.startsWith('FINAL STATE:')) return;
        if (
          line ===
          'No candidate was promoted and no human approval was recorded.'
        ) {
          return;
        }
        console.log(line);
      });
    }

    child.once('error', rejectPromise);
    child.once('close', (code, signal) => {
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
