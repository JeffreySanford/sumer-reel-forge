import { withGpuLease } from './gpu-resource-lease.mjs';
import {
  collectGpuRuntimeTelemetry,
  persistGpuTaskReceipt,
} from './gpu-runtime-telemetry.mjs';

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_LEASE_MS = 5 * 60_000;
const DEFAULT_POLL_MS = 250;

export async function withGpuAiTask(options = {}, work) {
  if (typeof work !== 'function') {
    throw new Error('withGpuAiTask requires a work function.');
  }

  const env = options.env ?? process.env;
  const telemetryEnabled =
    options.telemetry !== false && env.SRF_GPU_TASK_TELEMETRY !== 'false';
  const collectTelemetry =
    options.collectTelemetry ?? collectGpuRuntimeTelemetry;
  const persistTelemetry =
    options.persistTelemetry ?? persistGpuTaskReceipt;

  return withGpuLease(
    {
      leaseDirectory: options.leaseDirectory ?? env.SRF_GPU_LEASE_PATH,
      owner: requiredString(options.owner, 'owner'),
      task: requiredString(options.task, 'task'),
      backend: requiredString(options.backend, 'backend'),
      model: optionalString(options.model),
      timeoutMs: positiveInteger(
        options.timeoutMs ?? env.SRF_GPU_LEASE_TIMEOUT_MS,
        DEFAULT_TIMEOUT_MS,
      ),
      leaseMs: positiveInteger(
        options.leaseMs ?? env.SRF_GPU_LEASE_DURATION_MS,
        DEFAULT_LEASE_MS,
      ),
      pollMs: positiveInteger(
        options.pollMs ?? env.SRF_GPU_LEASE_POLL_MS,
        DEFAULT_POLL_MS,
      ),
    },
    async (lease) => {
      const startedAt = new Date().toISOString();
      const before = telemetryEnabled
        ? await safeCollectTelemetry(collectTelemetry, env)
        : null;
      let outcome = 'completed';
      let taskError;

      try {
        return await work(lease);
      } catch (error) {
        outcome = 'failed';
        taskError = error;
        throw error;
      } finally {
        if (telemetryEnabled) {
          const after = await safeCollectTelemetry(collectTelemetry, env);
          const completedAt = new Date().toISOString();
          const receipt = {
            schemaVersion: 1,
            type: 'gpu-ai-task',
            lease: { ...lease.metadata },
            startedAt,
            completedAt,
            outcome,
            error: taskError ? errorMessage(taskError) : null,
            before,
            after,
          };
          await safePersistTelemetry(persistTelemetry, receipt, {
            env,
            outputDirectory: options.telemetryDirectory,
          });
        }
      }
    },
  );
}

async function safeCollectTelemetry(collectTelemetry, env) {
  try {
    return await collectTelemetry({ env });
  } catch (error) {
    return {
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      captureError: errorMessage(error),
    };
  }
}

async function safePersistTelemetry(persistTelemetry, receipt, options) {
  try {
    return await persistTelemetry(receipt, options);
  } catch (error) {
    console.warn(
      `[gpu] Could not persist task telemetry: ${errorMessage(error)}`,
    );
    return undefined;
  }
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function requiredString(value, name) {
  const parsed = optionalString(value);
  if (!parsed) throw new Error(`GPU AI task ${name} is required.`);
  return parsed;
}

function optionalString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
