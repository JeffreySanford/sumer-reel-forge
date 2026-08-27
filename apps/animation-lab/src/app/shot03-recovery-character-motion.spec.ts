import {
  buildShot03RecoveryCharacterMotionState,
  SHOT03_RECOVERY_CHARACTER_ACTIVE_PROFILE,
  SHOT03_RECOVERY_CHARACTER_CONTROL_PROFILE,
} from './shot03-recovery-character-motion';
import {
  buildShot03RecoveryMotionState,
  SHOT03_RECOVERY_ACTIVE_PROFILE,
} from './shot03-recovery-motion';

const FPS = 30;
const DURATION_FRAMES = 210;

function layer(state: ReturnType<typeof buildShot03RecoveryCharacterMotionState>, id: string) {
  const found = state.sourceLayerStates.find((item) => item.assetId === id);
  if (!found) throw new Error(`Missing ${id}.`);
  return found;
}

describe('Shot 3 recovered character counter-sway', () => {
  it('keeps frame zero source-safe with no independent character offset', () => {
    const state = buildShot03RecoveryCharacterMotionState(
      0,
      FPS,
      DURATION_FRAMES,
      SHOT03_RECOVERY_CHARACTER_ACTIVE_PROFILE,
    );

    expect(state.character.x).toBe(0);
    expect(state.character.y).toBe(0);
    expect(state.character.rotationDegrees).toBe(0);
    expect(layer(state, 'shot03-enki-eyes-v1').opacity).toBe(0);
  });

  it('preserves accepted camera and vessel motion while moving Enki locally', () => {
    const frame = 101;
    const primary = buildShot03RecoveryMotionState(
      frame,
      FPS,
      DURATION_FRAMES,
      SHOT03_RECOVERY_ACTIVE_PROFILE,
    );
    const active = buildShot03RecoveryCharacterMotionState(
      frame,
      FPS,
      DURATION_FRAMES,
      SHOT03_RECOVERY_CHARACTER_ACTIVE_PROFILE,
    );

    expect(active.camera).toEqual(primary.camera);
    expect(active.vessel).toEqual(primary.vessel);

    const primaryVessel = primary.sourceLayerStates.find(
      (item) => item.assetId === 'shot03-vessel-v1',
    );
    const activeVessel = layer(active, 'shot03-vessel-v1');
    const activeEnki = layer(active, 'shot03-enki-body-v1');
    const activeEyes = layer(active, 'shot03-enki-eyes-v1');
    expect(activeVessel).toEqual(primaryVessel);
    expect(activeEnki.offsetX).toBeCloseTo(activeVessel.offsetX + active.character.x, 10);
    expect(activeEnki.offsetY).toBeCloseTo(activeVessel.offsetY + active.character.y, 10);
    expect(activeEnki.rotationDegrees).toBeCloseTo(
      activeVessel.rotationDegrees + active.character.rotationDegrees,
      10,
    );
    expect(activeEyes.offsetX).toBe(activeEnki.offsetX);
    expect(activeEyes.offsetY).toBe(activeEnki.offsetY);
    expect(activeEyes.rotationDegrees).toBe(activeEnki.rotationDegrees);
    expect(activeEyes.opacity).toBe(0);
    expect(
      Math.abs(active.character.x) +
        Math.abs(active.character.y) +
        Math.abs(active.character.rotationDegrees),
    ).toBeGreaterThan(0.05);
  });

  it('makes the control profile pixel-state compatible with accepted recovered primary motion', () => {
    for (const frame of [0, 52, 101, 157, 209]) {
      const primary = buildShot03RecoveryMotionState(
        frame,
        FPS,
        DURATION_FRAMES,
        SHOT03_RECOVERY_ACTIVE_PROFILE,
      );
      const control = buildShot03RecoveryCharacterMotionState(
        frame,
        FPS,
        DURATION_FRAMES,
        SHOT03_RECOVERY_CHARACTER_CONTROL_PROFILE,
      );
      expect(control.camera).toEqual(primary.camera);
      expect(control.vessel).toEqual(primary.vessel);
      expect(control.sourceLayerStates).toEqual(primary.sourceLayerStates);
      expect(control.character).toMatchObject({ x: 0, y: 0, rotationDegrees: 0 });
    }
  });

  it('stays bounded and resolves many deterministic non-camera character states', () => {
    const states = Array.from({ length: DURATION_FRAMES }, (_, frame) =>
      buildShot03RecoveryCharacterMotionState(
        frame,
        FPS,
        DURATION_FRAMES,
        SHOT03_RECOVERY_CHARACTER_ACTIVE_PROFILE,
      ),
    );

    for (const state of states) {
      expect(Math.abs(state.character.x)).toBeLessThanOrEqual(2.6 + 1e-9);
      expect(Math.abs(state.character.y)).toBeLessThanOrEqual(2.2 + 1e-9);
      expect(Math.abs(state.character.rotationDegrees)).toBeLessThanOrEqual(0.2 + 1e-9);
    }

    const unique = new Set(
      states.map(
        (state) =>
          `${state.character.x.toFixed(4)}:${state.character.y.toFixed(4)}:${state.character.rotationDegrees.toFixed(5)}`,
      ),
    );
    expect(unique.size).toBeGreaterThan(100);
  });
});
