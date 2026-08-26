export interface FrameInterval {
  readonly startFrame: number;
  readonly endFrame: number;
}

export function assertValidInterval(interval: FrameInterval): void {
  if (!Number.isInteger(interval.startFrame) || !Number.isInteger(interval.endFrame)) {
    throw new RangeError('Frame interval bounds must be integers.');
  }
  if (interval.startFrame < 0 || interval.endFrame <= interval.startFrame) {
    throw new RangeError(
      `Frame interval must use [startFrame, endFrame) with end > start; received [${interval.startFrame}, ${interval.endFrame}).`,
    );
  }
}

export function containsFrame(interval: FrameInterval, frame: number): boolean {
  assertValidInterval(interval);
  if (!Number.isInteger(frame)) return false;
  return frame >= interval.startFrame && frame < interval.endFrame;
}

export function clampFrameToInterval(
  interval: FrameInterval,
  frame: number,
): number {
  assertValidInterval(interval);
  if (!Number.isFinite(frame)) {
    throw new RangeError('frame must be finite.');
  }
  return Math.min(
    interval.endFrame - 1,
    Math.max(interval.startFrame, Math.trunc(frame)),
  );
}

export function intervalProgress(
  interval: FrameInterval,
  frame: number,
  clamp = true,
): number {
  assertValidInterval(interval);
  if (!Number.isFinite(frame)) {
    throw new RangeError('frame must be finite.');
  }
  const lastFrame = interval.endFrame - 1;
  if (lastFrame === interval.startFrame) return 0;
  const raw = (frame - interval.startFrame) / (lastFrame - interval.startFrame);
  return clamp ? Math.min(1, Math.max(0, raw)) : raw;
}
