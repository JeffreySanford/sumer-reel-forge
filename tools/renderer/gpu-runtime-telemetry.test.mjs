import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  collectGpuRuntimeTelemetry,
  persistGpuTaskReceipt,
} from '../runtime/gpu-runtime-telemetry.mjs';

test('GPU runtime telemetry normalizes NVIDIA, Ollama and ComfyUI state', async () => {
  const fetchImpl = async (url) => {
    if (String(url).endsWith('/api/ps')) {
      return new Response(
        JSON.stringify({
          models: [
            {
              name: 'qwen3-vl:4b-instruct',
              size: 5000,
              size_vram: 4500,
              expires_at: '2026-08-27T17:00:00.000Z',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (String(url).endsWith('/system_stats')) {
      return new Response(
        JSON.stringify({
          devices: [
            {
              name: 'cuda:0 NVIDIA RTX',
              type: 'cuda',
              vram_total: 10000,
              vram_free: 6000,
              torch_vram_total: 9000,
              torch_vram_free: 5500,
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    throw new Error(`Unexpected URL ${url}`);
  };
  const telemetry = await collectGpuRuntimeTelemetry({
    env: {
      OLLAMA_BASE_URL: 'http://ollama.test',
      COMFYUI_BASE_URL: 'http://comfy.test',
    },
    fetchImpl,
    runCommand: () => ({
      ok: true,
      stdout: '0, NVIDIA RTX, 10240, 4096, 6144\n',
      stderr: '',
    }),
  });

  assert.equal(telemetry.nvidia.available, true);
  assert.equal(telemetry.nvidia.devices[0].memoryUsedMb, 4096);
  assert.equal(telemetry.ollama.reachable, true);
  assert.equal(telemetry.ollama.loadedModels[0].sizeVramBytes, 4500);
  assert.equal(telemetry.comfyui.reachable, true);
  assert.equal(telemetry.comfyui.devices[0].vramFreeBytes, 6000);
});

test('GPU task receipt is persisted under the configured telemetry directory', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'srf-gpu-telemetry-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const target = await persistGpuTaskReceipt(
    {
      schemaVersion: 1,
      type: 'gpu-ai-task',
      lease: {
        owner: 'animation-shot-review',
        task: 'shot-3-delta-vision-review',
      },
      completedAt: '2026-08-27T16:45:00.000Z',
      outcome: 'completed',
    },
    { outputDirectory: root, env: {} },
  );

  const parsed = JSON.parse(await readFile(target, 'utf8'));
  assert.equal(parsed.outcome, 'completed');
  assert.match(target, /animation-shot-review-shot-3-delta-vision-review/);
});
