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
      telemetry: false,
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
    SRF_GPU_TASK_TELEMETRY: 'false',
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

test('GPU AI task captures before and after telemetry without changing the task result', async (t) => {
  const leaseDirectory = await withTempLease(t);
  const captures = [];
  const receipts = [];

  const result = await withGpuAiTask(
    {
      leaseDirectory,
      owner: 'telemetry-owner',
      task: 'telemetry-task',
      backend: 'ollama',
      model: 'vision-model',
      timeoutMs: 100,
      leaseMs: 5_000,
      pollMs: 5,
      collectTelemetry: async () => {
        const sample = {
          schemaVersion: 1,
          capturedAt: `capture-${captures.length + 1}`,
          nvidia: { available: true, devices: [{ memoryUsedMb: captures.length + 1 }] },
          ollama: { reachable: true, loadedModels: [] },
          comfyui: { reachable: true, devices: [] },
        };
        captures.push(sample);
        return sample;
      },
      persistTelemetry: async (receipt) => {
        receipts.push(receipt);
        return '/tmp/fake-gpu-task-receipt.json';
      },
    },
    async () => 'telemetry-complete',
  );

  assert.equal(result, 'telemetry-complete');
  assert.equal(captures.length, 2);
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].outcome, 'completed');
  assert.equal(receipts[0].lease.owner, 'telemetry-owner');
  assert.equal(receipts[0].lease.task, 'telemetry-task');
  assert.equal(receipts[0].before.capturedAt, 'capture-1');
  assert.equal(receipts[0].after.capturedAt, 'capture-2');
  assert.equal(await inspectGpuLease(leaseDirectory), null);
});

test('GPU AI task captures cleanup telemetry before releasing the lease', async (t) => {
  const leaseDirectory = await withTempLease(t);
  const captures = [];
  const receipts = [];
  let observedDuringCleanup;

  const result = await withGpuAiTask(
    {
      leaseDirectory,
      owner: 'cleanup-owner',
      task: 'cleanup-task',
      backend: 'ollama',
      model: 'vision-model',
      timeoutMs: 100,
      leaseMs: 5_000,
      pollMs: 5,
      collectTelemetry: async () => {
        const sample = {
          schemaVersion: 1,
          capturedAt: `capture-${captures.length + 1}`,
          nvidia: { available: true, devices: [{ memoryUsedMb: captures.length + 1 }] },
          ollama: { reachable: true, loadedModels: [] },
          comfyui: { reachable: true, devices: [] },
        };
        captures.push(sample);
        return sample;
      },
      persistTelemetry: async (receipt) => {
        receipts.push(receipt);
        return '/tmp/fake-gpu-task-cleanup-receipt.json';
      },
      cleanup: async () => {
        observedDuringCleanup = await inspectGpuLease(leaseDirectory);
      },
    },
    async () => 'cleanup-complete',
  );

  assert.equal(result, 'cleanup-complete');
  assert.equal(captures.length, 3);
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].cleanup.status, 'completed');
  assert.equal(receipts[0].afterCleanup.capturedAt, 'capture-3');
  assert.equal(observedDuringCleanup.metadata.owner, 'cleanup-owner');
  assert.equal(await inspectGpuLease(leaseDirectory), null);
});

test('telemetry capture failure stays advisory and cannot fail GPU work', async (t) => {
  const leaseDirectory = await withTempLease(t);
  let receipt;

  const result = await withGpuAiTask(
    {
      leaseDirectory,
      owner: 'advisory-owner',
      task: 'advisory-task',
      backend: 'comfyui',
      timeoutMs: 100,
      leaseMs: 5_000,
      pollMs: 5,
      collectTelemetry: async () => {
        throw new Error('probe unavailable');
      },
      persistTelemetry: async (value) => {
        receipt = value;
      },
    },
    async () => 42,
  );

  assert.equal(result, 42);
  assert.match(receipt.before.captureError, /probe unavailable/);
  assert.match(receipt.after.captureError, /probe unavailable/);
  assert.equal(receipt.outcome, 'completed');
});
