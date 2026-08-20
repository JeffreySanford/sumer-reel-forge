import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function renderComfyUiImages(context) {
  const { episode, outputDirectory, config, log } = context;
  if (!config.comfyWorkflowPath) {
    throw new Error('COMFYUI_WORKFLOW_PATH is required for the local adapter.');
  }
  const workflowTemplate = JSON.parse(
    await readFile(config.comfyWorkflowPath, 'utf8'),
  );
  const clientId = `sumer-reel-forge-${crypto.randomUUID()}`;
  const artifacts = [];

  for (const [index, shot] of episode.shots.entries()) {
    const shotNumber = index + 1;
    const workflow = replaceTokens(workflowTemplate, {
      '{{PROMPT}}': shot.prompt,
      '{{NEGATIVE_PROMPT}}':
        'modern objects, written text, watermark, logo, extra limbs, distorted hands',
      '{{SEED}}': String(randomSeed()),
      '{{OUTPUT_PREFIX}}': `sumer-${episode.episode}-shot-${shotNumber}`,
    });
    await log('system', 'info', `Submitting shot ${shotNumber} to ComfyUI.`);
    const queued = await fetchJson(`${config.comfyBaseUrl}/prompt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: workflow, client_id: clientId }),
      signal: AbortSignal.timeout(config.processTimeoutMs),
    });
    if (!queued.prompt_id) {
      throw new Error(
        `ComfyUI did not return a prompt id for shot ${shotNumber}.`,
      );
    }
    const image = await waitForImage(config, queued.prompt_id, shotNumber, log);
    const response = await fetch(
      `${config.comfyBaseUrl}/view?${new URLSearchParams(image)}`,
      { signal: AbortSignal.timeout(config.processTimeoutMs) },
    );
    if (!response.ok) {
      throw new Error(
        `ComfyUI image download failed with HTTP ${response.status}.`,
      );
    }
    const path = join(
      outputDirectory,
      `shot-${String(shotNumber).padStart(2, '0')}.png`,
    );
    await writeFile(path, Buffer.from(await response.arrayBuffer()));
    artifacts.push({
      assetType: 'image',
      shotNumber,
      path,
      metadata: {
        adapter: 'comfyui',
        promptId: queued.prompt_id,
        sourceFilename: image.filename,
        durationSeconds: shot.durationSeconds,
      },
    });
  }
  return artifacts;
}

async function waitForImage(config, promptId, shotNumber, log) {
  const deadline = Date.now() + config.processTimeoutMs;
  while (Date.now() < deadline) {
    const history = await fetchJson(
      `${config.comfyBaseUrl}/history/${promptId}`,
      {
        signal: AbortSignal.timeout(15000),
      },
    );
    const result = history[promptId];
    const image = Object.values(result?.outputs ?? {})
      .flatMap((output) => output.images ?? [])
      .find((candidate) => candidate.type === 'output' || candidate.filename);
    if (image) {
      return {
        filename: image.filename,
        subfolder: image.subfolder ?? '',
        type: image.type ?? 'output',
      };
    }
    if (result?.status?.status_str === 'error') {
      throw new Error(`ComfyUI failed while rendering shot ${shotNumber}.`);
    }
    await delay(config.comfyPollIntervalMs);
  }
  await log('system', 'error', `ComfyUI timed out on shot ${shotNumber}.`);
  throw new Error(`ComfyUI timed out on shot ${shotNumber}.`);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}.`);
  }
  return response.json();
}

function replaceTokens(value, replacements) {
  if (typeof value === 'string') {
    return Object.entries(replacements).reduce(
      (current, [token, replacement]) => current.split(token).join(replacement),
      value,
    );
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceTokens(item, replacements));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        replaceTokens(item, replacements),
      ]),
    );
  }
  return value;
}

function randomSeed() {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
