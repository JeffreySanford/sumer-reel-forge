export const BLINK_CLOSE_FRACTION = 0.2;
export const BLINK_HOLD_END_FRACTION = 0.72;

export function blinkOnceOpacity({
  progress,
  startProgress,
  endProgress,
  intensity = 1,
}) {
  if (!Number.isFinite(progress)) {
    throw new Error('blinkOnceOpacity requires finite progress.');
  }
  if (
    !Number.isFinite(startProgress) ||
    !Number.isFinite(endProgress) ||
    endProgress <= startProgress
  ) {
    throw new Error('blinkOnceOpacity requires endProgress > startProgress.');
  }
  if (!Number.isFinite(intensity) || intensity < 0) {
    throw new Error('blinkOnceOpacity requires a non-negative intensity.');
  }

  if (progress <= startProgress || progress >= endProgress) return 0;

  const local = clamp(
    (progress - startProgress) / (endProgress - startProgress),
    0,
    1,
  );

  if (local < BLINK_CLOSE_FRACTION) {
    return smoothstep(0, BLINK_CLOSE_FRACTION, local) * intensity;
  }
  if (local <= BLINK_HOLD_END_FRACTION) {
    return intensity;
  }
  return (
    (1 - smoothstep(BLINK_HOLD_END_FRACTION, 1, local)) * intensity
  );
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
