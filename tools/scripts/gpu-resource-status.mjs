#!/usr/bin/env node
import { inspectGpuLease } from '../runtime/gpu-resource-lease.mjs';
import { collectGpuRuntimeTelemetry } from '../runtime/gpu-runtime-telemetry.mjs';

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const [lease, telemetry] = await Promise.all([
    inspectGpuLease(),
    collectGpuRuntimeTelemetry(),
  ]);

  console.log('Sumer Reel Forge GPU resource status');
  if (!lease) {
    console.log('Lease: FREE (execution lease only; resident models may still consume VRAM)');
  } else {
    const owner = lease.metadata;
    console.log(
      `Lease: ${lease.stale ? 'STALE' : 'HELD'} · ${owner?.backend ?? 'unknown'}:${owner?.task ?? 'unknown'} · owner=${owner?.owner ?? 'unknown'} · pid=${owner?.pid ?? 'unknown'} · reason=${lease.reason}`,
    );
    if (owner?.model) console.log(`Model: ${owner.model}`);
    if (owner?.expiresAt) console.log(`Expires: ${owner.expiresAt}`);
  }

  if (telemetry.nvidia.available && telemetry.nvidia.devices.length) {
    for (const device of telemetry.nvidia.devices) {
      console.log(
        `GPU: ${device.name} · total=${formatMb(device.memoryTotalMb)} · used=${formatMb(device.memoryUsedMb)} · free=${formatMb(device.memoryFreeMb)}`,
      );
    }
  } else {
    console.log('GPU: nvidia-smi unavailable');
  }

  if (telemetry.ollama.reachable) {
    const loaded = telemetry.ollama.loadedModels ?? [];
    console.log(`Ollama loaded: ${loaded.length} model(s)`);
    for (const model of loaded) {
      const vram = bytesToMb(model.sizeVramBytes);
      const expiry = model.expiresAt ? ` · expires=${model.expiresAt}` : '';
      console.log(
        `  - ${model.name}${vram === undefined ? '' : ` · VRAM=${vram}MB`}${expiry}`,
      );
    }
  } else {
    const detail = telemetry.ollama.error
      ? ` · ${telemetry.ollama.error}`
      : telemetry.ollama.httpStatus
        ? ` · HTTP ${telemetry.ollama.httpStatus}`
        : '';
    console.log(`Ollama loaded: unavailable${detail}`);
  }

  if (telemetry.comfyui.reachable) {
    const devices = telemetry.comfyui.devices ?? [];
    console.log(`ComfyUI: reachable · ${devices.length} device(s)`);
    for (const device of devices) {
      const total = bytesToMb(device.vramTotalBytes);
      const free = bytesToMb(device.vramFreeBytes);
      const torchTotal = bytesToMb(device.torchVramTotalBytes);
      const torchFree = bytesToMb(device.torchVramFreeBytes);
      console.log(
        `  - ${device.name ?? device.type ?? 'device'}${total === undefined ? '' : ` · VRAM total=${total}MB`}${free === undefined ? '' : ` · free=${free}MB`}${torchTotal === undefined ? '' : ` · torch total=${torchTotal}MB`}${torchFree === undefined ? '' : ` · torch free=${torchFree}MB`}`,
      );
    }
  } else {
    const detail = telemetry.comfyui.error
      ? ` · ${telemetry.comfyui.error}`
      : telemetry.comfyui.httpStatus
        ? ` · HTTP ${telemetry.comfyui.httpStatus}`
        : '';
    console.log(`ComfyUI: unavailable${detail}`);
  }
}

function bytesToMb(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed / 1024 / 1024) : undefined;
}

function formatMb(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${Math.round(parsed)}MB` : 'unknown';
}
