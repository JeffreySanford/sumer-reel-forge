import type { PixiSourceLayerFrameState } from '@sumer-reel-forge/animation-pixi';
import {
  buildShot03RecoveryCharacterMotionState,
  SHOT03_RECOVERY_CHARACTER_ACTIVE_PROFILE,
} from './shot03-recovery-character-motion';

export const SHOT03_RECOVERY_BREATH_ACTIVE_PROFILE =
  'recovered-character-breath' as const;
export const SHOT03_RECOVERY_BREATH_CONTROL_PROFILE =
  'recovered-character-breath-control' as const;

export type Shot03RecoveryBreathProfile =
  | typeof SHOT03_RECOVERY_BREATH_ACTIVE_PROFILE
  | typeof SHOT03_RECOVERY_BREATH_CONTROL_PROFILE;

const ENKI_BODY_ID = 'shot03-enki-body-v1';
const ENKI_EYES_ID = 'shot03-enki-eyes-v1';
const BREATH_CYCLE_FRAMES = 110;
const MAX_SCALE_X_DELTA = 0.002;
const MAX_SCALE_Y_DELTA = 0.005;

export interface Shot03RecoveryBreathMotionState {
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
  readonly character: {
    readonly x: number;
    readonly y: number;
    readonly rotationDegrees: number;
    readonly lagSeconds: number;
  };
  readonly breath: {
    readonly amount: number;
    readonly scaleX: number;
    readonly scaleY: number;
    readonly cycleFrames: number;
  };
  readonly sourceLayerStates: readonly PixiSourceLayerFrameState[];
}

export function buildShot03RecoveryBreathMotionState(
  frame: number,
  fps: number,
  durationFrames: number,
  profile: Shot03RecoveryBreathProfile,
): Shot03RecoveryBreathMotionState {
  const acceptedCharacter = buildShot03RecoveryCharacterMotionState(
    frame,
    fps,
    durationFrames,
    SHOT03_RECOVERY_CHARACTER_ACTIVE_PROFILE,
  );
  const control = profile === SHOT03_RECOVERY_BREATH_CONTROL_PROFILE;
  const amount = control
    ? 0
    : canonicalZero(
        breathAmount(frame, acceptedCharacter.progress),
      );
  const scaleX = 1 + MAX_SCALE_X_DELTA * amount;
  const scaleY = 1 + MAX_SCALE_Y_DELTA * amount;

  const sourceLayerStates =
    control || amount === 0
      ? acceptedCharacter.sourceLayerStates
      : Object.freeze(
          acceptedCharacter.sourceLayerStates.map((state) => {
            if (state.assetId !== ENKI_BODY_ID && state.assetId !== ENKI_EYES_ID) {
              return state;
            }
            return Object.freeze({
              ...state,
              scaleX: state.scale * scaleX,
              scaleY: state.scale * scaleY,
            });
          }),
        );

  return Object.freeze({
    ...acceptedCharacter,
    breath: Object.freeze({
      amount,
      scaleX,
      scaleY,
      cycleFrames: BREATH_CYCLE_FRAMES,
    }),
    sourceLayerStates,
  });
}

function breathAmount(frame: number, progress: number): number {
  const phase = (frame % BREATH_CYCLE_FRAMES) / BREATH_CYCLE_FRAMES;
  const inhaleExhale = (1 - Math.cos(phase * Math.PI * 2)) * 0.5;
  const endSettle = 1 - smoothstep(0.88, 1, progress);
  return inhaleExhale * endSettle;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function canonicalZero(value: number): number {
  return Object.is(value, -0) || Math.abs(value) < 1e-12 ? 0 : value;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
