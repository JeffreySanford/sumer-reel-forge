export const PIXI_CONTAINED_WATER_MATERIAL_KIND = 'contained-water-micro-drift' as const;

export interface PixiContainedWaterMaterialBinding {
  readonly id: string;
  readonly assetId: string;
  readonly kind: typeof PIXI_CONTAINED_WATER_MATERIAL_KIND;
  readonly amplitudeX: number;
  readonly amplitudeY: number;
  readonly periodSecondsX: number;
  readonly periodSecondsY: number;
  readonly phaseX: number;
  readonly phaseY: number;
  readonly overscanScale: number;
  readonly movingOpacity: number;
  readonly settleStartProgress: number;
  readonly settleFloor: number;
  readonly readableRippleOpacity: number;
  readonly readableRippleRateHz: number;
}

export interface PixiMaterialTiming {
  readonly frame: number;
  readonly fps: number;
  readonly durationFrames: number;
}

export interface PixiContainedWaterRippleState {
  readonly index: number;
  readonly cycle: number;
  readonly opacity: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly travelX: number;
  readonly travelY: number;
}

export interface PixiContainedWaterMaterialState {
  readonly id: string;
  readonly assetId: string;
  readonly kind: typeof PIXI_CONTAINED_WATER_MATERIAL_KIND;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly scale: number;
  readonly movingOpacity: number;
  readonly settle: number;
  readonly readableRippleStrength: number;
  readonly ripples: readonly PixiContainedWaterRippleState[];
  readonly maxOffsetX: number;
  readonly maxOffsetY: number;
  readonly maxScale: number;
  readonly containment: 'source-alpha';
  readonly timeSource: 'exact-frame';
}

export type PixiMaterialFrameState = PixiContainedWaterMaterialState;

const READABLE_RIPPLE_OFFSETS = Object.freeze([0, 0.36, 0.72] as const);

function finiteNonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite non-negative number.`);
  }
  return value;
}

function finitePositive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a finite positive number.`);
  }
  return value;
}

