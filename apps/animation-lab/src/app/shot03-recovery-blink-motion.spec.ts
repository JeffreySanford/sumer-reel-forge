import {
  buildShot03RecoveryBlinkMotionState,
  SHOT03_RECOVERY_BLINK_ACTIVE_PROFILE,
  SHOT03_RECOVERY_BLINK_CONTROL_PROFILE,
} from './shot03-recovery-blink-motion';

function stateFor(
  frame: ReturnType<typeof buildShot03RecoveryBlinkMotionState>,
  assetId: string,
) {
  const state = frame.sourceLayerStates.find((candidate) => candidate.assetId === assetId);
  if (!state) throw new Error(`Missing ${assetId}.`);
  return state;
}

describe('Shot 3 recovered blink reintegration', () => {
  it('differs from control only through the eye overlay opacity and blink state', () => {
    const active = buildShot03RecoveryBlinkMotionState(
      101,
      30,
      210,
      SHOT03_RECOVERY_BLINK_ACTIVE_PROFILE,
    );
    const control = buildShot03RecoveryBlinkMotionState(
      101,
      30,
      210,
      SHOT03_RECOVERY_BLINK_CONTROL_PROFILE,
    );

    expect(active.blinkOpacity).toBe(1);
    expect(control.blinkOpacity).toBe(0);

    for (const activeState of active.sourceLayerStates) {
      const controlState = stateFor(control, activeState.assetId);
      if (activeState.assetId === 'shot03-enki-eyes-v1') {
        expect(activeState.opacity).toBe(1);
        expect(controlState.opacity).toBe(0);
        expect({ ...activeState, opacity: 0 }).toEqual(controlState);
      } else {
        expect(activeState).toEqual(controlState);
      }
    }
  });

  it('keeps the blink overlay rigidly planted to the recovered vessel and Enki body', () => {
    const active = buildShot03RecoveryBlinkMotionState(
      101,
      30,
      210,
      SHOT03_RECOVERY_BLINK_ACTIVE_PROFILE,
    );
    const vessel = stateFor(active, 'shot03-vessel-v1');
    const body = stateFor(active, 'shot03-enki-body-v1');
    const eyes = stateFor(active, 'shot03-enki-eyes-v1');

    for (const state of [body, eyes]) {
      expect(state.offsetX).toBe(vessel.offsetX);
      expect(state.offsetY).toBe(vessel.offsetY);
      expect(state.scale).toBe(vessel.scale);
      expect(state.rotationDegrees).toBe(vessel.rotationDegrees);
    }
  });

  it('activates only inside the existing bounded blink window', () => {
    const activeFrames = [];
    for (let frame = 0; frame < 210; frame += 1) {
      const state = buildShot03RecoveryBlinkMotionState(
        frame,
        30,
        210,
        SHOT03_RECOVERY_BLINK_ACTIVE_PROFILE,
      );
      if (state.blinkOpacity > 0) activeFrames.push(frame);
    }

    expect(activeFrames).toEqual([97, 98, 99, 100, 101, 102, 103, 104, 105, 106]);
  });
});
