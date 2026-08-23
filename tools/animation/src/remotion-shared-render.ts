import { renderMedia, selectComposition } from '@remotion/renderer';
import type { LocalRenderProfile } from './local-render-profile';

export interface RemotionPhaseMetrics {
  totalDurationMs: number;
  renderedDoneInMs: number | null;
  encodedDoneInMs: number | null;
  resolvedConcurrency: number | null;
  parallelEncoding: boolean | null;
}

export interface SharedBundleRenderOptions {
  serveUrl: string;
  compositionId: string;
  inputProps: Record<string, unknown>;
  outputLocation: string;
  profile: LocalRenderProfile;
}

export async function renderFromPreparedBundle(
  options: SharedBundleRenderOptions,
): Promise<RemotionPhaseMetrics> {
  const chromiumOptions = options.profile.gl
    ? { gl: options.profile.gl }
    : undefined;
  const composition = await selectComposition({
    serveUrl: options.serveUrl,
    id: options.compositionId,
    inputProps: options.inputProps,
    chromiumOptions,
  });

  let renderedDoneInMs: number | null = null;
  let encodedDoneInMs: number | null = null;
  let resolvedConcurrency: number | null = null;
  let parallelEncoding: boolean | null = null;
  const startedAt = Date.now();

  await renderMedia({
    composition,
    serveUrl: options.serveUrl,
    codec: 'h264',
    pixelFormat: 'yuv420p',
    outputLocation: options.outputLocation,
    inputProps: options.inputProps,
    overwrite: true,
    concurrency: options.profile.concurrency,
    hardwareAcceleration: options.profile.hardwareAcceleration,
    chromiumOptions,
    onStart: (data) => {
      resolvedConcurrency = data.resolvedConcurrency;
      parallelEncoding = data.parallelEncoding;
    },
    onProgress: (progress) => {
      if (progress.renderedDoneIn !== null) {
        renderedDoneInMs = progress.renderedDoneIn;
      }
      if (progress.encodedDoneIn !== null) {
        encodedDoneInMs = progress.encodedDoneIn;
      }
    },
  });

  return {
    totalDurationMs: Date.now() - startedAt,
    renderedDoneInMs,
    encodedDoneInMs,
    resolvedConcurrency,
    parallelEncoding,
  };
}

export function formatRemotionPhaseMetrics(
  metrics: RemotionPhaseMetrics,
): string {
  const rendered =
    metrics.renderedDoneInMs === null
      ? 'render n/a'
      : `render ${(metrics.renderedDoneInMs / 1000).toFixed(1)}s`;
  const encoded =
    metrics.encodedDoneInMs === null
      ? 'encode n/a'
      : `encode ${(metrics.encodedDoneInMs / 1000).toFixed(1)}s`;
  const concurrency =
    metrics.resolvedConcurrency === null
      ? 'concurrency n/a'
      : `concurrency ${metrics.resolvedConcurrency}`;
  const parallel =
    metrics.parallelEncoding === null
      ? 'parallel encode n/a'
      : `parallel encode ${metrics.parallelEncoding ? 'yes' : 'no'}`;
  return `${rendered}, ${encoded}, total ${(metrics.totalDurationMs / 1000).toFixed(1)}s, ${concurrency}, ${parallel}`;
}
