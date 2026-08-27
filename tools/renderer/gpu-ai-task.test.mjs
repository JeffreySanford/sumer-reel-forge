import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { inspectGpuLease } from '../runtime/gpu-resource-lease.mjs';
import { withGpuAiTask } from '../runtime/gpu-ai-task.mjs';

async function withTempLease(t) {
  const root = await mkdtemp(join(tmpdir(), 'srf-gpu-ai-task-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return join(root, 'gpu-lease');
}

test('GPU AI task wrapper holds one heartbeat-backed lease for the full task', async (t) => {
  const leaseDirectory = await withTempLease(t);
  let observed;

  const result = await withGpuAiTask(
    {
      leaseDirectory,
      owner: 'animation-shot-review',
      task: 'delta-vision-review',
      backend: 'ollama',
      model: 'qwen3-vl:4b-instruct',
      timeoutMs: 100,
      leaseMs: 5_000,
      pollMs: 5,
    },
    async (lease) => {
      observed = await inspectGpuLease(leaseDirectory);
      assert.equal(observed.stale, false);
      assert.equal(observed.metadata.token, lease.metadata.token);
      assert.equal(observed.metadata.owner, 'animation-shot-review');
      assert.equal(observed.metadata.task, 'delta-vision-review');
      assert.equal(observed.metadata.backend, 'ollama');
      assert.equal(observed.metadata.model, 'qwen3-vl:4b-instruct');
      return 'complete';
    },
  );

  assert.equal(result, 'complete');
  assert.ok(observed);
  assert.equal(await inspectGpuLease(leaseDirectory), null);
});

test('GPU AI task wrapper honors lease timing environment overrides', async (t) => {
  const leaseDirectory = await withTempLease(t);
  const env = {
    SRF_GPU_LEASE_TIMEOUT_MS: '125',
    SRF_GPU_LEASE_DURATION_MS: '7000',
    SRF_GPU_LEASE_POLL_MS: '7',
  };

  await withGpuAiTask(
    {
      leaseDirectory,
      env,
      owner: 'test-owner',
      task: 'test-task',
      backend: 'ollama',
    },
    async (lease) => {
      assert.equal(lease.leaseMs, 7000);
      assert.equal(lease.metadata.owner, 'test-owner');
    },
  );

  assert.equal(await inspectGpuLease(leaseDirectory), null);
});
