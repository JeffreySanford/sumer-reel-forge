const baseUrl = (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '');
const configuredTextModel = process.env.OLLAMA_TEXT_MODEL ?? '';
const configuredVisionModel = process.env.OLLAMA_VISION_MODEL ?? '';

const [tagsResponse, versionResponse] = await Promise.all([
  fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) }),
  fetch(`${baseUrl}/api/version`, { signal: AbortSignal.timeout(5000) }).catch(
    () => null,
  ),
]);

if (!tagsResponse.ok) {
  throw new Error(
    `Ollama returned HTTP ${tagsResponse.status} from ${baseUrl}/api/tags`,
  );
}

const payload = await tagsResponse.json();
const models = (payload.models ?? [])
  .map((entry) => entry.name ?? entry.model)
  .filter(Boolean);

let version = 'unknown';
if (versionResponse?.ok) {
  const versionPayload = await versionResponse.json();
  version = versionPayload.version ?? 'unknown';
}

console.log(`Ollama: ${baseUrl}`);
console.log(`Version: ${version}`);
console.log(`Models (${models.length}):`);
for (const model of models) {
  console.log(`  - ${model}`);
}

console.log(`Text planning model: ${configuredTextModel || '(not configured)'}`);
console.log(`Vision review model: ${configuredVisionModel || '(not configured)'}`);

if (configuredTextModel && !models.includes(configuredTextModel)) {
  console.warn(
    `WARNING: OLLAMA_TEXT_MODEL=${configuredTextModel} is not in /api/tags.`,
  );
}
if (configuredVisionModel && !models.includes(configuredVisionModel)) {
  console.warn(
    `WARNING: OLLAMA_VISION_MODEL=${configuredVisionModel} is not in /api/tags.`,
  );
}

if (!configuredTextModel) {
  console.log(
    'Set OLLAMA_TEXT_MODEL to enable /api/planning/shot-plan with provider=ollama.',
  );
}
if (!configuredVisionModel) {
  console.log(
    'Set OLLAMA_VISION_MODEL before enabling AI review of keyframes/contact sheets.',
  );
}

if (
  configuredVisionModel.startsWith('qwen3-vl') &&
  version !== 'unknown' &&
  compareVersions(version, '0.12.7') < 0
) {
  console.warn(
    `WARNING: ${configuredVisionModel} requires Ollama 0.12.7 or newer; detected ${version}.`,
  );
}

function compareVersions(left, right) {
  const a = left.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const b = right.split(/[.-]/).map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const delta = (a[index] ?? 0) - (b[index] ?? 0);
    if (delta !== 0) {
      return delta;
    }
  }
  return 0;
}
