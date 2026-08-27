import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_TELEMETRY_DIRECTORY = 'tmp/runtime/gpu-tasks';
const DEFAULT_PROBE_TIMEOUT_MS = 1_500;

export async function collectGpuRuntimeTelemetry(options = {}) {
  const env = options.env ?? process.env;
  const runCommand = options.runCommand ?? defaultRunCommand;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const capturedAt = new Date().toISOString();
  const nvidia = collectNvidiaMemory(runCommand, env);
  const [ollama, comfyui] = await Promise.all([
    collectOllamaState(fetchImpl, env),
    collectComfyUiState(fetchImpl, env),
  ]);

  return {
    schemaVersion: 1,
    capturedAt,
    nvidia,
    ollama,
    comfyui,
  };
}

export async function persistGpuTaskReceipt(receipt, options = {}) {
  const env = options.env ?? process.env;
  const root = resolve(
    options.outputDirectory ??
      env.SRF_GPU_TASK_TELEMETRY_PATH ??
      DEFAULT_TELEMETRY_DIRECTORY,
  );
  await mkdir(root, { recursive: true });
  const owner = safeName(receipt?.lease?.owner ?? 'unknown-owner');
  const task = safeName(receipt?.lease?.task ?? 'unknown-task');
  const stamp = safeName(receipt?.completedAt ?? new Date().toISOString());
  const target = resolve(root, `${stamp}-${owner}-${task}-${process.pid}.json`);
  await writeFile(target, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  return target;
}

function collectNvidiaMemory(runCommand, env) {
  const result = runCommand(env.NVIDIA_SMI_COMMAND ?? 'nvidia-smi', [
    '--query-gpu=index,name,memory.total,memory.used,memory.free',
    '--format=csv,noheader,nounits',
  ]);
  if (!result.ok) {
    return { available: false, devices: [] };
  }

  const devices = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [index, name, total, used, free] = line
        .split(',')
        .map((part) => part.trim());
      return {
        index: Number(index),
        name,
        memoryTotalMb: numberOrUndefined(total),
        memoryUsedMb: numberOrUndefined(used),
        memoryFreeMb: numberOrUndefined(free),
      };
    });

  return { available: true, devices };
}

async function collectOllamaState(fetchImpl, env) {
  const baseUrl = (env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(
    /\/$/,
    '',
  );
  if (typeof fetchImpl !== 'function') {
    return { baseUrl, reachable: false, loadedModels: [] };
  }

  try {
    const response = await fetchImpl(`${baseUrl}/api/ps`, {
      signal: AbortSignal.timeout(DEFAULT_PROBE_TIMEOUT_MS),
    });
    if (!response.ok) {
      return {
        baseUrl,
        reachable: false,
        httpStatus: response.status,
        loadedModels: [],
      };
    }
    const payload = await response.json();
    const loadedModels = Array.isArray(payload.models)
      ? payload.models.map((model) => ({
          name: model.name ?? model.model ?? 'unknown',
          sizeBytes: numberOrUndefined(model.size),
          sizeVramBytes: numberOrUndefined(model.size_vram),
          expiresAt: optionalString(model.expires_at),
        }))
      : [];
    return { baseUrl, reachable: true, loadedModels };
  } catch (error) {
    return {
      baseUrl,
      reachable: false,
      error: errorMessage(error),
      loadedModels: [],
    };
  }
}

async function collectComfyUiState(fetchImpl, env) {
  const baseUrl = (env.COMFYUI_BASE_URL ?? 'http://127.0.0.1:8188').replace(
    /\/$/,
    '',
  );
  if (typeof fetchImpl !== 'function') {
    return { baseUrl, reachable: false, devices: [] };
  }

  try {
    const response = await fetchImpl(`${baseUrl}/system_stats`, {
      signal: AbortSignal.timeout(DEFAULT_PROBE_TIMEOUT_MS),
    });
    if (!response.ok) {
      return {
        baseUrl,
        reachable: false,
        httpStatus: response.status,
        devices: [],
      };
    }
    const payload = await response.json();
    const devices = Array.isArray(payload.devices)
      ? payload.devices.map((device) => ({
          name: optionalString(device.name),
          type: optionalString(device.type),
          vramTotalBytes: numberOrUndefined(device.vram_total),
          vramFreeBytes: numberOrUndefined(device.vram_free),
          torchVramTotalBytes: numberOrUndefined(device.torch_vram_total),
          torchVramFreeBytes: numberOrUndefined(device.torch_vram_free),
        }))
      : [];
    return { baseUrl, reachable: true, devices };
  } catch (error) {
    return {
      baseUrl,
      reachable: false,
      error: errorMessage(error),
      devices: [],
    };
  }
}

function defaultRunCommand(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 3_000,
  });
  return {
    ok: !result.error && result.status === 0,
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function numberOrUndefined(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optionalString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function safeName(value) {
  return String(value)
    .trim()
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
