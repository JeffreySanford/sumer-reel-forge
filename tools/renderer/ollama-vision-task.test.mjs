import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { withGpuAiTask } from '../runtime/gpu-ai-task.mjs';
import { inspectGpuLease } from '../runtime/gpu-resource-lease.mjs';
import { runManagedOllamaVisionChat } from '../runtime/ollama-vision-task.mjs';

async function withTempLease(t) {
  const root = await mkdtemp(join(tmpdir(), 'srf-ollama-vision-task-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return join(root, 'gpu-lease');
}

function jsonResponse(body, { ok = true, status = 200, text = '' } = {}) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => text,
  };
}

test('managed Ollama vision chat unloads the model before releasing its lease', async (t) => {
  const leaseDirectory = await withTempLease(t);
  const events = [];
  const fetch = async (url, init) => {
    const active = await inspectGpuLease(leaseDirectory);
    const request = JSON.parse(init.body);

    if (String(url).endsWith('/api/chat')) {
      events.push(`${active.metadata.backend}:request:${request.keep_alive}`);
      return jsonResponse({ model: 'qwen3-vl:4b-instruct', message: { content: '{"ok":true}' } });
    }

    events.push(`${active.metadata.backend}:unload:${request.keep_alive}`);
    return jsonResponse({});
  };

  const payload = await runManagedOllamaVisionChat({
    leaseDirectory,
    env: { SRF_GPU_TASK_TELEMETRY: 'false' },
    fetch,
    owner: 'shot03-rigging-roi-locator',
    task: 'shot-3-rigging-roi-localization',
    model: 'qwen3-vl:4b-instruct',
    baseUrl: 'http://localhost:11434',
    messages: [{ role: 'user', content: 'locate' }],
    format: { type: 'object' },
    options: { temperature: 0 },
    timeoutMs: 1_000,
  });

  assert.equal(payload.message.content, '{"ok":true}');
  assert.deepEqual(events, ['ollama:request:10m', 'ollama:unload:0']);
  assert.equal(await inspectGpuLease(leaseDirectory), null);
});

test('hybrid handoff releases Ollama before the ComfyUI child acquires the GPU lease', async (t) => {
  const leaseDirectory = await withTempLease(t);
  const events = [];
  const fetch = async (url, init) => {
    const active = await inspectGpuLease(leaseDirectory);
    const request = JSON.parse(init.body);
    events.push(`${active.metadata.backend}:${String(url).endsWith('/api/chat') ? 'request' : 'unload'}`);
    assert.equal(active.metadata.owner, 'shot03-roi-segmentation-locator');
    assert.equal(request.model, 'qwen3-vl:4b-instruct');
    return jsonResponse({ model: request.model, message: { content: '{"targets":[]}' } });
  };

  await runManagedOllamaVisionChat({
    leaseDirectory,
    env: { SRF_GPU_TASK_TELEMETRY: 'false' },
    fetch,
    owner: 'shot03-roi-segmentation-locator',
    task: 'shot-3-roi-segmentation-localization',
    model: 'qwen3-vl:4b-instruct',
    messages: [{ role: 'user', content: 'locate' }],
    timeoutMs: 1_000,
  });

  events.push((await inspectGpuLease(leaseDirectory)) === null ? 'free-after-ollama' : 'held-after-ollama');

  await withGpuAiTask(
    {
      leaseDirectory,
      telemetry: false,
      owner: 'animation-layer-candidates',
      task: 'shot-3-layer-candidate-generation',
      backend: 'comfyui',
      timeoutMs: 100,
      leaseMs: 5_000,
      pollMs: 5,
    },
    async () => {
      const active = await inspectGpuLease(leaseDirectory);
      events.push(`${active.metadata.backend}:generation`);
    },
  );

  assert.deepEqual(events, [
    'ollama:request',
    'ollama:unload',
    'free-after-ollama',
    'comfyui:generation',
  ]);
});
