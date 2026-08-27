import type { PixiSourceLayerFrameState } from '@sumer-reel-forge/animation-pixi';
import { buildShot03FullMotionState } from './shot03-full-motion';
import {
  buildShot03RecoveryMotionState,
  SHOT03_RECOVERY_ACTIVE_PROFILE,
} from './shot03-recovery-motion';

export const SHOT03_RECOVERY_BLINK_ACTIVE_PROFILE =
  'recovered-blink-active' as const;
export const SHOT03_RECOVERY_BLINK_CONTROL_PROFILE =
  'recovered-blink-control' as const;

export type Shot03RecoveryBlinkProfile =
  | typeof SHOT03_RECOVERY_BLINK_ACTIVE_PROFILE
  | typeof SHOT03_RECOVERY_BLINK_CONTROL_PROFILE;

const VESSEL_ID = 'shot03-vessel-v1';
const ENKI_BODY_ID = 'shot03-enki-body-v1';
const ENKI_EYES_ID = 'shot03-enki-eyes-v1';

export function buildShot03RecoveryBlinkMotionState(
  frame: number,
  fps: number,
  durationFrames: number,
  profile: Shot03RecoveryBlinkProfile,
) {
  const primary = buildShot03RecoveryMotionState(
    frame,
    fps,
    durationFrames,
    SHOT03_RECOVERY_ACTIVE_PROFILE,
  );
  const canonicalTiming = buildShot03FullMotionState(
    frame,
    fps,
    durationFrames,
  );
  const active = profile === SHOT03_RECOVERY_BLINK_ACTIVE_PROFILE;
  const blinkOpacity = active ? canonicalTiming.blinkOpacity : 0;
  const vessel = requiredState(primary.sourceLayerStates, VESSEL_ID);

  const sourceLayerStates = Object.freeze(
    primary.sourceLayerStates.map((state) => {
      if (state.assetId !== ENKI_EYES_ID) return state;
      return Object.freeze({
        ...state,
        offsetX: vessel.offsetX,
        offsetY: vessel.offsetY,
        scale: vessel.scale,
        rotationDegrees: vessel.rotationDegrees,
        opacity: blinkOpacity,
      });
    }),
  );

  const enkiBody = requiredState(sourceLayerStates, ENKI_BODY_ID);
  const enkiEyes = requiredState(sourceLayerStates, ENKI_EYES_ID);
  assertSameTransform(vessel, enkiBody, 'Recovered Enki body must remain vessel-carried.');
  assertSameTransform(vessel, enkiEyes, 'Recovered blink overlay must remain vessel-carried.');

  return Object.freeze({
    ...primary,
    blinkOpacity,
    sourceLayerStates,
  });
}

function requiredState(
  states: readonly PixiSourceLayerFrameState[],
  assetId: string,
): PixiSourceLayerFrameState {
  const state = states.find((candidate) => candidate.assetId === assetId);
  if (!state) throw new Error(`Missing Shot 3 recovery blink state ${assetId}.`);
  return state;
}

function assertSameTransform(
  expected: PixiSourceLayerFrameState,
  actual: PixiSourceLayerFrameState,
  message: string,
): void {
  const epsilon = 1e-9;
  if (
    Math.abs(expected.offsetX - actual.offsetX) > epsilon ||
    Math.abs(expected.offsetY - actual.offsetY) > epsilon ||
    Math.abs(expected.scale - actual.scale) > epsilon ||
    Math.abs(expected.rotationDegrees - actual.rotationDegrees) > epsilon
  ) {
    throw new Error(message);
  }
}
