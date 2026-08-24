export function containedWaterRefractionSettle(progress: number): number {
  if (progress <= 0.88) return 1;
  return Math.max(0.55, 1 - (progress - 0.88) / 0.12);
}

export function containedWaterTerminalRippleFade(progress: number): number {
  if (progress <= 0.9) return 1;
  if (progress >= 1) return 0;

  // Express the fade from the remaining progress instead of subtracting two
  // nearly equal ratios. The explicit terminal guard above guarantees an exact
  // zero at the final review beat rather than a floating-point residue such as
  // 2.22e-16.
  return Math.max(0, Math.min(1, (1 - progress) / 0.1));
}

export function containedWaterReadableRippleSettle(progress: number): number {
  return (
    containedWaterRefractionSettle(progress) *
    containedWaterTerminalRippleFade(progress)
  );
}
