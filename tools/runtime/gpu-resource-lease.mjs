import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export const DEFAULT_GPU_LEASE_DIRECTORY = resolve(
  process.env.SRF_GPU_LEASE_PATH ?? 'tmp/runtime/gpu-lease',
);

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_LEASE_MS = 5 * 60_000;
const DEFAULT_POLL_MS = 250;
const DEFAULT_UNCLAIMED_GRACE_MS = 5_000;

export async function acquireGpuLease(options = {}) {
  const leaseDirectory = resolve(options.leaseDirectory ?? DEFAULT_GPU_LEASE_DIRECTORY);
  const timeoutMs = positiveInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS);
  const leaseMs = positiveInteger(options.leaseMs, DEFAULT_LEASE_MS);
  const pollMs = positiveInteger(options.pollMs, DEFAULT_POLL_MS);
  const unclaimedGraceMs = positiveInteger(
    options.unclaimedGraceMs,
    DEFAULT_UNCLAIMED_GRACE_MS,
  );
  const startedAtMs = Date.now();
  const owner = requiredString(options.owner, 'owner');
  const task = requiredString(options.task, 'task');
  const backend = requiredString(options.backend, 'backend');

  await mkdir(dirname(leaseDirectory), { recursive: true });

  while (true) {
    const token = randomUUID();
    try {
      await mkdir(leaseDirectory);
      const acquiredAtMs = Date.now();
      const metadata = {
        schemaVersion: 1,
        token,
        owner,
        task,
        backend,
        model: optionalString(options.model),
        pid: process.pid,
        host: hostname(),
        acquiredAt: new Date(acquiredAtMs).toISOString(),
        expiresAt: new Date(acquiredAtMs + leaseMs).toISOString(),
      };
      await writeLeaseMetadata(leaseDirectory, metadata);
      return { leaseDirectory, metadata, leaseMs };
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
    }

    const existing = await inspectGpuLease(leaseDirectory, { unclaimedGraceMs });
    if (existing?.stale) {
      await recoverStaleLease(leaseDirectory);
      continue;
    }

    if (Date.now() - startedAtMs >= timeoutMs) {
      const detail = existing?.metadata
        ? `${existing.metadata.backend}:${existing.metadata.task} owned by ${existing.metadata.owner} pid=${existing.metadata.pid}`
        : 'lease directory exists without readable metadata';
      throw new Error(`Timed out waiting for GPU lease: ${detail}`);
    }
    await delay(pollMs);
  }
}

export async function inspectGpuLease(
  leaseDirectory = DEFAULT_GPU_LEASE_DIRECTORY,
  { unclaimedGraceMs = DEFAULT_UNCLAIMED_GRACE_MS } = {},
) {
  const directory = resolve(leaseDirectory);
  let directoryStat;
  try {
    directoryStat = await stat(directory);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }

  const metadata = await readLeaseMetadata(directory);
  if (!metadata) {
    return {
      leaseDirectory: directory,
      metadata: null,
      stale: Date.now() - directoryStat.mtimeMs > unclaimedGraceMs,
      reason: 'metadata-unavailable',
    };
  }

  const expiresAtMs = Date.parse(metadata.expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    return {
      leaseDirectory: directory,
      metadata,
      stale: true,
      reason: 'expired',
    };
  }

  if (metadata.host === hostname() && !isProcessAlive(metadata.pid)) {
    return {
      leaseDirectory: directory,
      metadata,
      stale: true,
      reason: 'owner-process-not-alive',
    };
  }

  return {
    leaseDirectory: directory,
    metadata,
    stale: false,
    reason: 'active',
  };
}

export async function refreshGpuLease(lease, { leaseMs = lease?.leaseMs } = {}) {
  assertLeaseHandle(lease);
  const active = await requireMatchingLease(lease);
  const duration = positiveInteger(leaseMs, DEFAULT_LEASE_MS);
  const now = Date.now();
  const metadata = {
    ...active,
    expiresAt: new Date(now + duration).toISOString(),
    heartbeatAt: new Date(now).toISOString(),
  };
  await writeLeaseMetadata(lease.leaseDirectory, metadata);
  lease.metadata = metadata;
  lease.leaseMs = duration;
  return lease;
}

export async function releaseGpuLease(lease) {
  assertLeaseHandle(lease);
  await requireMatchingLease(lease);
  await rm(lease.leaseDirectory, { recursive: true, force: true });
}

export async function withGpuLease(options, work) {
  if (typeof work !== 'function') throw new Error('withGpuLease requires a work function.');
  const lease = await acquireGpuLease(options);
  const heartbeatMs = Math.max(1_000, Math.floor(lease.leaseMs / 3));
  let heartbeatRunning = false;
  const timer = setInterval(() => {
    if (heartbeatRunning) return;
    heartbeatRunning = true;
    void refreshGpuLease(lease)
      .catch(() => undefined)
      .finally(() => {
        heartbeatRunning = false;
      });
  }, heartbeatMs);
  timer.unref?.();

  try {
    return await work(lease);
  } finally {
    clearInterval(timer);
    await releaseGpuLease(lease).catch(() => undefined);
  }
}

async function requireMatchingLease(lease) {
  const metadata = await readLeaseMetadata(lease.leaseDirectory);
  if (!metadata || metadata.token !== lease.metadata?.token) {
    throw new Error('GPU lease ownership changed; refusing to mutate another process lease.');
  }
  return metadata;
}

async function recoverStaleLease(leaseDirectory) {
  const quarantine = `${leaseDirectory}.stale-${process.pid}-${randomUUID()}`;
  try {
    await rename(leaseDirectory, quarantine);
  } catch (error) {
    if (['ENOENT', 'EEXIST', 'ENOTEMPTY'].includes(error?.code)) return;
    throw error;
  }
  await rm(quarantine, { recursive: true, force: true });
}

async function readLeaseMetadata(leaseDirectory) {
  try {
    const parsed = JSON.parse(await readFile(resolve(leaseDirectory, 'lease.json'), 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    if (error?.code === 'ENOENT' || error instanceof SyntaxError) return null;
    throw error;
  }
}

async function writeLeaseMetadata(leaseDirectory, metadata) {
  const target = resolve(leaseDirectory, 'lease.json');
  const temporary = resolve(
    leaseDirectory,
    `.lease-${process.pid}-${randomUUID()}.json`,
  );
  await writeFile(temporary, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  await rename(temporary, target);
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

function assertLeaseHandle(lease) {
  if (!lease?.leaseDirectory || !lease?.metadata?.token) {
    throw new Error('Invalid GPU lease handle.');
  }
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function requiredString(value, name) {
  const parsed = optionalString(value);
  if (!parsed) throw new Error(`GPU lease ${name} is required.`);
  return parsed;
}

function optionalString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}
