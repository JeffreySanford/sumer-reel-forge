import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { withGpuAiTask } from '../runtime/gpu-ai-task.mjs';
import { inspectGpuLease } from '../runtime/gpu-resource-lease.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BRIDGE = resolve(ROOT, 'tools/scripts/managed-ollama-chat-bridge.mjs');

async function withTempLease(t) {
  const root = await mkdtemp(join(tmpdir(), 'srf-managed-ollama-bridge-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return join(root, 'gpu-lease');
}

async function startFakeOllama(t, handler) {
  const server = createServer((request, response) => {
    void handler(request, response).catch((error) => {
      response.statusCode = 500;
      response.end(error instanceof Error ? error.message : String(error));
    });
  });
  await new Promise((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise);
    server.listen(0, '127.0.0.1', resolvePromise);
  });
  t.after(
    () =>
      new Promise((resolvePromise) => {
        server.close(() => resolvePromise());
      }),
  );
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return `http://127.0.0.1:${address.port}`;
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function runBridge(request, leaseDirectory) {
  const child = spawn(process.execPath, [BRIDGE], {
    cwd: ROOT,
    env: {
      ...process.env,
      SRF_GPU_LEASE_PATH: leaseDirectory,
      SRF_GPU_TASK_TELEMETRY: 'false',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const stdout = [];
  const stderr = [];
  child.stdout.on('data', (chunk) => stdout.push(chunk));
  child.stderr.on('data', (chunk) => stderr.push(chunk));
  const completion = new Promise((resolvePromise, rejectPromise) => {
    child.once('error', rejectPromise);
    child.once('close', (code, signal) => {
      resolvePromise({
        code,
        signal,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
      });
    });
  });
  child.stdin.end(JSON.stringify(request));
  return await completion;
}

function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
}

test('real managed Ollama bridge keeps stdout machine-readable and unloads before handoff', async (t) => {
  const leaseDirectory = await withTempLease(t);
  const events = [];
  const baseUrl = await startFakeOllama(t, async (request, response) => {
    const body = await readJsonBody(request);
    const active = await inspectGpuLease(leaseDirectory);
    events.push({
      path: request.url,
      backend: active?.metadata?.backend,
      owner: active?.metadata?.owner,
      model: body.model,
      keepAlive: body.keep_alive,
      format: body.format,
      messages: body.messages,
      options: body.options,
    });

    if (request.url === '/api/chat') {
      sendJson(response, 200, {
        model: body.model,
        message: { content: '{"ok":true}' },
      });
      return;
    }
    if (request.url === '/api/generate') {
      sendJson(response, 200, { done: true });
      return;
    }
    sendJson(response, 404, { error: 'not found' });
  });

  const result = await runBridge(
    {
      owner: 'api-ollama-planning',
      task: 'bridge-integration-test',
      baseUrl,
      model: 'qwen3:8b',
      timeoutMs: 1_000,
      leaseTimeoutMs: 1_000,
      unloadTimeoutMs: 1_000,
      keepAlive: '10m',
      format: { type: 'object' },
      messages: [{ role: 'user', content: 'plan' }],
      options: { temperature: 0.2 },
      errorPrefix: 'fake planning',
    },
    leaseDirectory,
  );

  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.signal, null);
  assert.equal(result.stdout.trim().split(/\r?\n/).length, 1);
  assert.deepEqual(JSON.parse(result.stdout), {
    model: 'qwen3:8b',
    message: { content: '{"ok":true}' },
  });
  assert.match(result.stderr, /Lease acquired for bridge-integration-test/);
  assert.match(result.stderr, /Ollama model unload request completed/);
  assert.deepEqual(
    events.map((event) => ({
      path: event.path,
      backend: event.backend,
      owner: event.owner,
      model: event.model,
      keepAlive: event.keepAlive,
    })),
    [
      {
        path: '/api/chat',
        backend: 'ollama',
        owner: 'api-ollama-planning',
        model: 'qwen3:8b',
        keepAlive: '10m',
      },
      {
        path: '/api/generate',
        backend: 'ollama',
        owner: 'api-ollama-planning',
        model: 'qwen3:8b',
        keepAlive: 0,
      },
    ],
  );
  assert.deepEqual(events[0].format, { type: 'object' });
  assert.deepEqual(events[0].messages, [{ role: 'user', content: 'plan' }]);
  assert.deepEqual(events[0].options, { temperature: 0.2 });
  assert.equal(await inspectGpuLease(leaseDirectory), null);

  await withGpuAiTask(
    {
      leaseDirectory,
      telemetry: false,
      owner: 'bridge-comfy-handoff',
      task: 'bridge-comfy-generation',
      backend: 'comfyui',
      timeoutMs: 100,
      leaseMs: 5_000,
      pollMs: 5,
    },
    async () => {
      const active = await inspectGpuLease(leaseDirectory);
      assert.equal(active.metadata.backend, 'comfyui');
    },
  );
  assert.equal(await inspectGpuLease(leaseDirectory), null);
});

test('real managed Ollama bridge still unloads and releases the lease after inference failure', async (t) => {
  const leaseDirectory = await withTempLease(t);
  const events = [];
  const baseUrl = await startFakeOllama(t, async (request, response) => {
    const body = await readJsonBody(request);
    const active = await inspectGpuLease(leaseDirectory);
    events.push({
      path: request.url,
      backend: active?.metadata?.backend,
      keepAlive: body.keep_alive,
    });
    if (request.url === '/api/chat') {
      response.statusCode = 500;
      response.end('boom');
      return;
    }
    if (request.url === '/api/generate') {
      sendJson(response, 200, { done: true });
      return;
    }
    sendJson(response, 404, { error: 'not found' });
  });

  const result = await runBridge(
    {
      owner: 'api-ollama-planning',
      task: 'bridge-failure-test',
      baseUrl,
      model: 'qwen3:8b',
      timeoutMs: 1_000,
      leaseTimeoutMs: 1_000,
      unloadTimeoutMs: 1_000,
      keepAlive: '10m',
      messages: [{ role: 'user', content: 'plan' }],
      errorPrefix: 'fake planning',
    },
    leaseDirectory,
  );

  assert.notEqual(result.code, 0);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /fake planning returned HTTP 500: boom/);
  assert.deepEqual(events, [
    { path: '/api/chat', backend: 'ollama', keepAlive: '10m' },
    { path: '/api/generate', backend: 'ollama', keepAlive: 0 },
  ]);
  assert.equal(await inspectGpuLease(leaseDirectory), null);
});
