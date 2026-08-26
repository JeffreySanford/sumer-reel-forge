import type { PixiSourceLayerFrameState } from '@sumer-reel-forge/animation-pixi';
import {
  buildShot03FullMotionState,
  type Shot03FullMotionState,
} from './shot03-full-motion';

export const SHOT03_SECONDARY_ISOLATION_PROFILE = 'secondary-isolation' as const;
export const SHOT03_SECONDARY_ISOLATION_VESSEL_HEAVE_GAIN = 4;
export const SHOT03_SECONDARY_ISOLATION_VESSEL_ROLL_GAIN = 6;
export const SHOT03_SECONDARY_ISOLATION_RIGGING_X_GAIN = 5;
export const SHOT03_SECONDARY_ISOLATION_RIGGING_Y_GAIN = 4;
export const SHOT03_SECONDARY_ISOLATION_RIGGING_ROTATION_GAIN = 6;

export function buildShot03SecondaryMotionIsolationState(
  frame: number,
  fps: number,
  durationFrames: number,
): Shot03FullMotionState {
  const base = buildShot03FullMotionState(frame, fps, durationFrames);
  const vesselHeave =
    base.vessel.heaveY * SHOT03_SECONDARY_ISOLATION_VESSEL_HEAVE_GAIN;
  const vesselRoll =
    base.vessel.rollDegrees * SHOT03_SECONDARY_ISOLATION_VESSEL_ROLL_GAIN;
  const riggingX =
    base.rigging.x * SHOT03_SECONDARY_ISOLATION_RIGGING_X_GAIN;
  const riggingY =
    base.rigging.y * SHOT03_SECONDARY_ISOLATION_RIGGING_Y_GAIN;
  const riggingRotation =
    base.rigging.rotationDegrees *
    SHOT03_SECONDARY_ISOLATION_RIGGING_ROTATION_GAIN;

  const sourceLayerStates = Object.freeze([
    sourceState('shot03-background-v1', 0, 0, 1, 0, 1),
    sourceState('shot03-water-v1', 0, 0, 1, 0, 1),
    sourceState('shot03-vessel-v1', 0, vesselHeave, 1, vesselRoll, 1),
    sourceState('shot03-enki-body-v1', 0, vesselHeave, 1, vesselRoll, 1),
    sourceState(
      'shot03-enki-eyes-v1',
      0,
      vesselHeave,
      1,
      vesselRoll,
      base.blinkOpacity,
    ),
    sourceState('shot03-rigging-v1', riggingX, riggingY, 1, riggingRotation, 1),
  ]);

  return Object.freeze({
    ...base,
    camera: Object.freeze({ x: 0, y: 0, scale: 1 }),
    vessel: Object.freeze({
      heaveY: vesselHeave,
      rollDegrees: vesselRoll,
    }),
    rigging: Object.freeze({
      x: riggingX,
      y: riggingY,
      rotationDegrees: riggingRotation,
      lagSeconds: base.rigging.lagSeconds,
    }),
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
