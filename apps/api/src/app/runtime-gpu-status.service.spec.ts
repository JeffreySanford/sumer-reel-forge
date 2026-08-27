import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RuntimeGpuStatusService } from './runtime-gpu-status.service';

describe('RuntimeGpuStatusService', () => {
  const service = new RuntimeGpuStatusService();

  it('reports live lease, NVIDIA memory, Ollama residency, and ComfyUI allocator state', async () => {
    const leaseRoot = await mkdtemp(join(tmpdir(), 'srf-gpu-lease-'));
    await writeFile(
      join(leaseRoot, 'lease.json'),
      JSON.stringify({
        owner: 'shot03-background-layer',
        task: 'shot-3-background-repair',
        backend: 'comfyui',
        pid: 1234,
        host: 'test-host',
        acquiredAt: '2026-08-27T22:19:49.763Z',
        expiresAt: '2026-08-27T22:24:49.763Z',
      }),
      'utf8',
    );

    try {
      const status = await service.getStatus({
        env: {
          SRF_GPU_LEASE_PATH: leaseRoot,
          OLLAMA_BASE_URL: 'http://ollama.test',
          COMFYUI_BASE_URL: 'http://comfy.test',
        },
        now: () => new Date('2026-08-27T22:20:00.000Z'),
        runCommand: () => ({
          ok: true,
          stdout: '0, NVIDIA RTX Test, 10240, 3449, 6602, 9, 595.95\n',
        }),
        fetchJson: async (url) => {
          if (url === 'http://ollama.test/api/ps') {
            return {
              ok: true,
              payload: {
                models: [
                  {
                    name: 'qwen3-vl:4b-instruct',
                    size: 26247063139,
                    size_vram: 7957894921,
                    expires_at: '2026-08-27T16:35:06.6983267-05:00',
                  },
                ],
              },
            };
          }
          if (url === 'http://comfy.test/system_stats') {
            return {
              ok: true,
              payload: {
                system: {
                  comfyui_version: '0.33.1',
                  pytorch_version: '2.13.0+cu130',
                },
                devices: [
                  {
                    name: 'cuda:0 NVIDIA RTX Test',
                    type: 'cuda',
                    vram_total: 10736893952,
                    vram_free: 7268598592,
                    torch_vram_total: 33554432,
                    torch_vram_free: 23987008,
                  },
                ],
              },
            };
          }
          return { ok: false, error: `unexpected ${url}` };
        },
      });

      expect(status.lease.state).toBe('HELD');
      expect(status.lease.metadata?.owner).toBe('shot03-background-layer');
      expect(status.lease.metadata?.task).toBe('shot-3-background-repair');
      expect(status.lease.metadata?.backend).toBe('comfyui');
      expect(status.nvidia.devices[0].memoryUsedMb).toBe(3449);
      expect(status.nvidia.devices[0].utilizationGpuPercent).toBe(9);
      expect(status.ollama.loadedModels[0].sizeVramBytes).toBe(7957894921);
      expect(status.comfyui.devices[0].torchVramTotalBytes).toBe(33554432);
    } finally {
      await rm(leaseRoot, { recursive: true, force: true });
    }
  });

  it('separates a stale execution lease from resident GPU memory', async () => {
    const leaseRoot = await mkdtemp(join(tmpdir(), 'srf-gpu-lease-'));
    await writeFile(
      join(leaseRoot, 'lease.json'),
      JSON.stringify({
        owner: 'old-task',
        task: 'expired',
        backend: 'ollama',
        expiresAt: '2026-08-27T22:00:00.000Z',
      }),
      'utf8',
    );

    try {
      const status = await service.getStatus({
        env: { SRF_GPU_LEASE_PATH: leaseRoot },
        now: () => new Date('2026-08-27T22:20:00.000Z'),
        runCommand: () => ({
          ok: true,
          stdout: '0, NVIDIA RTX Test, 10240, 9473, 579, 0, 595.95\n',
        }),
        fetchJson: async () => ({ ok: true, payload: { models: [], devices: [] } }),
      });

      expect(status.lease.state).toBe('STALE');
      expect(status.lease.reason).toBe('expired');
      expect(status.nvidia.devices[0].memoryFreeMb).toBe(579);
      expect(status.ollama.loadedModels).toEqual([]);
    } finally {
      await rm(leaseRoot, { recursive: true, force: true });
    }
  });
});
