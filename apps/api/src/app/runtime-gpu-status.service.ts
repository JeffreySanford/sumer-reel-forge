import { Injectable } from '@nestjs/common';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

type LeaseState = 'FREE' | 'HELD' | 'STALE';

interface CommandResult {
  ok: boolean;
  stdout: string;
  stderr?: string;
}

interface ProbeResult {
  ok: boolean;
  payload?: any;
  error?: string;
  httpStatus?: number;
}

interface RuntimeGpuStatusOptions {
  env?: NodeJS.ProcessEnv;
  runCommand?: (command: string, args: string[]) => CommandResult;
  fetchJson?: (url: string) => Promise<ProbeResult>;
  now?: () => Date;
}

@Injectable()
export class RuntimeGpuStatusService {
  async getStatus(options: RuntimeGpuStatusOptions = {}) {
    const env = options.env ?? process.env;
    const now = options.now ?? (() => new Date());
    const runCommand = options.runCommand ?? defaultRunCommand;
    const fetchJson = options.fetchJson ?? probeJsonEndpoint;
    const lease = inspectGpuLease(env, now());
    const nvidia = collectNvidiaMemory(runCommand, env);
    const ollamaBaseUrl = (env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(
      /\/$/,
      '',
    );
    const comfyBaseUrl = (env.COMFYUI_BASE_URL ?? 'http://127.0.0.1:8188').replace(
      /\/$/,
      '',
    );
    const [ollama, comfyui] = await Promise.all([
      collectOllamaState(fetchJson, ollamaBaseUrl),
      collectComfyUiState(fetchJson, comfyBaseUrl),
    ]);

    return {
      schemaVersion: 1,
      observedAt: now().toISOString(),
      lease,
      nvidia,
      ollama,
      comfyui,
    };
  }
}

function inspectGpuLease(env: NodeJS.ProcessEnv, now: Date) {
  const leaseDirectory = resolve(env.SRF_GPU_LEASE_PATH ?? 'tmp/runtime/gpu-lease');
  const metadataPath = join(leaseDirectory, 'lease.json');
  if (!existsSync(metadataPath)) {
    return {
      state: 'FREE' as LeaseState,
      reason: 'available',
      directory: leaseDirectory,
      metadata: null,
    };
  }

  try {
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
    const expiresAt = Date.parse(metadata.expiresAt ?? '');
    const expired = Number.isFinite(expiresAt) && expiresAt <= now.getTime();
    return {
      state: expired ? ('STALE' as LeaseState) : ('HELD' as LeaseState),
      reason: expired ? 'expired' : 'active',
      directory: leaseDirectory,
      metadata: {
        owner: optionalString(metadata.owner),
        task: optionalString(metadata.task),
        backend: optionalString(metadata.backend),
        model: optionalString(metadata.model),
        pid: numberOrUndefined(metadata.pid),
        host: optionalString(metadata.host),
        acquiredAt: optionalString(metadata.acquiredAt),
        expiresAt: optionalString(metadata.expiresAt),
        heartbeatAt: optionalString(metadata.heartbeatAt),
      },
    };
  } catch (error) {
    return {
      state: 'STALE' as LeaseState,
      reason: `metadata-unreadable: ${errorMessage(error)}`,
      directory: leaseDirectory,
      metadata: null,
    };
  }
}

function collectNvidiaMemory(
  runCommand: (command: string, args: string[]) => CommandResult,
  env: NodeJS.ProcessEnv,
) {
  const result = runCommand(env.NVIDIA_SMI_COMMAND ?? 'nvidia-smi', [
    '--query-gpu=index,name,memory.total,memory.used,memory.free,utilization.gpu,driver_version',
    '--format=csv,noheader,nounits',
  ]);
  if (!result.ok) {
    return { available: false, devices: [], error: result.stderr || undefined };
  }

  const devices = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [index, name, total, used, free, utilization, driverVersion] = line
        .split(',')
        .map((part) => part.trim());
      return {
        index: numberOrUndefined(index),
        name,
        memoryTotalMb: numberOrUndefined(total),
        memoryUsedMb: numberOrUndefined(used),
        memoryFreeMb: numberOrUndefined(free),
        utilizationGpuPercent: numberOrUndefined(utilization),
        driverVersion: optionalString(driverVersion),
      };
    });

  return { available: true, devices };
}

async function collectOllamaState(
  fetchJson: (url: string) => Promise<ProbeResult>,
  baseUrl: string,
) {
  const result = await fetchJson(`${baseUrl}/api/ps`);
  if (!result.ok) {
    return {
      baseUrl,
      reachable: false,
      loadedModels: [],
      error: result.error,
      httpStatus: result.httpStatus,
    };
  }

  const loadedModels = Array.isArray(result.payload?.models)
    ? result.payload.models.map((model: any) => ({
        name: model.name ?? model.model ?? 'unknown',
        sizeBytes: numberOrUndefined(model.size),
        sizeVramBytes: numberOrUndefined(model.size_vram),
        expiresAt: optionalString(model.expires_at),
      }))
    : [];
  return { baseUrl, reachable: true, loadedModels };
}

async function collectComfyUiState(
  fetchJson: (url: string) => Promise<ProbeResult>,
  baseUrl: string,
) {
  const result = await fetchJson(`${baseUrl}/system_stats`);
  if (!result.ok) {
    return {
      baseUrl,
      reachable: false,
      devices: [],
      error: result.error,
      httpStatus: result.httpStatus,
    };
  }

  const devices = Array.isArray(result.payload?.devices)
    ? result.payload.devices.map((device: any) => ({
        name: optionalString(device.name),
        type: optionalString(device.type),
        vramTotalBytes: numberOrUndefined(device.vram_total),
        vramFreeBytes: numberOrUndefined(device.vram_free),
        torchVramTotalBytes: numberOrUndefined(device.torch_vram_total),
        torchVramFreeBytes: numberOrUndefined(device.torch_vram_free),
      }))
    : [];

  return {
    baseUrl,
    reachable: true,
    devices,
    system: {
      comfyuiVersion: optionalString(result.payload?.system?.comfyui_version),
      pytorchVersion: optionalString(result.payload?.system?.pytorch_version),
    },
  };
}

function defaultRunCommand(command: string, args: string[]): CommandResult {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 3000,
    shell: process.platform === 'win32',
  });
  return {
    ok: !result.error && result.status === 0,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? result.error?.message,
  };
}

async function probeJsonEndpoint(url: string): Promise<ProbeResult> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) {
      return { ok: false, httpStatus: response.status, error: `HTTP ${response.status}` };
    }
    return { ok: true, payload: await response.json() };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

function numberOrUndefined(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
