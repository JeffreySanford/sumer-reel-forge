import { buildRuntimeProjections } from './runtime-capabilities.service';

describe('runtime capability projections', () => {
  const software = [
    { id: 'remotion', label: 'Remotion', status: 'ready' as const, detail: '' },
    { id: 'ffmpeg', label: 'FFmpeg', status: 'ready' as const, detail: '' },
    { id: 'ollama', label: 'Ollama', status: 'ready' as const, detail: '' },
    { id: 'comfyui', label: 'ComfyUI', status: 'ready' as const, detail: '' },
    { id: 'cuda', label: 'CUDA', status: 'ready' as const, detail: '' },
    { id: 'nvenc', label: 'NVENC', status: 'ready' as const, detail: '' },
  ];

  it('projects workstation-class local production capabilities', () => {
    const projections = buildRuntimeProjections(
      {
        ollama: { models: ['qwen3:8b', 'qwen3-vl:4b-instruct'] },
        runtimePlan: {
          remotion: { parallelRenders: 2, concurrencyPerRender: 8 },
          ai: {
            ollamaReviewConcurrency: 2,
            comfyConcurrency: 1,
            comfyVramMode: 'normalvram',
          },
        },
      },
      software,
    );

    expect(projections.find((item) => item.id === 'scene-v2-rendering')?.status).toBe('ready');
    expect(projections.find((item) => item.id === 'parallel-benchmarks')?.status).toBe('ready');
    expect(projections.find((item) => item.id === 'vision-review')?.summary).toContain('qwen3-vl:4b-instruct');
    expect(projections.find((item) => item.id === 'animation-layer-generation')?.status).toBe('ready');
    expect(projections.find((item) => item.id === 'hardware-encoding')?.status).toBe('ready');
  });

  it('does not claim GPU layer generation when ComfyUI is unavailable', () => {
    const projections = buildRuntimeProjections(
      {
        ollama: { models: [] },
        runtimePlan: {
          remotion: { parallelRenders: 1, concurrencyPerRender: 2 },
          ai: { comfyConcurrency: 1, comfyVramMode: 'lowvram' },
        },
      },
      software.map((item) =>
        item.id === 'comfyui' ? { ...item, status: 'unavailable' as const } : item,
      ),
    );

    expect(projections.find((item) => item.id === 'animation-layer-generation')?.status).toBe('unavailable');
    expect(projections.find((item) => item.id === 'parallel-benchmarks')?.status).toBe('limited');
  });
});
