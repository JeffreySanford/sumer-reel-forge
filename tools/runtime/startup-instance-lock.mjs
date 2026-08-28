import { randomUUID } from 'node:crypto';
import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { hostname } from 'node:os';
import { dirname, resolve } from 'node:path';

export const DEFAULT_STARTUP_LOCK_DIRECTORY = resolve(
  process.env.SRF_STARTUP_LOCK_PATH ?? 'tmp/runtime/startup-instance',
);

const DEFAULT_UNCLAIMED_GRACE_MS = 5_000;

export function acquireStartupInstanceLock(options = {}) {
  const lockDirectory = resolve(
    options.lockDirectory ?? DEFAULT_STARTUP_LOCK_DIRECTORY,
  );
  const ownerPid = positiveInteger(options.pid, process.pid);
  const ownerHost = optionalString(options.host) ?? hostname();
  const ownerRoot = resolve(options.root ?? process.cwd());
  const now = typeof options.now === 'function' ? options.now : Date.now;
  const isProcessAlive =
    typeof options.isProcessAlive === 'function'
      ? options.isProcessAlive
      : defaultIsProcessAlive;
  const unclaimedGraceMs = positiveInteger(
    options.unclaimedGraceMs,
    DEFAULT_UNCLAIMED_GRACE_MS,
  );

  mkdirSync(dirname(lockDirectory), { recursive: true });

  while (true) {
    const token = randomUUID();
    try {
      mkdirSync(lockDirectory);
      const startedAtMs = now();
      const metadata = {
        schemaVersion: 1,
        token,
        pid: ownerPid,
        host: ownerHost,
        root: ownerRoot,
        startedAt: new Date(startedAtMs).toISOString(),
      };

      try {
        writeMetadata(lockDirectory, metadata);
      } catch (error) {
        rmSync(lockDirectory, { recursive: true, force: true });
        throw error;
      }

      return { lockDirectory, metadata };
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
    }

    const existing = inspectStartupInstanceLock(lockDirectory, {
      host: ownerHost,
      isProcessAlive,
      now,
      unclaimedGraceMs,
    });

    if (existing?.stale) {
      recoverStaleLock(lockDirectory);
      continue;
    }

    throw activeStartupError(existing, lockDirectory);
  }
}

export function inspectStartupInstanceLock(
  lockDirectory = DEFAULT_STARTUP_LOCK_DIRECTORY,
  options = {},
) {
  const directory = resolve(lockDirectory);
  const now = typeof options.now === 'function' ? options.now : Date.now;
  const currentHost = optionalString(options.host) ?? hostname();
  const isProcessAlive =
    typeof options.isProcessAlive === 'function'
      ? options.isProcessAlive
      : defaultIsProcessAlive;
  const unclaimedGraceMs = positiveInteger(
    options.unclaimedGraceMs,
    DEFAULT_UNCLAIMED_GRACE_MS,
  );

  let directoryStat;
  try {
    directoryStat = statSync(directory);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }

  const metadata = readMetadata(directory);
  if (!metadata) {
    return {
      lockDirectory: directory,
      metadata: null,
      stale: now() - directoryStat.mtimeMs > unclaimedGraceMs,
      reason: 'metadata-unavailable',
    };
  }

  if (metadata.host === currentHost && !isProcessAlive(metadata.pid)) {
    return {
      lockDirectory: directory,
      metadata,
      stale: true,
      reason: 'owner-process-not-alive',
    };
  }

  return {
    lockDirectory: directory,
    metadata,
    stale: false,
    reason: 'active',
  };
}

export function releaseStartupInstanceLock(lock) {
  assertLockHandle(lock);
  const metadata = readMetadata(lock.lockDirectory);
  if (!metadata || metadata.token !== lock.metadata.token) {
    throw new Error(
      'Startup lock ownership changed; refusing to remove another process lock.',
    );
  }

  rmSync(lock.lockDirectory, { recursive: true, force: true });
}

function recoverStaleLock(lockDirectory) {
  const quarantine = `${lockDirectory}.stale-${process.pid}-${randomUUID()}`;
  try {
    renameSync(lockDirectory, quarantine);
  } catch (error) {
    if (['ENOENT', 'EEXIST', 'ENOTEMPTY'].includes(error?.code)) return;
    throw error;
  }

  rmSync(quarantine, { recursive: true, force: true });
}

function activeStartupError(existing, lockDirectory) {
  if (existing?.metadata) {
    const { pid, host, root, startedAt } = existing.metadata;
    return new Error(
      `Another \`pnpm start:all\` instance already owns startup for ${root ?? 'this workspace'} ` +
        `(pid ${pid ?? 'unknown'} on ${host ?? 'unknown host'}, started ${startedAt ?? 'unknown'}). ` +
        `Stop that launcher before starting another. Lock: ${lockDirectory}`,
    );
  }

  return new Error(
    `Another \`pnpm start:all\` instance is acquiring startup ownership. ` +
      `Try again after that launcher exits. Lock: ${lockDirectory}`,
  );
}

function readMetadata(lockDirectory) {
  try {
    const parsed = JSON.parse(
      readFileSync(resolve(lockDirectory, 'lock.json'), 'utf8'),
    );
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    if (error?.code === 'ENOENT' || error instanceof SyntaxError) return null;
    throw error;
  }
}

function writeMetadata(lockDirectory, metadata) {
  writeFileSync(
    resolve(lockDirectory, 'lock.json'),
    `${JSON.stringify(metadata, null, 2)}\n`,
    'utf8',
  );
}

function defaultIsProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

function assertLockHandle(lock) {
  if (!lock?.lockDirectory || !lock?.metadata?.token) {
    throw new Error('Invalid startup lock handle.');
  }
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function optionalString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
