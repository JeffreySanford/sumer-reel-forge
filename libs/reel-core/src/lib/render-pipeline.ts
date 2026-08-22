import './reel-core';

export type RenderPipeline = 'mock' | 'local' | 'editorial' | 'animation';

declare module './reel-core' {
  interface RenderJobRequest {
    pipeline?: RenderPipeline;
  }

  interface RenderJob {
    pipeline?: RenderPipeline;
  }
}
