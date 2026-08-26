import type { ExactFrameViewModel } from './inspection-types';

export type ExactFrameCommand =
  | 'step-back'
  | 'step-forward'
  | 'jump-back'
  | 'jump-forward'
  | 'home'
  | 'end';

function assertDuration(durationFrames: number): void {
  if (!Number.isInteger(durationFrames) || durationFrames < 1) {
    throw new RangeError('durationFrames must be a positive integer.');
  }
}

export function assertExactFrame(frame: number, durationFrames: number): void {
  assertDuration(durationFrames);
  if (!Number.isInteger(frame)) {
    throw new TypeError('frame must be an integer.');
  }
  if (frame < 0 || frame >= durationFrames) {
    throw new RangeError(
      `frame ${frame} is outside [0, ${durationFrames}).`,
    );
  }
}

export function sceneFrameProgress(
  frame: number,
  durationFrames: number,
): number {
  assertExactFrame(frame, durationFrames);
  return durationFrames === 1 ? 0 : frame / (durationFrames - 1);
}

export function applyExactFrameCommand(
  frame: number,
  durationFrames: number,
  command: ExactFrameCommand,
  jumpFrames = 10,
): number {
  assertExactFrame(frame, durationFrames);
  if (!Number.isInteger(jumpFrames) || jumpFrames < 1) {
    throw new RangeError('jumpFrames must be a positive integer.');
  }

  switch (command) {
    case 'step-back':
      return Math.max(0, frame - 1);
    case 'step-forward':
      return Math.min(durationFrames - 1, frame + 1);
    case 'jump-back':
      return Math.max(0, frame - jumpFrames);
    case 'jump-forward':
      return Math.min(durationFrames - 1, frame + jumpFrames);
    case 'home':
      return 0;
    case 'end':
      return durationFrames - 1;
  }

  const exhaustive: never = command;
  return exhaustive;
}

export function buildExactFrameViewModel(input: {
  readonly frame: number;
  readonly fps: number;
  readonly durationFrames: number;
}): ExactFrameViewModel {
  assertExactFrame(input.frame, input.durationFrames);
  if (!Number.isFinite(input.fps) || input.fps <= 0) {
    throw new RangeError('fps must be positive and finite.');
  }

  return Object.freeze({
    frame: input.frame,
    fps: input.fps,
    durationFrames: input.durationFrames,
    timeSeconds: input.frame / input.fps,
    progress: sceneFrameProgress(input.frame, input.durationFrames),
    label: `frame ${input.frame} / ${input.durationFrames}`,
  });
}
