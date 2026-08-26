import { describe, expect, it } from 'vitest';
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

  it('matches the established V2 camera, vessel, and delayed rigging semantics at frame 101', () => {
    const first = buildShot03FullMotionState(101, FPS, DURATION_FRAMES);
    const second = buildShot03FullMotionState(101, FPS, DURATION_FRAMES);

    expect(second).toEqual(first);
    expect(first.camera.x).toBeCloseTo(-2.973100679, 8);
    expect(first.camera.y).toBeCloseTo(-4.16234095, 8);
    expect(first.camera.scale).toBeCloseTo(1.014270883, 8);
    expect(first.vessel.heaveY).toBeCloseTo(-1.54718015, 8);
    expect(first.vessel.rollDegrees).toBeCloseTo(-0.000565472, 8);
    expect(first.rigging.x).toBeCloseTo(-0.260878649, 8);
    expect(first.rigging.y).toBeCloseTo(-1.428278116, 8);
    expect(first.rigging.rotationDegrees).toBeCloseTo(-0.070381331, 8);
    expect(first.rigging.lagSeconds).toBe(0.24);
    expect(first.blinkOpacity).toBe(1);
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
