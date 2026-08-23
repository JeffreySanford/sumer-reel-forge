import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

const PNG_SIGNATURE = '89504e470d0a1a0a';

export async function preflightLayerCandidates(options = {}) {
  const root = resolve(options.root ?? '.');
  const env = options.env ?? process.env;
  const assetRoot = resolve(root, options.assetRoot ?? 'assets');
  const manifestPath = resolve(
    root,
    options.manifestPath ??
      'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
  );
  const workflowPath = env.COMFYUI_LAYER_WORKFLOW_PATH
    ? resolve(root, env.COMFYUI_LAYER_WORKFLOW_PATH)
    : undefined;
  const baseUrl = (env.COMFYUI_BASE_URL ?? 'http://127.0.0.1:8188').replace(/\/$/, '');
  const manifest = await readJson(manifestPath);
  validateManifestShape(manifest);
  const selected = selectCandidateLayers(manifest, {
    shotNumber: options.shotNumber,
    layerIds: options.layerIds,
    allLayers: Boolean(options.allLayers),
  });
  const checks = [];

  checks.push(await fileCheck('Animation manifest', manifestPath));
  checks.push(
    workflowPath
      ? await fileCheck('ComfyUI layer workflow', workflowPath)
      : {
          ok: false,
          name: 'ComfyUI layer workflow',
          detail: 'COMFYUI_LAYER_WORKFLOW_PATH is not set.',
        },
  );
  checks.push(await httpCheck('ComfyUI', `${baseUrl}/system_stats`, options.fetchImpl));

  const sourceDimensions = new Map();
  for (const shot of uniqueShots(selected)) {
    const sourcePath = resolve(assetRoot, shot.sourceFrame);
    const sourceCheck = await fileCheck(`Shot ${shot.sourceShotNumber} source`, sourcePath);
    checks.push(sourceCheck);
    if (sourceCheck.ok) {
      try {
        sourceDimensions.set(shot.shotId, await readPngDimensions(sourcePath));
      } catch (error) {
        checks.push({
          ok: false,
          name: `Shot ${shot.sourceShotNumber} source PNG`,
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const profilePath = resolve(
    root,
    env.SRF_HARDWARE_PROFILE_PATH ?? 'tmp/runtime/hardware-profile.json',
  );
  const profile = await readJsonOptional(profilePath);
  const concurrency = positiveInteger(env.COMFYUI_MAX_PARALLEL) ??
    positiveInteger(profile?.runtimePlan?.ai?.comfyConcurrency) ??
    1;

  return {
    ok: checks.every((check) => check.ok),
    manifest,
    manifestPath,
    workflowPath,
    baseUrl,
    assetRoot,
    selected,
    sourceDimensions,
    checks,
    concurrency,
    hardwareProfilePath: profile ? profilePath : undefined,
    hardwareTier: profile?.runtimePlan?.tier,
    vramMode: profile?.runtimePlan?.ai?.comfyVramMode,
  };
}

export async function generateLayerCandidates(options = {}) {
  const preflight = options.preflight ?? (await preflightLayerCandidates(options));
  if (!preflight.ok) {
    throw new Error(
      `Animation layer candidate preflight failed:\n${preflight.checks
        .filter((check) => !check.ok)
        .map((check) => `- ${check.name}: ${check.detail}`)
        .join('\n')}`,
    );
  }
  if (!preflight.workflowPath) {
    throw new Error('COMFYUI_LAYER_WORKFLOW_PATH is required.');
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('fetch is unavailable.');
  const workflowTemplate = JSON.parse(await readFile(preflight.workflowPath, 'utf8'));
  const stamp = options.stamp ?? new Date().toISOString().replace(/[:.]/g, '-');
  const outputRoot = resolve(
    options.outputRoot ??
      join('tmp', 'animation-assets', 'candidates', preflight.manifest.manifestId, stamp),
  );
  await mkdir(outputRoot, { recursive: true });
  const sourceUploads = new Map();
  const generated = [];

  for (const batch of chunk(preflight.selected, preflight.concurrency)) {
    const results = await Promise.all(
      batch.map(async ({ shot, layer }) => {
        let uploaded = sourceUploads.get(shot.shotId);
        if (!uploaded) {
          uploaded = await uploadSourceFrame({
            fetchImpl,
            baseUrl: preflight.baseUrl,
            sourcePath: resolve(preflight.assetRoot, shot.sourceFrame),
            uploadName: `srf-${preflight.manifest.manifestId}-shot-${String(
              shot.sourceShotNumber,
            ).padStart(2, '0')}-source.png`,
          });
          sourceUploads.set(shot.shotId, uploaded);
        }
        return generateOneCandidate({
          fetchImpl,
          baseUrl: preflight.baseUrl,
          workflowTemplate,
          manifest: preflight.manifest,
          shot,
          layer,
          uploaded,
          assetRoot: preflight.assetRoot,
          outputRoot,
          timeoutMs: Number(options.timeoutMs ?? process.env.RENDER_PROCESS_TIMEOUT_MS ?? 600_000),
          pollIntervalMs: Number(options.pollIntervalMs ?? process.env.COMFYUI_POLL_INTERVAL_MS ?? 2_000),
        });
      }),
    );
    generated.push(...results);
  }

  const runManifest = {
    schemaVersion: 1,
    type: 'animation-layer-candidates',
    generatedAt: new Date().toISOString(),
    sourceManifestId: preflight.manifest.manifestId,
    sourceManifestPath: preflight.manifestPath,
    workflowPath: preflight.workflowPath,
    comfyBaseUrl: preflight.baseUrl,
    concurrency: preflight.concurrency,
    hardwareTier: preflight.hardwareTier,
    vramMode: preflight.vramMode,
    outputRoot,
    candidates: generated,
    approvalPolicy: {
      manifestMutated: false,
      candidateState: 'pending-human-review',
      automaticPromotionAllowed: false,
    },
  };
  await writeFile(
    join(outputRoot, 'candidate-run.json'),
    `${JSON.stringify(runManifest, null, 2)}\n`,
    'utf8',
  );
  return runManifest;
}

export function selectCandidateLayers(manifest, options = {}) {
  const selected = [];
  for (const shot of manifest.shots ?? []) {
    if (
      options.shotNumber !== undefined &&
      shot.sourceShotNumber !== options.shotNumber
    ) {
      continue;
    }
    const required = new Set(shot.activationPolicy?.requiredLayerIds ?? []);
    for (const layer of shot.layers ?? []) {
      if (options.layerIds?.length && !options.layerIds.includes(layer.id)) continue;
      if (!options.allLayers && !options.layerIds?.length && !required.has(layer.id)) continue;
      if (layer.state === 'approved' || layer.state === 'superseded') continue;
      selected.push({ shot, layer, required: required.has(layer.id) });
    }
  }
  if (!selected.length) {
    const shotText = options.shotNumber ? ` for shot ${options.shotNumber}` : '';
    throw new Error(`No candidate animation layers selected${shotText}.`);
  }
  return selected;
}

export function buildLayerPrompt(shot, layer) {
  const preserve =
    'Use the supplied approved editorial image as the sole visual source. Preserve exact canvas registration, perspective, proportions, palette, material identity, lighting direction, and historical design. Do not redesign, restyle, add objects, alter faces, or retell the scene.';
  const fullCanvas =
    'Return one full-canvas layer at the exact source dimensions and coordinates. Do not crop, resize, rotate, or shift registration.';
  const roleInstructions = {
    background:
      'Derive a clean background plate for only the distant environment. Remove foreground subjects only where necessary and inpaint conservatively from immediately surrounding source material.',
    water:
      'Extract only water, reflections, and physically connected water detail. Everything else should be transparent.',
    'major-prop':
      'Extract only the named vessel or major physical prop with exact silhouette and material detail. Everything else should be transparent.',
    character:
      'Extract only the existing character body and clothing. Preserve facial identity and costume exactly; do not beautify, redraw, or change pose. Everything else should be transparent.',
    'character-state':
      'Create only the minimal alternate character state required by this layer while preserving identity, registration, skin tone, lighting, and all unaffected pixels. Everything else should be transparent.',
    'foreground-occluder':
      'Extract only the intended foreground material. Keep all other pixels transparent and do not invent additional occlusion.',
    reflection:
      'Extract only surface refraction/reflection structure derived from the source. Everything else should be transparent.',
    mask:
      'Produce a restrained full-canvas mask for the described coherence region. The mask must follow source evidence and must not invent a hard character silhouette, aura, or facial features.',
    light:
      'Extract only subtle source-supported light contour or illumination. No hard aura, glowing eyes, fantasy particles, or new light sources.',
    environment:
      'Extract only the described environmental material, preserving exact source registration.',
  };
  const special = layer.id.includes('nammu-coherence')
    ? 'Nammu must read as environmental coherence within water, never as a cutout woman, mermaid, horror figure, glowing-eyed entity, or hard supernatural silhouette.'
    : layer.id.includes('enki')
      ? 'Enki identity is an immutable anchor: mature Mesopotamian man, existing face/hair/beard/robe/belt must remain exactly consistent with the supplied painting.'
      : '';
  return [
    preserve,
    fullCanvas,
    `Target layer: ${layer.id}. Role: ${layer.role}. Material: ${layer.material}.`,
    roleInstructions[layer.role] ?? 'Extract only the requested layer and keep unrelated pixels transparent.',
    special,
  ]
    .filter(Boolean)
    .join(' ');
}

export function replaceWorkflowTokens(value, replacements) {
  if (typeof value === 'string') {
    return Object.entries(replacements).reduce(
      (current, [token, replacement]) => current.split(token).join(String(replacement)),
      value,
    );
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceWorkflowTokens(item, replacements));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        replaceWorkflowTokens(item, replacements),
      ]),
    );
  }
  return value;
}

export async function readPngDimensions(path) {
  const buffer = await readFile(path);
  return readPngDimensionsFromBuffer(buffer, path);
}

export function readPngDimensionsFromBuffer(buffer, label = 'PNG') {
  if (!Buffer.isBuffer(buffer) || buffer.length < 24) {
    throw new Error(`${label} is too small to contain a PNG IHDR header.`);
  }
  if (buffer.subarray(0, 8).toString('hex') !== PNG_SIGNATURE) {
    throw new Error(`${label} is not a PNG file.`);
  }
  if (buffer.subarray(12, 16).toString('ascii') !== 'IHDR') {
    throw new Error(`${label} does not contain IHDR as its first chunk.`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

export function assertFullCanvasCandidate(sourceDimensions, candidateDimensions, layerId) {
  if (
    sourceDimensions.width !== candidateDimensions.width ||
    sourceDimensions.height !== candidateDimensions.height
  ) {
    throw new Error(
      `Candidate ${layerId} dimensions ${candidateDimensions.width}x${candidateDimensions.height} do not match source ${sourceDimensions.width}x${sourceDimensions.height}.`,
    );
  }
}

async function generateOneCandidate({
  fetchImpl,
  baseUrl,
  workflowTemplate,
  manifest,
  shot,
  layer,
  uploaded,
  assetRoot,
  outputRoot,
  timeoutMs,
  pollIntervalMs,
}) {
  const seed = randomSeed();
  const outputPrefix = `srf-layer-${String(shot.sourceShotNumber).padStart(2, '0')}-${safeName(layer.id)}`;
  const prompt = buildLayerPrompt(shot, layer);
  const negativePrompt =
    'new composition, changed identity, changed costume, changed face, extra limbs, text, watermark, logo, crop, resize, camera shift, fantasy redesign, hard glow, unrelated objects';
  const workflow = replaceWorkflowTokens(workflowTemplate, {
    '{{SOURCE_IMAGE}}': uploaded.name,
    '{{SOURCE_SUBFOLDER}}': uploaded.subfolder ?? '',
    '{{LAYER_PROMPT}}': prompt,
    '{{PROMPT}}': prompt,
    '{{NEGATIVE_PROMPT}}': negativePrompt,
    '{{SEED}}': seed,
    '{{OUTPUT_PREFIX}}': outputPrefix,
    '{{SHOT_ID}}': shot.shotId,
    '{{LAYER_ID}}': layer.id,
    '{{LAYER_ROLE}}': layer.role,
    '{{LAYER_MATERIAL}}': layer.material,
  });
  const clientId = `sumer-reel-forge-layer-${crypto.randomUUID()}`;
  const queued = await fetchJson(fetchImpl, `${baseUrl}/prompt`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!queued.prompt_id) {
    throw new Error(`ComfyUI did not return a prompt id for ${layer.id}.`);
  }
  const image = await waitForImage({
    fetchImpl,
    baseUrl,
    promptId: queued.prompt_id,
    timeoutMs,
    pollIntervalMs,
    layerId: layer.id,
  });
  const response = await fetchImpl(
    `${baseUrl}/view?${new URLSearchParams(image)}`,
    { signal: AbortSignal.timeout(timeoutMs) },
  );
  if (!response.ok) {
    throw new Error(`ComfyUI candidate download for ${layer.id} returned HTTP ${response.status}.`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const sourcePath = resolve(assetRoot, shot.sourceFrame);
  const sourceDimensions = await readPngDimensions(sourcePath);
  const candidateDimensions = readPngDimensionsFromBuffer(bytes, layer.id);
  assertFullCanvasCandidate(sourceDimensions, candidateDimensions, layer.id);

  const shotDirectory = join(
    outputRoot,
    `shot-${String(shot.sourceShotNumber).padStart(2, '0')}`,
  );
  await mkdir(shotDirectory, { recursive: true });
  const candidatePath = join(shotDirectory, `${safeName(layer.id)}.png`);
  await writeFile(candidatePath, bytes);
  const metadata = {
    schemaVersion: 1,
    state: 'pending-human-review',
    manifestId: manifest.manifestId,
    shotId: shot.shotId,
    sourceShotNumber: shot.sourceShotNumber,
    layerId: layer.id,
    role: layer.role,
    material: layer.material,
    sourceFrame: shot.sourceFrame,
    intendedApprovedPath: layer.path ?? null,
    sourceDimensions,
    candidateDimensions,
    candidatePath,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    comfyPromptId: queued.prompt_id,
    sourceUpload: uploaded,
    seed,
    layerPrompt: prompt,
    generatedAt: new Date().toISOString(),
    manifestMutated: false,
    automaticPromotionAllowed: false,
  };
  await writeFile(
    join(shotDirectory, `${safeName(layer.id)}.candidate.json`),
    `${JSON.stringify(metadata, null, 2)}\n`,
    'utf8',
  );
  return metadata;
}

async function uploadSourceFrame({ fetchImpl, baseUrl, sourcePath, uploadName }) {
  const bytes = await readFile(sourcePath);
  const form = new FormData();
  form.append('image', new Blob([bytes], { type: 'image/png' }), uploadName);
  form.append('type', 'input');
  form.append('overwrite', 'true');
  const response = await fetchImpl(`${baseUrl}/upload/image`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    throw new Error(`ComfyUI source upload returned HTTP ${response.status}: ${await response.text()}`);
  }
  const payload = await response.json();
  return {
    name: payload.name ?? uploadName,
    subfolder: payload.subfolder ?? '',
    type: payload.type ?? 'input',
  };
}

async function waitForImage({
  fetchImpl,
  baseUrl,
  promptId,
  timeoutMs,
  pollIntervalMs,
  layerId,
}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const history = await fetchJson(fetchImpl, `${baseUrl}/history/${promptId}`, {
      signal: AbortSignal.timeout(Math.min(15_000, timeoutMs)),
    });
    const result = history[promptId];
    const image = Object.values(result?.outputs ?? {})
      .flatMap((output) => output.images ?? [])
      .find((candidate) => candidate.type === 'output' || candidate.filename);
    if (image?.filename) {
      return {
        filename: image.filename,
        subfolder: image.subfolder ?? '',
        type: image.type ?? 'output',
      };
    }
    if (result?.status?.status_str === 'error') {
      throw new Error(`ComfyUI reported an error while generating ${layerId}.`);
    }
    await delay(pollIntervalMs);
  }
  throw new Error(`ComfyUI timed out while generating ${layerId}.`);
}

async function httpCheck(name, url, fetchOverride) {
  const fetchImpl = fetchOverride ?? globalThis.fetch;
  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(2_000) });
    return {
      ok: response.ok,
      name,
      detail: response.ok ? url : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      name,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fileCheck(name, path) {
  try {
    await access(path);
    return { ok: true, name, detail: path };
  } catch {
    return { ok: false, name, detail: `File not found: ${path}` };
  }
}

async function fetchJson(fetchImpl, url, options = {}) {
  const response = await fetchImpl(url, options);
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

function validateManifestShape(manifest) {
  if (!manifest || manifest.schemaVersion !== 1 || !Array.isArray(manifest.shots)) {
    throw new Error('Animation layer candidate generation requires a schemaVersion 1 animation asset manifest.');
  }
  for (const shot of manifest.shots) {
    if (!shot.shotId || !Number.isInteger(shot.sourceShotNumber) || !shot.sourceFrame) {
      throw new Error('Animation asset manifest contains an invalid shot entry.');
    }
    if (!Array.isArray(shot.layers) || !shot.activationPolicy?.requiredLayerIds) {
      throw new Error(`Animation asset manifest shot ${shot.shotId} is missing layers or activation policy.`);
    }
  }
}

function uniqueShots(selected) {
  return [...new Map(selected.map(({ shot }) => [shot.shotId, shot])).values()];
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += Math.max(1, size)) {
    chunks.push(items.slice(index, index + Math.max(1, size)));
  }
  return chunks;
}

function safeName(value) {
  return value.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '');
}

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function randomSeed() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

function delay(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readJsonOptional(path) {
  try {
    return await readJson(path);
  } catch {
    return undefined;
  }
}
