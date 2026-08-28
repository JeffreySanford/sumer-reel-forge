import { withGpuAiTask } from './gpu-ai-task.mjs';

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'qwen3-vl:4b-instruct';
const DEFAULT_KEEP_ALIVE = '10m';
const DEFAULT_TIMEOUT_MS = 300_000;
const DEFAULT_UNLOAD_TIMEOUT_MS = 120_000;

export async function runManagedOllamaChat(options = {}) {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const log = options.log ?? console.log;
  if (typeof fetchImpl !== 'function') {
    throw new Error('runManagedOllamaChat requires fetch support.');
  }

  const model = optionalString(options.model) ??
    optionalString(options.defaultModel) ??
    optionalString(env.OLLAMA_TEXT_MODEL) ??
    optionalString(env.OLLAMA_VISION_MODEL) ??
    DEFAULT_MODEL;
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? env.OLLAMA_BASE_URL);
  const timeoutMs = positiveInteger(
    options.timeoutMs ?? env.PLANNING_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS,
  );
  const unloadTimeoutMs = positiveInteger(
    options.unloadTimeoutMs ?? env.OLLAMA_UNLOAD_TIMEOUT_MS,
    DEFAULT_UNLOAD_TIMEOUT_MS,
  );
  const keepAlive =
    options.keepAlive ?? env.OLLAMA_KEEP_ALIVE ?? DEFAULT_KEEP_ALIVE;

  return withGpuAiTask(
    {
      leaseDirectory: options.leaseDirectory ?? env.SRF_GPU_LEASE_PATH,
      owner: requiredString(options.owner, 'owner'),
      task: requiredString(options.task, 'task'),
      backend: 'ollama',
      model,
      env,
      timeoutMs: positiveInteger(
        options.leaseTimeoutMs ?? env.SRF_GPU_LEASE_TIMEOUT_MS,
        timeoutMs,
      ),
      cleanup: async () =>
        unloadOllamaModel({
          baseUrl,
          model,
          timeoutMs: unloadTimeoutMs,
          fetch: fetchImpl,
          log,
        }),
    },
    async (lease) => {
      log(
        `[gpu] Lease acquired for ${lease.metadata.task} · backend ollama · model ${model} · expires ${lease.metadata.expiresAt}.`,
      );
      const response = await fetchImpl(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: false,
          think: false,
          keep_alive: keepAlive,
          format: options.format,
          messages: options.messages,
          options: options.options,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        throw new Error(
          `${options.errorPrefix ?? 'Ollama vision chat'} returned HTTP ${response.status}: ${await response.text()}`,
        );
      }
      return await response.json();
    },
  );
}

export async function runManagedOllamaVisionChat(options = {}) {
  return runManagedOllamaChat({
    ...options,
    defaultModel: options.defaultModel ?? options.env?.OLLAMA_VISION_MODEL ?? DEFAULT_MODEL,
  });
}

export async function unloadOllamaModel({
  baseUrl,
  model,
  timeoutMs = DEFAULT_UNLOAD_TIMEOUT_MS,
  fetch: fetchImpl = globalThis.fetch,
  log = console.log,
} = {}) {
  if (!model) return;
  if (typeof fetchImpl !== 'function') {
    throw new Error('unloadOllamaModel requires fetch support.');
  }
  const response = await fetchImpl(`${normalizeBaseUrl(baseUrl)}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: '',
      stream: false,
      keep_alive: 0,
    }),
    signal: AbortSignal.timeout(positiveInteger(timeoutMs, DEFAULT_UNLOAD_TIMEOUT_MS)),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Ollama unload HTTP ${response.status}: ${text}`);
  }
  log(`[gpu] Ollama model unload request completed for ${model}.`);
}

function normalizeBaseUrl(value) {
  return String(value ?? DEFAULT_BASE_URL).replace(/\/$/, '');
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function requiredString(value, name) {
  const parsed = optionalString(value);
  if (!parsed) throw new Error(`Managed Ollama chat ${name} is required.`);
  return parsed;
}

function optionalString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
