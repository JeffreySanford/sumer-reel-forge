export type EasingId =
  | 'linear'
  | 'smoothstep'
  | 'smootherstep'
  | 'ease-in-quad'
  | 'ease-out-quad'
  | 'ease-in-out-cubic'
  | 'physical-lag-v1';

export const EASING_IDS: readonly EasingId[] = [
  'linear',
  'smoothstep',
  'smootherstep',
  'ease-in-quad',
  'ease-out-quad',
  'ease-in-out-cubic',
  'physical-lag-v1',
] as const;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError('Easing input must be finite.');
  return Math.min(1, Math.max(0, value));
}

export function evaluateEasing(id: EasingId, input: number): number {
  const t = clamp01(input);
  switch (id) {
    case 'linear':
      return t;
    case 'smoothstep':
      return t * t * (3 - 2 * t);
    case 'smootherstep':
      return t * t * t * (t * (t * 6 - 15) + 10);
    case 'ease-in-quad':
      return t * t;
    case 'ease-out-quad':
      return t * (2 - t);
    case 'ease-in-out-cubic':
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    case 'physical-lag-v1':
      // A versioned deterministic response curve, not a live physics simulation.
      return t * t * (2 - t);
    default: {
      const exhaustive: never = id;
      throw new RangeError(`Unknown easing ${String(exhaustive)}.`);
    }
  }
}
