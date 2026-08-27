import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const DEFAULT_MANAGED_OLLAMA_MODELS_PATH = resolve(
  'tools/ollama/managed-models.json',
);

export async function loadManagedOllamaModels(
  path = DEFAULT_MANAGED_OLLAMA_MODELS_PATH,
) {
  const manifest = JSON.parse(await readFile(resolve(path), 'utf8'));
  assertManagedOllamaManifest(manifest);
  return manifest;
}

export function resolveManagedOllamaModels(
  manifest,
  env = process.env,
  { includeRetrieval = false } = {},
) {
  assertManagedOllamaManifest(manifest);
  return manifest.models
    .filter((model) => model.tier === 'core' || includeRetrieval)
    .map((model) => ({
      ...model,
      selectedModel: cleanString(env[model.envVar]) ?? model.defaultModel,
      source: cleanString(env[model.envVar]) ? 'environment' : 'default',
    }));
}

export function assertManagedOllamaManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('Managed Ollama model manifest must be an object.');
  }
  if (manifest.schemaVersion !== 1) {
    throw new Error(`Unsupported managed Ollama schemaVersion: ${manifest.schemaVersion}`);
  }
  if (!Array.isArray(manifest.models) || manifest.models.length === 0) {
    throw new Error('Managed Ollama model manifest must define at least one model.');
  }

  const roles = new Set();
  for (const model of manifest.models) {
    for (const key of ['role', 'tier', 'envVar', 'defaultModel', 'purpose', 'workload']) {
      if (!cleanString(model?.[key])) {
        throw new Error(`Managed Ollama model is missing ${key}.`);
      }
    }
    if (!['core', 'retrieval'].includes(model.tier)) {
      throw new Error(`Unsupported managed Ollama tier for ${model.role}: ${model.tier}`);
    }
    if (roles.has(model.role)) {
      throw new Error(`Managed Ollama role is duplicated: ${model.role}`);
    }
    roles.add(model.role);
  }
}

function cleanString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
