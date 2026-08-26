import type { EasingId } from './easing';
import { evaluateEasing } from './easing';

export interface FrameKeyframe<T> {
  readonly frame: number;
  readonly value: T;
  readonly easing?: EasingId;
}

export type Interpolator<T> = (left: T, right: T, progress: number) => T;

export function validateKeyframes<T>(keyframes: readonly FrameKeyframe<T>[]): void {
  if (keyframes.length === 0) {
    throw new RangeError('At least one keyframe is required.');
  }
  let previous = -1;
  for (const keyframe of keyframes) {
    if (!Number.isInteger(keyframe.frame) || keyframe.frame < 0) {
      throw new RangeError(`Keyframe frame must be a non-negative integer; received ${keyframe.frame}.`);
    }
    if (keyframe.frame <= previous) {
      throw new RangeError('Keyframe frames must be strictly increasing.');
    }
    previous = keyframe.frame;
  }
}

export function evaluateKeyframes<T>(
  keyframes: readonly FrameKeyframe<T>[],
  frame: number,
  interpolate: Interpolator<T>,
): T {
  validateKeyframes(keyframes);
  if (!Number.isFinite(frame)) throw new RangeError('frame must be finite.');

  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];
  if (frame <= first.frame) return first.value;
  if (frame >= last.frame) return last.value;

  for (let index = 0; index < keyframes.length - 1; index += 1) {
    const left = keyframes[index];
    const right = keyframes[index + 1];
    if (frame > right.frame) continue;
    const raw = (frame - left.frame) / (right.frame - left.frame);
    const eased = evaluateEasing(left.easing ?? 'linear', raw);
    return interpolate(left.value, right.value, eased);
  }

  return last.value;
}

export function evaluateNumericKeyframes(
  keyframes: readonly FrameKeyframe<number>[],
  frame: number,
): number {
  return evaluateKeyframes(
    keyframes,
    frame,
    (left, right, progress) => left + (right - left) * progress,
  );
}
