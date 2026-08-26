import { buildShot03FullMotionState } from './shot03-full-motion';

const FPS = 30;
const DURATION_FRAMES = 210;

describe('Shot 3 full-motion exact-frame state', () => {
  it('starts from the approved composition with no camera push and open eyes', () => {
    const state = buildShot03FullMotionState(0, FPS, DURATION_FRAMES);

    expect(state.camera).toEqual({ x: 0, y: 0, scale: 1 });
    expect(state.vessel.heaveY).toBeCloseTo(0, 9);
    expect(state.blinkOpacity).toBe(0);
    expect(state.sourceLayerStates.map((layer) => layer.assetId)).toEqual([
      'shot03-background-v1',
      'shot03-water-v1',
      'shot03-vessel-v1',
      'shot03-enki-body-v1',
      'shot03-enki-eyes-v1',
      'shot03-rigging-v1',
    ]);
    expect(state.sourceLayerStates.every((layer) => layer.timeSource === 'exact-frame')).toBe(true);
  });

  it('preserves V2 timing and lag while using the human-review perceptibility calibration', () => {
    const first = buildShot03FullMotionState(101, FPS, DURATION_FRAMES);
    const second = buildShot03FullMotionState(101, FPS, DURATION_FRAMES);

    expect(second).toEqual(first);
    expect(first.camera.x).toBeCloseTo(-2.973100679, 8);
    expect(first.camera.y).toBeCloseTo(-4.16234095, 8);
    expect(first.camera.scale).toBeCloseTo(1.014270883, 8);
    expect(first.vessel.heaveY).toBeCloseTo(-4.095476868, 8);
    expect(first.vessel.rollDegrees).toBeCloseTo(-0.001256604, 8);
    expect(first.rigging.x).toBeCloseTo(-0.711827428, 8);
    expect(first.rigging.y).toBeCloseTo(-3.780736189, 8);
    expect(first.rigging.rotationDegrees).toBeCloseTo(-0.156402957, 8);
    expect(first.rigging.lagSeconds).toBe(0.24);
    expect(first.blinkOpacity).toBe(1);
  });

  it('keeps Enki and the blink state physically carried by the moving vessel', () => {
    const state = buildShot03FullMotionState(101, FPS, DURATION_FRAMES);
    const vessel = state.sourceLayerStates.find((layer) => layer.assetId === 'shot03-vessel-v1');
    const enki = state.sourceLayerStates.find((layer) => layer.assetId === 'shot03-enki-body-v1');
    const eyes = state.sourceLayerStates.find((layer) => layer.assetId === 'shot03-enki-eyes-v1');
    const background = state.sourceLayerStates.find((layer) => layer.assetId === 'shot03-background-v1');

    expect(vessel).toBeDefined();
    expect(enki).toBeDefined();
    expect(eyes).toBeDefined();
    expect(background).toBeDefined();
    expect(vessel?.offsetY).toBeCloseTo(state.camera.y + state.vessel.heaveY, 9);
    expect(enki?.offsetY).toBe(vessel?.offsetY);
    expect(eyes?.offsetY).toBe(vessel?.offsetY);
    expect(enki?.rotationDegrees).toBe(vessel?.rotationDegrees);
    expect(eyes?.rotationDegrees).toBe(vessel?.rotationDegrees);
    expect(background?.offsetY).toBe(state.camera.y);
  });

  it('crosses a perceptible secondary-motion floor without exceeding restrained bounds', () => {
    const states = Array.from({ length: DURATION_FRAMES }, (_unused, frame) =>
      buildShot03FullMotionState(frame, FPS, DURATION_FRAMES),
    );
    const maxHeave = Math.max(...states.map((state) => Math.abs(state.vessel.heaveY)));
    const maxRoll = Math.max(...states.map((state) => Math.abs(state.vessel.rollDegrees)));
    const maxRiggingX = Math.max(...states.map((state) => Math.abs(state.rigging.x)));

    expect(maxHeave).toBeGreaterThan(4.4);
    expect(maxHeave).toBeLessThanOrEqual(4.5 + 1e-9);
    expect(maxRoll).toBeLessThanOrEqual(0.1 + 1e-9);
    expect(maxRiggingX).toBeGreaterThan(3);
    expect(maxRiggingX).toBeLessThanOrEqual(3.6 + 1e-9);
  });

  it('moves through a readable camera push while the vessel and rigging settle by the final frame', () => {
    const end = buildShot03FullMotionState(209, FPS, DURATION_FRAMES);

    expect(end.camera).toEqual({ x: -5, y: -7, scale: 1.024 });
    expect(Math.abs(end.vessel.heaveY)).toBeLessThan(1e-9);
    expect(Math.abs(end.vessel.rollDegrees)).toBeLessThan(1e-9);
    expect(end.blinkOpacity).toBe(0);
  });

  it('holds the approved blink state for multiple exact frames and returns cleanly', () => {
    expect(buildShot03FullMotionState(96, FPS, DURATION_FRAMES).blinkOpacity).toBe(0);
    expect(buildShot03FullMotionState(99, FPS, DURATION_FRAMES).blinkOpacity).toBe(1);
    expect(buildShot03FullMotionState(101, FPS, DURATION_FRAMES).blinkOpacity).toBe(1);
    expect(buildShot03FullMotionState(103, FPS, DURATION_FRAMES).blinkOpacity).toBe(1);
    expect(buildShot03FullMotionState(107, FPS, DURATION_FRAMES).blinkOpacity).toBe(0);
  });

  it('rejects invalid timing instead of inventing story time', () => {
    expect(() => buildShot03FullMotionState(-1, FPS, DURATION_FRAMES)).toThrow(/in-range/i);
    expect(() => buildShot03FullMotionState(210, FPS, DURATION_FRAMES)).toThrow(/in-range/i);
    expect(() => buildShot03FullMotionState(0, 0, DURATION_FRAMES)).toThrow(/fps/i);
  });
});
