import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { inspectGpuLease } from '../runtime/gpu-resource-lease.mjs';
import { runGpuManagedComfyUiScript } from '../runtime/comfyui-script-task.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'srf-comfyui-script-task-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const enginePath = join(root, 'engine.mjs');
  const outputPath = join(root, 'result.json');
  const leaseDirectory = join(root, 'gpu-lease');

  await writeFile(
    enginePath,
    `import { existsSync } from 'node:fs';\nimport { writeFile } from 'node:fs/promises';\nconst command = process.argv[2] ?? 'preflight';\nawait writeFile(process.env.TEST_OUTPUT_PATH, JSON.stringify({ command, leasePresent: existsSync(process.env.SRF_GPU_LEASE_PATH) }));\n`,
    'utf8',
  );

  return { root, enginePath, outputPath, leaseDirectory };
}

function envFor(item) {
  return {
    ...process.env,
    TEST_OUTPUT_PATH: item.outputPath,
    SRF_GPU_LEASE_PATH: item.leaseDirectory,
    SRF_GPU_TASK_TELEMETRY: 'false',
  };
}

test('preflight commands remain lease-free', async (t) => {
  const item = await fixture(t);
  const exitCode = await runGpuManagedComfyUiScript({
    enginePath: item.enginePath,
    owner: 'test-comfy-owner',
    task: 'test-comfy-task',
    args: ['preflight'],
    leaseCommands: ['generate'],
    env: envFor(item),
  });

  assert.equal(exitCode, 0);
  const result = JSON.parse(await readFile(item.outputPath, 'utf8'));
  assert.equal(result.command, 'preflight');
  assert.equal(result.leasePresent, false);
  assert.equal(existsSync(item.leaseDirectory), false);
});

test('generation command executes while one GPU lease is held and releases afterward', async (t) => {
  const item = await fixture(t);
  const exitCode = await runGpuManagedComfyUiScript({
    enginePath: item.enginePath,
    owner: 'test-comfy-owner',
    task: 'test-comfy-generate',
    args: ['generate'],
    leaseCommands: ['generate'],
    env: envFor(item),
    timeoutMs: 100,
  });

  assert.equal(exitCode, 0);
  const result = JSON.parse(await readFile(item.outputPath, 'utf8'));
  assert.equal(result.command, 'generate');
  assert.equal(result.leasePresent, true);
  assert.equal(await inspectGpuLease(item.leaseDirectory), null);
});
