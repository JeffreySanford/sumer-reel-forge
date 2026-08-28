#!/usr/bin/env node
import { runManagedOllamaChat } from '../runtime/ollama-vision-task.mjs';

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const request = parseRequest(await readStdin());
  const response = await runManagedOllamaChat({
    owner: request.owner,
    task: request.task,
    baseUrl: request.baseUrl,
    model: request.model,
    timeoutMs: request.timeoutMs,
    leaseTimeoutMs: request.leaseTimeoutMs,
    unloadTimeoutMs: request.unloadTimeoutMs,
    keepAlive: request.keepAlive,
    format: request.format,
    messages: request.messages,
    options: request.options,
    errorPrefix: request.errorPrefix,
    log: (...args) => console.error(...args),
  });

  process.stdout.write(`${JSON.stringify(response)}\n`);
}

function parseRequest(raw) {
  if (!raw.trim()) {
    throw new Error('Managed Ollama bridge received an empty stdin request.');
  }
  const value = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Managed Ollama bridge request must be a JSON object.');
  }
  return value;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}
