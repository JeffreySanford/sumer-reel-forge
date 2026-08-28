import { withGpuAiTask } from '../runtime/gpu-ai-task.mjs';
import { renderComfyUiImages as renderComfyUiImagesEngine } from './comfyui-adapter-engine.mjs';

const DEFAULT_GPU_TIMEOUT_MS = 10 * 60_000;

export async function renderComfyUiImages(context) {
  const episodeId =
    context?.episode?.episode ?? context?.episode?.id ?? context?.episode?.slug ?? 'unknown';

  return withGpuAiTask(
    {
      owner: 'local-renderer-comfyui',
      task: `episode-${episodeId}-image-generation`,
      backend: 'comfyui',
      timeoutMs: positiveInteger(
        process.env.SRF_GPU_LEASE_TIMEOUT_MS,
        DEFAULT_GPU_TIMEOUT_MS,
      ),
    },
    async (lease) => {
      await context?.log?.(
        'system',
        'info',
        `GPU lease acquired for ${lease.metadata.task}; rendering the complete ComfyUI image batch before TTS/Whisper/FFmpeg.`,
      );
      return renderComfyUiImagesEngine(context);
    },
  );
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
