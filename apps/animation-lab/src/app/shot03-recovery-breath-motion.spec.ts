import {
  buildShot03RecoveryBreathMotionState,
  SHOT03_RECOVERY_BREATH_ACTIVE_PROFILE,
  SHOT03_RECOVERY_BREATH_CONTROL_PROFILE,
} from './shot03-recovery-breath-motion';
import {
  buildShot03RecoveryCharacterMotionState,
  SHOT03_RECOVERY_CHARACTER_ACTIVE_PROFILE,
} from './shot03-recovery-character-motion';

const FPS = 30;
const DURATION_FRAMES = 210;

function layer(
  state: ReturnType<typeof buildShot03RecoveryBreathMotionState>,
  id: string,
) {
  const found = state.sourceLayerStates.find((item) => item.assetId === id);
  if (!found) throw new Error(`Missing ${id}.`);
  return found;
}

describe('Shot 3 recovered Enki breathe-calm performance', () => {
  it('keeps frame zero exactly compatible with the accepted character-motion state', () => {
    const accepted = buildShot03RecoveryCharacterMotionState(
      0,
      FPS,
      DURATION_FRAMES,
      SHOT03_RECOVERY_CHARACTER_ACTIVE_PROFILE,
    );
    const active = buildShot03RecoveryBreathMotionState(
      0,
      FPS,
      DURATION_FRAMES,
      SHOT03_RECOVERY_BREATH_ACTIVE_PROFILE,
    );

    expect(active.breath.amount).toBe(0);
    expect(active.breath.scaleX).toBe(1);
    expect(active.breath.scaleY).toBe(1);
    expect(active.sourceLayerStates).toEqual(accepted.sourceLayerStates);
  });

  it('peaks at the benchmark BREATH_VISIBLE frame 55 with bounded anisotropic deformation', () => {
    const state = buildShot03RecoveryBreathMotionState(
      55,
      FPS,
      DURATION_FRAMES,
      SHOT03_RECOVERY_BREATH_ACTIVE_PROFILE,
    );
    const body = layer(state, 'shot03-enki-body-v1');
    const eyes = layer(state, 'shot03-enki-eyes-v1');

    expect(state.breath.amount).toBeCloseTo(1, 10);
    expect(state.breath.scaleX).toBeCloseTo(1.002, 10);
    expect(state.breath.scaleY).toBeCloseTo(1.005, 10);
    expect(body.scaleX).toBeCloseTo(body.scale * 1.002, 10);
    expect(body.scaleY).toBeCloseTo(body.scale * 1.005, 10);
    expect(eyes.scaleX).toBe(body.scaleX);
    expect(eyes.scaleY).toBe(body.scaleY);
    expect(eyes.opacity).toBe(0);
  });

  it('returns to the accepted character state at frame 110 and repeats a second calm inhale near 165', () => {
    const accepted110 = buildShot03RecoveryCharacterMotionState(
      110,
      FPS,
      DURATION_FRAMES,
      SHOT03_RECOVERY_CHARACTER_ACTIVE_PROFILE,
    );
    const neutral = buildShot03RecoveryBreathMotionState(
      110,
      FPS,
      DURATION_FRAMES,
      SHOT03_RECOVERY_BREATH_ACTIVE_PROFILE,
    );
    const secondPeak = buildShot03RecoveryBreathMotionState(
      165,
      FPS,
      DURATION_FRAMES,
      SHOT03_RECOVERY_BREATH_ACTIVE_PROFILE,
    );

    expect(neutral.breath.amount).toBe(0);
    expect(neutral.sourceLayerStates).toEqual(accepted110.sourceLayerStates);
    expect(secondPeak.breath.amount).toBeGreaterThan(0.99);
  });

  it('makes the control profile exactly match accepted counter-sway motion', () => {
    for (const frame of [0, 55, 110, 165, 209]) {
      const accepted = buildShot03RecoveryCharacterMotionState(
        frame,
        FPS,
        DURATION_FRAMES,
        SHOT03_RECOVERY_CHARACTER_ACTIVE_PROFILE,
      );
      const control = buildShot03RecoveryBreathMotionState(
        frame,
        FPS,
        DURATION_FRAMES,
        SHOT03_RECOVERY_BREATH_CONTROL_PROFILE,
      );

      expect(control.camera).toEqual(accepted.camera);
      expect(control.vessel).toEqual(accepted.vessel);
      expect(control.character).toEqual(accepted.character);
      expect(control.sourceLayerStates).toEqual(accepted.sourceLayerStates);
      expect(control.breath).toMatchObject({ amount: 0, scaleX: 1, scaleY: 1 });
    }
  });

  it('never exceeds the bounded breathe-calm deformation and settles by the final frame', () => {
    const states = Array.from({ length: DURATION_FRAMES }, (_, frame) =>
      buildShot03RecoveryBreathMotionState(
        frame,
        FPS,
        DURATION_FRAMES,
        SHOT03_RECOVERY_BREATH_ACTIVE_PROFILE,
      ),
    );

    for (const state of states) {
      expect(state.breath.amount).toBeGreaterThanOrEqual(0);
      expect(state.breath.amount).toBeLessThanOrEqual(1 + 1e-9);
      expect(state.breath.scaleX).toBeLessThanOrEqual(1.002 + 1e-9);
      expect(state.breath.scaleY).toBeLessThanOrEqual(1.005 + 1e-9);
    }
    expect(states.at(-1)?.breath.amount).toBe(0);
  });
});
