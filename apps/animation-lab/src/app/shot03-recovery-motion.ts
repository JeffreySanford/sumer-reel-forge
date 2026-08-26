import type { PixiSourceLayerFrameState } from '@sumer-reel-forge/animation-pixi';
import {
  buildShot03FullMotionState,
  type Shot03FullMotionState,
} from './shot03-full-motion';

export const SHOT03_RECOVERY_ACTIVE_PROFILE = 'recovered-primary' as const;
export const SHOT03_RECOVERY_CAMERA_ONLY_PROFILE = 'recovered-camera-only' as const;

export type Shot03RecoveryMotionProfile =
  | typeof SHOT03_RECOVERY_ACTIVE_PROFILE
  | typeof SHOT03_RECOVERY_CAMERA_ONLY_PROFILE;

const BACKGROUND_ID = 'shot03-background-v1';
const WATER_ID = 'shot03-water-v1';
const VESSEL_ID = 'shot03-vessel-v1';
const ENKI_BODY_ID = 'shot03-enki-body-v1';
const ENKI_EYES_ID = 'shot03-enki-eyes-v1';
const RIGGING_ID = 'shot03-rigging-v1';

export function buildShot03RecoveryMotionState(
  frame: number,
  fps: number,
  durationFrames: number,
  profile: Shot03RecoveryMotionProfile,
): Shot03FullMotionState {
  const base = buildShot03FullMotionState(frame, fps, durationFrames);
  const cameraOnly = profile === SHOT03_RECOVERY_CAMERA_ONLY_PROFILE;

  const vesselTransform = cameraOnly
    ? {
        offsetX: base.camera.x,
        offsetY: base.camera.y,
        scale: base.camera.scale,
        rotationDegrees: 0,
      }
    : transformFor(base.sourceLayerStates, VESSEL_ID);

  const sourceLayerStates = Object.freeze(
    base.sourceLayerStates.map((state) => {
      if (state.assetId === BACKGROUND_ID) {
        return withState(state, {
          offsetX: base.camera.x,
          offsetY: base.camera.y,
          scale: base.camera.scale,
          rotationDegrees: 0,
          opacity: 1,
        });
      }
      if (state.assetId === WATER_ID) {
        return withState(state, {
          offsetX: base.camera.x,
          offsetY: base.camera.y,
          scale: base.camera.scale,
          rotationDegrees: 0,
          opacity: 0,
        });
      }
      if (state.assetId === VESSEL_ID || state.assetId === ENKI_BODY_ID) {
        return withState(state, { ...vesselTransform, opacity: 1 });
      }
      if (state.assetId === ENKI_EYES_ID) {
        return withState(state, { ...vesselTransform, opacity: 0 });
      }
      if (state.assetId === RIGGING_ID) {
        return withState(state, {
          offsetX: base.camera.x,
          offsetY: base.camera.y,
          scale: base.camera.scale,
          rotationDegrees: 0,
          opacity: 0,
        });
      }
      throw new Error(`Unexpected Shot 3 recovery layer ${state.assetId}.`);
    }),
  );

  return Object.freeze({
    ...base,
    vessel: Object.freeze(
      cameraOnly
        ? { heaveY: 0, rollDegrees: 0 }
        : {
            heaveY: base.vessel.heaveY,
            rollDegrees: base.vessel.rollDegrees,
          },
    ),
    rigging: Object.freeze({
      x: 0,
      y: 0,
      rotationDegrees: 0,
      lagSeconds: base.rigging.lagSeconds,
    }),
    blinkOpacity: 0,
    sourceLayerStates,
  });
}

function transformFor(
  states: readonly PixiSourceLayerFrameState[],
  assetId: string,
): Pick<
  PixiSourceLayerFrameState,
  'offsetX' | 'offsetY' | 'scale' | 'rotationDegrees'
> {
  const state = states.find((candidate) => candidate.assetId === assetId);
  if (!state) throw new Error(`Missing Shot 3 source-layer state ${assetId}.`);
  return {
    offsetX: state.offsetX,
    offsetY: state.offsetY,
    scale: state.scale,
    rotationDegrees: state.rotationDegrees,
  };
}

function withState(
  state: PixiSourceLayerFrameState,
  overrides: Partial<
    Pick<
      PixiSourceLayerFrameState,
      'offsetX' | 'offsetY' | 'scale' | 'rotationDegrees' | 'opacity'
    >
  >,
): PixiSourceLayerFrameState {
  return Object.freeze({ ...state, ...overrides });
}
