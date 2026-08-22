const apiBaseUrl = (process.env.PLANNING_API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');
const timeoutMs = Number(process.env.PLANNING_CLIENT_TIMEOUT_MS ?? 150000);

const request = {
  provider: 'ollama',
  shotId: 'enki-at-the-helm',
  storyFunction: 'Establish Enki as the human and divine visual anchor of the voyage.',
  emotionalPurpose: 'calm authority, curiosity, practical travel',
  eyeTarget: 'enki-face',
  stillnessAnchor: 'enki-facial-identity',
  styleRules: [
    'character-closeup.camera.maxPushPercent = 3',
    'narratorOnly.lipSync = false',
    'foregroundOcclusion.mustAvoid = face,captions',
    'material.water.motion = multi-frequency',
    'material.rigid-vessel.motion = heavyPhysical',
  ],
  constraints: [
    'Do not rewrite narration.',
    'Use one primary movement.',
    'Prefer restrained character motion.',
    'Preserve Enki facial identity.',
    'Avoid heroic posing.',
    'Camera should feel nearly invisible.',
  ],
  availableAssets: [
    'assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-03.png',
  ],
};

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

console.log(`Planning API: ${apiBaseUrl}`);

const capabilityResponse = await fetch(`${apiBaseUrl}/planning/capabilities`, {
  signal: AbortSignal.timeout(10000),
});
const capabilities = await readJson(capabilityResponse);
if (!capabilityResponse.ok) {
  console.error(JSON.stringify(capabilities, null, 2));
  throw new Error(`Planning capabilities returned HTTP ${capabilityResponse.status}.`);
}

const ollama = capabilities.providers?.find((provider) => provider.id === 'ollama');
console.log(`Ollama planning: ${ollama?.available ? 'available' : 'unavailable'}`);
console.log(`Text model: ${ollama?.configuredModel ?? '(not configured)'}`);
console.log(`Vision configured: ${ollama?.vision ? 'yes' : 'no'}`);

if (!ollama?.available || !ollama?.text) {
  throw new Error('Ollama text planning is not ready. Check planning:ollama:check and the API environment.');
}

console.log('Requesting Reel 1 / Shot 3 direction proposal...');
const startedAt = Date.now();
const response = await fetch(`${apiBaseUrl}/planning/shot-plan`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(request),
  signal: AbortSignal.timeout(timeoutMs),
});
const result = await readJson(response);
const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);

console.log(`Completed in ${elapsedSeconds}s with HTTP ${response.status}.`);
console.log(JSON.stringify(result, null, 2));

if (!response.ok) {
  process.exitCode = 1;
}
