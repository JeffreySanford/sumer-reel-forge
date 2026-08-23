import { buildRuntimeProjections } from './runtime-capabilities.service';

describe('runtime capability projections', () => {
  const software = [
    { id: 'remotion', label: 'Remotion', status: 'ready' as const, detail: '' },
    { id: 'ffmpeg', label: 'FFmpeg', status: 'ready' as const, detail: '' },
    { id: 'ollama', label: 'Ollama', status: 'ready' as const, detail: '' },
    { id: 'comfyui', label: 'ComfyUI', status: 'ready' as const, detail: '' },
    {
      id: 'comfyui-layer-workflow',
      label: 'ComfyUI Layer Workflow',
      status: 'ready' as const,
      detail: '',
    },
    { id: 'cuda', label: 'CUDA', status: 'ready' as const, detail: '' },
    { id: 'nvenc', label: 'NVENC', status: 'ready' as const, detail: '' },
  ];

  const workstationProfile = {
    gpu: {
      nvidiaSmiAvailable: true,
      devices: [
        {
          vendor: 'NVIDIA',
          name: 'NVIDIA GeForce RTX 3080',
          memoryTotalMb: 10240,
        },
      ],
    },
    ollama: { models: ['qwen3:8b', 'qwen3-vl:4b-instruct'] },
    runtimePlan: {
      remotion: { parallelRenders: 2, concurrencyPerRender: 8 },
      ai: {
        ollamaReviewConcurrency: 2,
        comfyConcurrency: 1,
        comfyVramMode: 'normalvram',
      },
    },
  };

  it('projects workstation-class local production capabilities', () => {
    const projections = buildRuntimeProjections(workstationProfile, software);

    expect(
      projections.find((item) => item.id === 'scene-v2-rendering')?.status,
    ).toBe('ready');
    expect(
      projections.find((item) => item.id === 'parallel-benchmarks')?.status,
    ).toBe('ready');
    expect(
      projections.find((item) => item.id === 'vision-review')?.summary,
    ).toContain('qwen3-vl:4b-instruct');
    expect(
      projections.find((item) => item.id === 'nvidia-gpu-acceleration')
        ?.status,
    ).toBe('ready');
    expect(
      projections.find((item) => item.id === 'nvidia-gpu-acceleration')
        ?.summary,
    ).toContain('10.0 GB VRAM');
    expect(
      projections.find((item) => item.id === 'animation-layer-generation')
        ?.status,
    ).toBe('ready');
    expect(
      projections.find((item) => item.id === 'hardware-encoding')?.status,
    ).toBe('ready');
  });

  it('reports pipeline setup required rather than GPU unavailable when ComfyUI is offline', () => {
    const projections = buildRuntimeProjections(
      workstationProfile,
      software.map((item) =>
        item.id === 'comfyui'
          ? { ...item, status: 'unavailable' as const }
          : item,
      ),
    );

    expect(
      projections.find((item) => item.id === 'nvidia-gpu-acceleration')
        ?.status,
    ).toBe('ready');
    const pipeline = projections.find(
      (item) => item.id === 'animation-layer-generation',
    );
    expect(pipeline?.status).toBe('limited');
    expect(pipeline?.summary).toContain('ComfyUI is offline');
  });

  it('reports setup required when the dedicated workflow is not configured', () => {
    const projections = buildRuntimeProjections(
      workstationProfile,
      software.map((item) =>
        item.id === 'comfyui-layer-workflow'
          ? { ...item, status: 'limited' as const }
          : item,
      ),
    );

    const pipeline = projections.find(
      (item) => item.id === 'animation-layer-generation',
    );
    expect(pipeline?.status).toBe('limited');
    expect(pipeline?.summary).toContain('workflow still needs to be configured');
    expect(
      projections.find((item) => item.id === 'nvidia-gpu-acceleration')
        ?.status,
    ).toBe('ready');
  });

  it('only reports GPU acceleration unavailable when NVIDIA CUDA detection fails', () => {
    const projections = buildRuntimeProjections(
      {
        ...workstationProfile,
        gpu: { nvidiaSmiAvailable: false, devices: [] },
      },
      software.map((item) =>
        item.id === 'cuda'
          ? { ...item, status: 'unavailable' as const }
          : item,
      ),
    );

    expect(
      projections.find((item) => item.id === 'nvidia-gpu-acceleration')
        ?.status,
    ).toBe('unavailable');
    expect(
      projections.find((item) => item.id === 'animation-layer-generation')
        ?.status,
    ).toBe('unavailable');
  });
});
