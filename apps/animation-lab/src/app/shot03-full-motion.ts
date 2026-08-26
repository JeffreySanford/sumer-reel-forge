import type { PixiSourceLayerFrameState } from '@sumer-reel-forge/animation-pixi';

const CAMERA_SCALE_FROM = 1;
const CAMERA_SCALE_TO = 1.024;
const CAMERA_X_FROM = 0;
const CAMERA_X_TO = -5;
const CAMERA_Y_FROM = 0;
const CAMERA_Y_TO = -7;
const CAMERA_SETTLE_FROM_PROGRESS = 0.82;

const HEAVY_PHYSICAL_FREQUENCY_HZ = 0.54;
const HEAVE_AMPLITUDE_PX = 4.5;
const ROLL_AMPLITUDE_DEGREES = 0.1;
const ROLL_PHASE_CYCLES = 0.18;
const RIGGING_LAG_SECONDS = 0.24;
const RIGGING_X_HEAVE_GAIN = 0.85;
const RIGGING_X_ROLL_GAIN = 9;
const RIGGING_MAX_X_PX = 3.6;

const BLINK_START_PROGRESS = 0.46;
const BLINK_END_PROGRESS = 0.51;
const BLINK_CLOSE_FRACTION = 0.2;
const BLINK_HOLD_END_FRACTION = 0.72;

export interface Shot03FullMotionState {
  readonly frame: number;
  readonly progress: number;
  readonly camera: {
    readonly x: number;
    readonly y: number;
    readonly scale: number;
  };
  readonly vessel: {
    readonly heaveY: number;
    readonly rollDegrees: number;
  };
  readonly rigging: {
    readonly x: number;
    readonly y: number;
    readonly rotationDegrees: number;
    readonly lagSeconds: number;
  };
  readonly blinkOpacity: number;
  readonly sourceLayerStates: readonly PixiSourceLayerFrameState[];
}

export function buildShot03FullMotionState(
  frame: number,
  fps: number,
  durationFrames: number,
): Shot03FullMotionState {
  if (!Number.isInteger(frame) || frame < 0 || frame >= durationFrames) {
    throw new Error('Shot 3 full-motion frame must be an in-range non-negative integer.');
  }
  if (!Number.isFinite(fps) || fps <= 0) {
    throw new Error('Shot 3 full-motion fps must be positive.');
  }
  if (!Number.isInteger(durationFrames) || durationFrames <= 1) {
    throw new Error('Shot 3 full-motion durationFrames must be an integer greater than 1.');
  }

  const progress = frame / (durationFrames - 1);
  const phaseSeconds = frame / fps;
  const cameraProgress = cinematicSlow(progress, CAMERA_SETTLE_FROM_PROGRESS);
  const camera = Object.freeze({
    x: interpolate(CAMERA_X_FROM, CAMERA_X_TO, cameraProgress),
    y: interpolate(CAMERA_Y_FROM, CAMERA_Y_TO, cameraProgress),
    scale: interpolate(CAMERA_SCALE_FROM, CAMERA_SCALE_TO, cameraProgress),
  });

  const vesselDriver = heavyPhysicalDriver(phaseSeconds, progress);
  const rigging = riggingTensionResponse(
    phaseSeconds,
    progress,
    durationFrames / fps,
  );
  const blinkOpacity = blinkOnceOpacity(progress);
  const vesselCarriedY = camera.y + vesselDriver.heaveY;
  const vesselCarriedRotation = vesselDriver.rollDegrees;

  const sourceLayerStates = Object.freeze([
    sourceState('shot03-background-v1', camera.x, camera.y, camera.scale, 0, 1),
    sourceState('shot03-water-v1', camera.x, camera.y, camera.scale, 0, 1),
    sourceState(
      'shot03-vessel-v1',
      camera.x,
      vesselCarriedY,
      camera.scale,
      vesselCarriedRotation,
      1,
    ),
    sourceState(
      'shot03-enki-body-v1',
      camera.x,
      vesselCarriedY,
      camera.scale,
      vesselCarriedRotation,
      1,
    ),
    sourceState(
      'shot03-enki-eyes-v1',
      camera.x,
      vesselCarriedY,
      camera.scale,
      vesselCarriedRotation,
      blinkOpacity,
    ),
    sourceState(
      'shot03-rigging-v1',
      camera.x + rigging.x,
      camera.y + rigging.y,
      camera.scale,
      rigging.rotationDegrees,
      1,
    ),
  ]);

  return Object.freeze({
    frame,
    progress,
    camera,
    vessel: Object.freeze({
      heaveY: vesselDriver.heaveY,
      rollDegrees: vesselDriver.rollDegrees,
    }),
    rigging: Object.freeze({
      x: rigging.x,
      y: rigging.y,
      rotationDegrees: rigging.rotationDegrees,
      lagSeconds: RIGGING_LAG_SECONDS,
    }),
    blinkOpacity,
    sourceLayerStates,
  });
}

