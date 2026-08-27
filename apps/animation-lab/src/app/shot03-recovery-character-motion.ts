import type { PixiSourceLayerFrameState } from '@sumer-reel-forge/animation-pixi';
import {
  buildShot03RecoveryMotionState,
  SHOT03_RECOVERY_ACTIVE_PROFILE,
} from './shot03-recovery-motion';

export const SHOT03_RECOVERY_CHARACTER_ACTIVE_PROFILE =
  'recovered-character-settle' as const;
export const SHOT03_RECOVERY_CHARACTER_CONTROL_PROFILE =
  'recovered-character-control' as const;

export type Shot03RecoveryCharacterProfile =
  | typeof SHOT03_RECOVERY_CHARACTER_ACTIVE_PROFILE
  | typeof SHOT03_RECOVERY_CHARACTER_CONTROL_PROFILE;

const ENKI_BODY_ID = 'shot03-enki-body-v1';
const ENKI_EYES_ID = 'shot03-enki-eyes-v1';
const VESSEL_ID = 'shot03-vessel-v1';
const CHARACTER_LAG_SECONDS = 0.18;
const MAX_X_PX = 2.6;
const MAX_Y_PX = 2.2;
const MAX_ROTATION_DEGREES = 0.2;

export interface Shot03RecoveryCharacterMotionState {
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
  readonly sourceLayerStates: readonly PixiSourceLayerFrameState[];
}

export function buildShot03RecoveryCharacterMotionState(
  frame: number,
  fps: number,
  durationFrames: number,
  profile: Shot03RecoveryCharacterProfile,
): Shot03RecoveryCharacterMotionState {
  const primary = buildShot03RecoveryMotionState(
    frame,
    fps,
    durationFrames,
    SHOT03_RECOVERY_ACTIVE_PROFILE,
  );
  const control = profile === SHOT03_RECOVERY_CHARACTER_CONTROL_PROFILE;
  const lagFrames = Math.max(1, Math.round(CHARACTER_LAG_SECONDS * fps));
  const delayed = buildShot03RecoveryMotionState(
    Math.max(0, frame - lagFrames),
    fps,
    durationFrames,
    SHOT03_RECOVERY_ACTIVE_PROFILE,
  );

  const activity = control ? 0 : characterActivityEnvelope(primary.progress);
  const lagHeave = delayed.vessel.heaveY - primary.vessel.heaveY;
  const lagRoll = delayed.vessel.rollDegrees - primary.vessel.rollDegrees;
  const character = Object.freeze({
    x: canonicalZero(
      clamp((lagHeave * 0.34 + lagRoll * 10.5) * activity, -MAX_X_PX, MAX_X_PX),
    ),
    y: canonicalZero(
      clamp(
        (-primary.vessel.heaveY * 0.34 + lagHeave * 0.24) * activity,
        -MAX_Y_PX,
        MAX_Y_PX,
      ),
    ),
    rotationDegrees: canonicalZero(
      clamp(
        (-primary.vessel.rollDegrees * 0.82 + lagRoll * 0.92) * activity,
        -MAX_ROTATION_DEGREES,
        MAX_ROTATION_DEGREES,
      ),
    ),
    lagSeconds: CHARACTER_LAG_SECONDS,
  });

  const vessel = requiredState(primary.sourceLayerStates, VESSEL_ID);
  const enkiTransform = {
    offsetX: vessel.offsetX + character.x,
    offsetY: vessel.offsetY + character.y,
    scale: vessel.scale,
    rotationDegrees: vessel.rotationDegrees + character.rotationDegrees,
  };

  const sourceLayerStates = Object.freeze(
    primary.sourceLayerStates.map((state) => {
      if (state.assetId === ENKI_BODY_ID) {
        return Object.freeze({ ...state, ...enkiTransform, opacity: 1 });
      }
      if (state.assetId === ENKI_EYES_ID) {
        return Object.freeze({ ...state, ...enkiTransform, opacity: 0 });
      }
      return state;
    }),
  );

  return Object.freeze({
    ...primary,
    character,
    blinkOpacity: 0,
    sourceLayerStates,
  });
}

function requiredState(
  states: readonly PixiSourceLayerFrameState[],
  assetId: string,
): PixiSourceLayerFrameState {
  const state = states.find((candidate) => candidate.assetId === assetId);
  if (!state) throw new Error(`Missing Shot 3 recovery character state ${assetId}.`);
  return state;
}

function characterActivityEnvelope(progress: number): number {
  const enter = smoothstep(0, 0.08, progress);
  const exit = 1 - smoothstep(0.82, 1, progress);
  return enter * exit;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function canonicalZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
