const baseUrl = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '');
const configuredTextModel = process.env.OLLAMA_TEXT_MODEL ?? '';
const configuredVisionModel = process.env.OLLAMA_VISION_MODEL ?? '';

const response = await fetch(`${baseUrl}/api/tags`, {
  signal: AbortSignal.timeout(5000),
});

if (!response.ok) {
  throw new Error(`Ollama returned HTTP ${response.status} from ${baseUrl}/api/tags`);
}

const payload = await response.json();
const models = (payload.models ?? [])
  .map((entry) => entry.name ?? entry.model)
  .filter(Boolean);

console.log(`Ollama: ${baseUrl}`);
console.log(`Models (${models.length}):`);
for (const model of models) {
  console.log(`  - ${model}`);
}

console.log(`Text planning model: ${configuredTextModel || '(not configured)'}`);
console.log(`Vision review model: ${configuredVisionModel || '(not configured)'}`);

if (configuredTextModel && !models.includes(configuredTextModel)) {
  console.warn(`WARNING: OLLAMA_TEXT_MODEL=${configuredTextModel} is not in /api/tags.`);
}
if (configuredVisionModel && !models.includes(configuredVisionModel)) {
  console.warn(`WARNING: OLLAMA_VISION_MODEL=${configuredVisionModel} is not in /api/tags.`);
}

if (!configuredTextModel) {
  console.log('Set OLLAMA_TEXT_MODEL to enable /api/planning/shot-plan with provider=ollama.');
}
