import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { withGpuAiTask } from './gpu-ai-task.mjs';

const DEFAULT_GPU_TIMEOUT_MS = 10 * 60_000;

export async function runGpuManagedComfyUiScript(options = {}) {
  const args = (options.args ?? process.argv.slice(2)).filter((arg) => arg !== '--');
  const command = args[0] ?? options.defaultCommand ?? 'preflight';
  const leaseCommands = new Set(options.leaseCommands ?? ['generate']);
  const env = options.env ?? process.env;
  const enginePath = requiredString(options.enginePath, 'enginePath');
  const owner = requiredString(options.owner, 'owner');
  const task = resolveTask(options.task, { command, args });

  const execute = async () => {
    const exitCode = await runNodeScript(enginePath, args, env);
    if (exitCode !== 0 && leaseCommands.has(command)) {
      const error = new Error(`${enginePath} exited with code ${exitCode}.`);
      error.exitCode = exitCode;
      throw error;
    }
    return exitCode;
  };

  if (!leaseCommands.has(command)) {
    return execute();
  }

  return withGpuAiTask(
    {
      owner,
      task,
      backend: 'comfyui',
      env,
      timeoutMs: positiveInteger(
        options.timeoutMs ?? env.SRF_GPU_LEASE_TIMEOUT_MS,
        DEFAULT_GPU_TIMEOUT_MS,
      ),
    },
    async (lease) => {
      console.log(
        `[gpu] Lease acquired for ${lease.metadata.task} · backend comfyui · expires ${lease.metadata.expiresAt}.`,
      );
      return execute();
    },
  );
}

async function runNodeScript(enginePath, args, env) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [resolve(enginePath), ...args], {
      cwd: resolve('.'),
      env,
      stdio: 'inherit',
      windowsHide: true,
    });

    child.once('error', rejectPromise);
    child.once('close', (code, signal) => {
      if (signal) {
        console.error(`[gpu] ${enginePath} exited with signal ${signal}.`);
        resolvePromise(1);
        return;
      }
      resolvePromise(code ?? 1);
    });
  });
}

function resolveTask(task, context) {
  const value = typeof task === 'function' ? task(context) : task;
  return requiredString(value, 'task');
}

function requiredString(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Managed ComfyUI script ${name} is required.`);
  }
  return value.trim();
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