function unitInterval(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be between 0 and 1.`);
  }
  return value;
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function triangleWave(
  frame: number,
  fps: number,
  periodSeconds: number,
  phase: number,
): number {
  const periodFrames = Math.max(1, Math.round(finitePositive(periodSeconds, 'Pixi water period') * fps));
  const phaseFrames = Math.round(unitInterval(phase, 'Pixi water phase') * periodFrames);
  const cycle = positiveModulo(frame + phaseFrames, periodFrames) / periodFrames;
  return 1 - 4 * Math.abs(cycle - 0.5);
}

function terminalSettle(
  frame: number,
  durationFrames: number,
  settleStartProgress: number,
  settleFloor: number,
): number {
  const start = unitInterval(settleStartProgress, 'Pixi water settleStartProgress');
  const floor = unitInterval(settleFloor, 'Pixi water settleFloor');
  if (start >= 1) return 1;

  const progress = durationFrames <= 1 ? 1 : Math.min(1, Math.max(0, frame / (durationFrames - 1)));
  if (progress <= start) return 1;
  return Math.max(floor, (1 - progress) / (1 - start));
}

function terminalReadableRippleFade(frame: number, durationFrames: number): number {
  const progress = durationFrames <= 1 ? 1 : Math.min(1, Math.max(0, frame / (durationFrames - 1)));
  if (progress <= 0.9) return 1;
  if (progress >= 1) return 0;
  return Math.max(0, Math.min(1, (1 - progress) / 0.1));
}

function readableRippleIntro(frame: number, fps: number): number {
  const introFrames = Math.max(1, Math.round(fps * 0.5));
  return Math.min(1, frame / introFrames);
}

function buildReadableRipples(
  frame: number,
  fps: number,
  rateHz: number,
  baseOpacity: number,
  strength: number,
): readonly PixiContainedWaterRippleState[] {
  const phaseSeconds = frame / fps;
  return Object.freeze(
    READABLE_RIPPLE_OFFSETS.map((offset, index) => {
      const cycle = positiveModulo(phaseSeconds * rateHz + offset, 1);
      const envelope = (1 - Math.abs(cycle * 2 - 1)) * strength;
      const opacity = envelope * baseOpacity * (index === 0 ? 1 : 0.8);
      const scaleX = 0.42 + cycle * 2.75;
      const scaleY = 0.34 + cycle * 1.38;
      const travelX =
        triangleWave(frame, fps, 6.8, positiveModulo(0.18 + index * 0.31, 1)) * 5;
      const travelY = cycle * 4 - 1;

      return Object.freeze({
        index,
        cycle,
        opacity,
        scaleX,
        scaleY,
        travelX,
        travelY,
      });
    }),
  );
}

export function buildPixiContainedWaterMaterialState(
  binding: PixiContainedWaterMaterialBinding,
  timing: PixiMaterialTiming,
): PixiContainedWaterMaterialState {
  if (!binding.id.trim()) throw new Error('Pixi water material id must not be empty.');
  if (!binding.assetId.trim()) throw new Error('Pixi water material assetId must not be empty.');
  if (binding.kind !== PIXI_CONTAINED_WATER_MATERIAL_KIND) {
    throw new Error(`Unsupported Pixi water material kind ${String(binding.kind)}.`);
  }
  if (!Number.isInteger(timing.frame) || timing.frame < 0) {
    throw new Error('Pixi water material frame must be a non-negative integer.');
  }
  if (!Number.isFinite(timing.fps) || timing.fps <= 0) {
    throw new Error('Pixi water material fps must be a positive number.');
  }
  if (!Number.isInteger(timing.durationFrames) || timing.durationFrames <= 0) {
    throw new Error('Pixi water material durationFrames must be a positive integer.');
  }
  if (timing.frame >= timing.durationFrames) {
    throw new Error(
      `Pixi water material frame ${timing.frame} exceeds duration ${timing.durationFrames}.`,
    );
  }

  const amplitudeX = finiteNonNegative(binding.amplitudeX, 'Pixi water amplitudeX');
  const amplitudeY = finiteNonNegative(binding.amplitudeY, 'Pixi water amplitudeY');
  const movingOpacity = unitInterval(binding.movingOpacity, 'Pixi water movingOpacity');
  const readableRippleOpacity = unitInterval(
    binding.readableRippleOpacity,
    'Pixi water readableRippleOpacity',
  );
  const readableRippleRateHz = finitePositive(
    binding.readableRippleRateHz,
    'Pixi water readableRippleRateHz',
  );
  const overscanScale = finitePositive(binding.overscanScale, 'Pixi water overscanScale');
  if (overscanScale < 1) {
    throw new Error('Pixi water overscanScale must be at least 1.');
  }

  const settle = terminalSettle(
    timing.frame,
    timing.durationFrames,
    binding.settleStartProgress,
    binding.settleFloor,
  );
  const waveX = triangleWave(
    timing.frame,
    timing.fps,
    binding.periodSecondsX,
    binding.phaseX,
  );
  const waveY = triangleWave(
    timing.frame,
    timing.fps,
    binding.periodSecondsY,
    binding.phaseY,
  );
  const readableRippleStrength =
    settle *
    terminalReadableRippleFade(timing.frame, timing.durationFrames) *
    readableRippleIntro(timing.frame, timing.fps);
  const ripples = buildReadableRipples(
    timing.frame,
    timing.fps,
    readableRippleRateHz,
    readableRippleOpacity,
    readableRippleStrength,
  );

  return Object.freeze({
    id: binding.id,
    assetId: binding.assetId,
    kind: PIXI_CONTAINED_WATER_MATERIAL_KIND,
    offsetX: amplitudeX * waveX * settle,
    offsetY: amplitudeY * waveY * settle,
    scale: 1 + (overscanScale - 1) * settle,
    movingOpacity: movingOpacity * settle,
    settle,
    readableRippleStrength,
    ripples,
    maxOffsetX: amplitudeX,
    maxOffsetY: amplitudeY,
    maxScale: overscanScale,
    containment: 'source-alpha',
    timeSource: 'exact-frame',
  });
}
