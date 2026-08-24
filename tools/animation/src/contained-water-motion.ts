export function containedWaterRefractionSettle(progress: number): number {
  if (progress <= 0.88) return 1;
  return Math.max(0.55, 1 - (progress - 0.88) / 0.12);
}

export function containedWaterTerminalRippleFade(progress: number): number {
  if (progress <= 0.9) return 1;
  return Math.max(0, 1 - (progress - 0.9) / 0.1);
}

export function containedWaterReadableRippleSettle(progress: number): number {
  return (
    containedWaterRefractionSettle(progress) *
    containedWaterTerminalRippleFade(progress)
  );
}
