import { withGpuLease } from './gpu-resource-lease.mjs';

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_LEASE_MS = 5 * 60_000;
const DEFAULT_POLL_MS = 250;

export async function withGpuAiTask(options = {}, work) {
  if (typeof work !== 'function') {
    throw new Error('withGpuAiTask requires a work function.');
  }

  const env = options.env ?? process.env;
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
    work,
  );
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
