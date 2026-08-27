import { buildShot03SecondaryMotionIsolationState } from './shot03-secondary-motion-isolation';

const FPS = 30;
const DURATION_FRAMES = 210;

describe('Shot 3 secondary-motion isolation state', () => {
  it('freezes camera, background, and water while preserving exact-frame authority', () => {
    const state = buildShot03SecondaryMotionIsolationState(101, FPS, DURATION_FRAMES);
    const background = state.sourceLayerStates.find((layer) => layer.assetId === 'shot03-background-v1');
    const water = state.sourceLayerStates.find((layer) => layer.assetId === 'shot03-water-v1');

    expect(state.camera).toEqual({ x: 0, y: 0, scale: 1 });
    expect(background).toMatchObject({ offsetX: 0, offsetY: 0, scale: 1, rotationDegrees: 0 });
    expect(water).toMatchObject({ offsetX: 0, offsetY: 0, scale: 1, rotationDegrees: 0 });
    expect(state.sourceLayerStates.every((layer) => layer.timeSource === 'exact-frame')).toBe(true);
  });

  it('makes vessel motion deliberately unmistakable for renderer-path diagnosis', () => {
    const states = Array.from({ length: DURATION_FRAMES }, (_unused, frame) =>
      buildShot03SecondaryMotionIsolationState(frame, FPS, DURATION_FRAMES),
    );
    const maxHeave = Math.max(...states.map((state) => Math.abs(state.vessel.heaveY)));
    const maxRoll = Math.max(...states.map((state) => Math.abs(state.vessel.rollDegrees)));
    const maxRiggingX = Math.max(...states.map((state) => Math.abs(state.rigging.x)));
    const maxRiggingY = Math.max(...states.map((state) => Math.abs(state.rigging.y)));

    expect(maxHeave).toBeGreaterThan(17.5);
    expect(maxRoll).toBeGreaterThan(0.5);
    expect(maxRiggingX).toBeGreaterThan(15);
    expect(maxRiggingY).toBeGreaterThan(14);
  });

  it('keeps Enki and eye state locked to the exaggerated vessel transform', () => {
    const state = buildShot03SecondaryMotionIsolationState(101, FPS, DURATION_FRAMES);
    const vessel = state.sourceLayerStates.find((layer) => layer.assetId === 'shot03-vessel-v1');
    const enki = state.sourceLayerStates.find((layer) => layer.assetId === 'shot03-enki-body-v1');
    const eyes = state.sourceLayerStates.find((layer) => layer.assetId === 'shot03-enki-eyes-v1');

    expect(vessel).toBeDefined();
    expect(enki?.offsetY).toBe(vessel?.offsetY);
    expect(eyes?.offsetY).toBe(vessel?.offsetY);
    expect(enki?.rotationDegrees).toBe(vessel?.rotationDegrees);
    expect(eyes?.rotationDegrees).toBe(vessel?.rotationDegrees);
  });

  it('is deterministic for the same exact frame', () => {
    const first = buildShot03SecondaryMotionIsolationState(52, FPS, DURATION_FRAMES);
    const second = buildShot03SecondaryMotionIsolationState(52, FPS, DURATION_FRAMES);
    expect(second).toEqual(first);
  });
});
