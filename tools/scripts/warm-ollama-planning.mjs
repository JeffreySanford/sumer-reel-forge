const baseUrl = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '');
const model = process.env.OLLAMA_TEXT_MODEL;
const keepAlive = process.env.OLLAMA_KEEP_ALIVE ?? '10m';
const timeoutMs = Number(process.env.PLANNING_CLIENT_TIMEOUT_MS ?? 180000);

if (!model) {
  throw new Error('OLLAMA_TEXT_MODEL is required to warm the planning model.');
}

console.log(`Warming ${model} at ${baseUrl}...`);
const startedAt = Date.now();
const response = await fetch(`${baseUrl}/api/generate`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    model,
    stream: false,
    keep_alive: keepAlive,
  }),
  signal: AbortSignal.timeout(timeoutMs),
});

const text = await response.text();
if (!response.ok) {
  console.error(text);
  throw new Error(`Ollama warmup returned HTTP ${response.status}.`);
}

const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log(`${model} is loaded and kept alive for ${keepAlive} (${elapsedSeconds}s).`);
