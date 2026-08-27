import {
  buildShot03RecoveryMotionState,
  SHOT03_RECOVERY_ACTIVE_PROFILE,
  SHOT03_RECOVERY_CAMERA_ONLY_PROFILE,
} from './shot03-recovery-motion';

function stateFor(
  frame: ReturnType<typeof buildShot03RecoveryMotionState>,
  assetId: string,
) {
  const state = frame.sourceLayerStates.find((candidate) => candidate.assetId === assetId);
  if (!state) throw new Error(`Missing ${assetId}.`);
  return state;
}

describe('Shot 3 recovered primary motion', () => {
  it('shows only repaired background, vessel, and Enki in the active profile', () => {
    const frame = buildShot03RecoveryMotionState(
      101,
      30,
      210,
      SHOT03_RECOVERY_ACTIVE_PROFILE,
    );

    expect(stateFor(frame, 'shot03-background-v1').opacity).toBe(1);
    expect(stateFor(frame, 'shot03-vessel-v1').opacity).toBe(1);
    expect(stateFor(frame, 'shot03-enki-body-v1').opacity).toBe(1);
    expect(stateFor(frame, 'shot03-water-v1').opacity).toBe(0);
    expect(stateFor(frame, 'shot03-enki-eyes-v1').opacity).toBe(0);
    expect(stateFor(frame, 'shot03-rigging-v1').opacity).toBe(0);
    expect(frame.blinkOpacity).toBe(0);
    expect(frame.rigging.x).toBe(0);
    expect(frame.rigging.y).toBe(0);
    expect(frame.rigging.rotationDegrees).toBe(0);
  });

  it('keeps Enki rigidly vessel-carried while allowing local vessel motion', () => {
    const frame = buildShot03RecoveryMotionState(
      101,
      30,
      210,
      SHOT03_RECOVERY_ACTIVE_PROFILE,
    );
    const vessel = stateFor(frame, 'shot03-vessel-v1');
    const enki = stateFor(frame, 'shot03-enki-body-v1');

    expect(enki.offsetX).toBe(vessel.offsetX);
    expect(enki.offsetY).toBe(vessel.offsetY);
    expect(enki.scale).toBe(vessel.scale);
    expect(enki.rotationDegrees).toBe(vessel.rotationDegrees);
    expect(Math.abs(frame.vessel.heaveY) + Math.abs(frame.vessel.rollDegrees)).toBeGreaterThan(0);
  });

  it('uses the same camera path but removes local vessel motion in camera-only control', () => {
    const active = buildShot03RecoveryMotionState(
      101,
      30,
      210,
      SHOT03_RECOVERY_ACTIVE_PROFILE,
    );
    const control = buildShot03RecoveryMotionState(
      101,
      30,
      210,
      SHOT03_RECOVERY_CAMERA_ONLY_PROFILE,
    );
    const background = stateFor(control, 'shot03-background-v1');
    const vessel = stateFor(control, 'shot03-vessel-v1');
    const enki = stateFor(control, 'shot03-enki-body-v1');

    expect(control.camera).toEqual(active.camera);
    expect(control.vessel).toEqual({ heaveY: 0, rollDegrees: 0 });
    expect(vessel.offsetX).toBe(background.offsetX);
    expect(vessel.offsetY).toBe(background.offsetY);
    expect(vessel.scale).toBe(background.scale);
    expect(vessel.rotationDegrees).toBe(0);
    expect(enki.offsetX).toBe(vessel.offsetX);
    expect(enki.offsetY).toBe(vessel.offsetY);
    expect(enki.scale).toBe(vessel.scale);
    expect(enki.rotationDegrees).toBe(vessel.rotationDegrees);
  });
});
