import assert from 'node:assert/strict';
import test from 'node:test';
import {
  loadManagedOllamaModels,
  resolveManagedOllamaModels,
} from '../ollama/managed-models.mjs';

test('managed Ollama core inventory uses workstation-sized planner and vision defaults', async () => {
  const manifest = await loadManagedOllamaModels();
  const selected = resolveManagedOllamaModels(manifest, {});
  assert.deepEqual(
    selected.map(({ role, selectedModel }) => ({ role, selectedModel })),
    [
      { role: 'text-planner', selectedModel: 'qwen3:8b' },
      { role: 'vision-review', selectedModel: 'qwen3-vl:4b-instruct' },
    ],
  );
});

test('managed Ollama inventory allows explicit environment overrides', async () => {
  const manifest = await loadManagedOllamaModels();
  const selected = resolveManagedOllamaModels(manifest, {
    OLLAMA_TEXT_MODEL: 'custom-text:latest',
    OLLAMA_VISION_MODEL: 'custom-vision:latest',
  });
  assert.equal(selected[0].selectedModel, 'custom-text:latest');
  assert.equal(selected[0].source, 'environment');
  assert.equal(selected[1].selectedModel, 'custom-vision:latest');
  assert.equal(selected[1].source, 'environment');
});

test('retrieval embedding model is opt-in to the managed setup profile', async () => {
  const manifest = await loadManagedOllamaModels();
  const selected = resolveManagedOllamaModels(manifest, {}, { includeRetrieval: true });
  assert.equal(selected.at(-1).role, 'retrieval-embedding');
  assert.equal(selected.at(-1).selectedModel, 'nomic-embed-text:latest');
});
