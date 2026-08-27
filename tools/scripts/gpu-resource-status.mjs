#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { inspectGpuLease } from '../runtime/gpu-resource-lease.mjs';

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const lease = await inspectGpuLease();
  console.log('Sumer Reel Forge GPU resource status');
  if (!lease) {
    console.log('Lease: FREE');
  } else {
    const owner = lease.metadata;
    console.log(
      `Lease: ${lease.stale ? 'STALE' : 'HELD'} · ${owner?.backend ?? 'unknown'}:${owner?.task ?? 'unknown'} · owner=${owner?.owner ?? 'unknown'} · pid=${owner?.pid ?? 'unknown'} · reason=${lease.reason}`,
    );
    if (owner?.model) console.log(`Model: ${owner.model}`);
    if (owner?.expiresAt) console.log(`Expires: ${owner.expiresAt}`);
  }

  const nvidia = spawnSync(
    process.env.NVIDIA_SMI_COMMAND ?? 'nvidia-smi',
    [
      '--query-gpu=name,memory.total,memory.used,memory.free',
      '--format=csv,noheader,nounits',
    ],
    { encoding: 'utf8', windowsHide: true },
  );
  if (!nvidia.error && nvidia.status === 0) {
    for (const line of nvidia.stdout.trim().split(/\r?\n/).filter(Boolean)) {
      const [name, total, used, free] = line.split(',').map((part) => part.trim());
      console.log(`GPU: ${name} · total=${total}MB · used=${used}MB · free=${free}MB`);
    }
  } else {
    console.log('GPU: nvidia-smi unavailable');
  }

  const ollama = spawnSync('ollama', ['ps'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (!ollama.error && ollama.status === 0) {
    const lines = ollama.stdout.trim().split(/\r?\n/).filter(Boolean);
    console.log(`Ollama loaded: ${Math.max(0, lines.length - 1)} model(s)`);
    if (lines.length > 1) console.log(lines.slice(1).join('\n'));
  } else {
    console.log('Ollama loaded: unavailable');
  }
}
