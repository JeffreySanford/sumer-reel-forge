export type FrameMode = 'preview' | 'storybook' | 'render' | 'qa';

export interface FrameContext {
  readonly frame: number;
  readonly fps: number;
  readonly durationFrames: number;
  readonly timeSeconds: number;
  readonly progress: number;
  readonly sceneId: string;
  readonly shotId?: string;
  readonly sceneSeed: number;
  readonly mode: FrameMode;
}

export interface CreateFrameContextInput {
  frame: number;
  fps: number;
  durationFrames: number;
  sceneId: string;
  shotId?: string;
  sceneSeed: number;
  mode: FrameMode;
}

export function assertValidFrame(frame: number, durationFrames: number): void {
  if (!Number.isInteger(durationFrames) || durationFrames < 1) {
    throw new RangeError('durationFrames must be a positive integer.');
  }
  if (!Number.isInteger(frame) || frame < 0 || frame >= durationFrames) {
    throw new RangeError(
      `frame must be an integer inside [0, ${durationFrames}); received ${frame}.`,
    );
  }
}

export function frameToSeconds(frame: number, fps: number): number {
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new RangeError('fps must be positive and finite.');
  }
  return frame / fps;
}

export function sceneProgress(frame: number, durationFrames: number): number {
  assertValidFrame(frame, durationFrames);
  return durationFrames === 1 ? 0 : frame / (durationFrames - 1);
}

export function createFrameContext(input: CreateFrameContextInput): FrameContext {
  assertValidFrame(input.frame, input.durationFrames);
  if (!Number.isFinite(input.fps) || input.fps <= 0) {
    throw new RangeError('fps must be positive and finite.');
  }
  if (!input.sceneId.trim()) {
    throw new TypeError('sceneId is required.');
  }
  if (!Number.isInteger(input.sceneSeed)) {
    throw new TypeError('sceneSeed must be an integer.');
  }

  return Object.freeze({
    frame: input.frame,
    fps: input.fps,
    durationFrames: input.durationFrames,
    timeSeconds: frameToSeconds(input.frame, input.fps),
    progress: sceneProgress(input.frame, input.durationFrames),
    sceneId: input.sceneId,
    ...(input.shotId ? { shotId: input.shotId } : {}),
    sceneSeed: input.sceneSeed,
    mode: input.mode,
  });
}