function sourceState(
  assetId: string,
  offsetX: number,
  offsetY: number,
  scale: number,
  rotationDegrees: number,
  opacity: number,
): PixiSourceLayerFrameState {
  return Object.freeze({
    assetId,
    offsetX,
    offsetY,
    scale,
    rotationDegrees,
    opacity,
    timeSource: 'exact-frame' as const,
  });
}

function cinematicSlow(progress: number, settleFromProgress: number): number {
  const t = clamp(progress, 0, 1);
  const settle = clamp(settleFromProgress, 0.5, 0.98);
  if (t <= settle) {
    const normalized = t / settle;
    return normalized * normalized * (3 - 2 * normalized) * 0.94;
  }
  const tail = (t - settle) / (1 - settle);
  const easedTail = 1 - Math.pow(1 - tail, 3);
  return 0.94 + easedTail * 0.06;
}

function heavyPhysicalDriver(phaseSeconds: number, progress: number) {
  const settleWeight = settleWeightForProgress(progress);
  return {
    heaveY:
      Math.sin(phaseSeconds * HEAVY_PHYSICAL_FREQUENCY_HZ * Math.PI * 2) *
      HEAVE_AMPLITUDE_PX *
      settleWeight,
    rollDegrees:
      Math.sin(
        (phaseSeconds * HEAVY_PHYSICAL_FREQUENCY_HZ + ROLL_PHASE_CYCLES) * Math.PI * 2,
      ) *
      ROLL_AMPLITUDE_DEGREES *
      settleWeight,
  };
}

function riggingTensionResponse(
  phaseSeconds: number,
  progress: number,
  durationSeconds: number,
) {
  const currentDriver = heavyPhysicalDriver(phaseSeconds, progress);
  const delayedPhaseSeconds = Math.max(0, phaseSeconds - RIGGING_LAG_SECONDS);
  const delayedProgress = clamp(
    progress - RIGGING_LAG_SECONDS / durationSeconds,
    0,
    1,
  );
  const delayedDriver = heavyPhysicalDriver(delayedPhaseSeconds, delayedProgress);
  const lagHeave = delayedDriver.heaveY - currentDriver.heaveY;
  const lagRoll = delayedDriver.rollDegrees - currentDriver.rollDegrees;

  return {
    x: clamp(
      lagHeave * RIGGING_X_HEAVE_GAIN + lagRoll * RIGGING_X_ROLL_GAIN,
      -RIGGING_MAX_X_PX,
      RIGGING_MAX_X_PX,
    ),
    y: currentDriver.heaveY * 0.92 + lagHeave * 0.18,
    rotationDegrees: currentDriver.rollDegrees * 0.72 + lagRoll * 2.15,
  };
}

function blinkOnceOpacity(progress: number): number {
  if (progress <= BLINK_START_PROGRESS || progress >= BLINK_END_PROGRESS) return 0;
  const local = clamp(
    (progress - BLINK_START_PROGRESS) / (BLINK_END_PROGRESS - BLINK_START_PROGRESS),
    0,
    1,
  );
  if (local < BLINK_CLOSE_FRACTION) {
    return smoothstep(0, BLINK_CLOSE_FRACTION, local);
  }
  if (local <= BLINK_HOLD_END_FRACTION) return 1;
  return 1 - smoothstep(BLINK_HOLD_END_FRACTION, 1, local);
}

function settleWeightForProgress(progress: number): number {
  if (progress <= 0.8) return 1;
  return clamp(1 - (progress - 0.8) / 0.2, 0, 1);
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function interpolate(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
