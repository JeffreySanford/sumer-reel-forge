import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  acquireGpuLease,
  inspectGpuLease,
  refreshGpuLease,
  releaseGpuLease,
} from '../runtime/gpu-resource-lease.mjs';

async function withTempLease(t) {
  const root = await mkdtemp(join(tmpdir(), 'srf-gpu-lease-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return join(root, 'gpu-lease');
}

test('GPU lease acquires atomically and releases only its own token', async (t) => {
  const leaseDirectory = await withTempLease(t);
  const lease = await acquireGpuLease({
    leaseDirectory,
    owner: 'test-owner',
    task: 'vision-review',
    backend: 'ollama',
    model: 'qwen3-vl:4b-instruct',
    timeoutMs: 100,
    leaseMs: 5_000,
    pollMs: 10,
  });
  const active = await inspectGpuLease(leaseDirectory);
  assert.equal(active.stale, false);
  assert.equal(active.metadata.token, lease.metadata.token);
  assert.equal(active.metadata.backend, 'ollama');

  await assert.rejects(
    releaseGpuLease({
      ...lease,
      metadata: { ...lease.metadata, token: 'wrong-token' },
    }),
    /ownership changed/,
  );
  assert.ok(await inspectGpuLease(leaseDirectory));
  await releaseGpuLease(lease);
  assert.equal(await inspectGpuLease(leaseDirectory), null);
});

test('GPU lease times out instead of stealing an active owner', async (t) => {
  const leaseDirectory = await withTempLease(t);
  const lease = await acquireGpuLease({
    leaseDirectory,
    owner: 'first',
    task: 'comfy-generation',
    backend: 'comfyui',
    timeoutMs: 100,
    leaseMs: 5_000,
    pollMs: 10,
  });
  await assert.rejects(
    acquireGpuLease({
      leaseDirectory,
      owner: 'second',
      task: 'vision-review',
      backend: 'ollama',
      timeoutMs: 35,
      pollMs: 5,
    }),
    /Timed out waiting for GPU lease/,
  );
  await releaseGpuLease(lease);
});

test('expired GPU lease evidence is quarantined and recovered', async (t) => {
  const leaseDirectory = await withTempLease(t);
  await mkdir(leaseDirectory, { recursive: true });
  await writeFile(
    join(leaseDirectory, 'lease.json'),
    `${JSON.stringify({
      schemaVersion: 1,
      token: 'stale-token',
      owner: 'dead-owner',
      task: 'old-task',
      backend: 'ollama',
      pid: 99999999,
      host: 'other-host',
      acquiredAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2026-01-01T00:01:00.000Z',
    })}\n`,
    'utf8',
  );

  const lease = await acquireGpuLease({
    leaseDirectory,
    owner: 'new-owner',
    task: 'new-task',
    backend: 'comfyui',
    timeoutMs: 100,
    leaseMs: 5_000,
    pollMs: 5,
  });
  assert.notEqual(lease.metadata.token, 'stale-token');
  assert.equal(lease.metadata.owner, 'new-owner');
  await releaseGpuLease(lease);
});

test('GPU lease heartbeat extends expiry while preserving ownership', async (t) => {
  const leaseDirectory = await withTempLease(t);
  const lease = await acquireGpuLease({
    leaseDirectory,
    owner: 'heartbeat-owner',
    task: 'planning',
    backend: 'ollama',
    timeoutMs: 100,
    leaseMs: 1_000,
    pollMs: 5,
  });
  const before = Date.parse(lease.metadata.expiresAt);
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 5));
  await refreshGpuLease(lease, { leaseMs: 5_000 });
  assert.ok(Date.parse(lease.metadata.expiresAt) > before);
  assert.equal((await inspectGpuLease(leaseDirectory)).metadata.token, lease.metadata.token);
  await releaseGpuLease(lease);
});
