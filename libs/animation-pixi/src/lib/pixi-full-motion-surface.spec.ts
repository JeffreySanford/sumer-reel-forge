import {
  PIXI_SHOT03_TRANSFORM_MODEL,
  resolvePixiShot03LocalGroupState,
  type PixiSourceLayerFrameState,
} from './pixi-full-motion-surface';

function state(
  assetId: string,
  offsetX: number,
  offsetY: number,
  scale: number,
  rotationDegrees: number,
  opacity = 1,
): PixiSourceLayerFrameState {
  return {
    assetId,
    offsetX,
    offsetY,
    scale,
    rotationDegrees,
    opacity,
    timeSource: 'exact-frame',
  };
}

describe('Pixi Shot 3 local group transform model', () => {
  it('uses explicit semantic pivots instead of image-center transforms', () => {
    expect(PIXI_SHOT03_TRANSFORM_MODEL).toBe('shot03-local-groups-v1');

    const groups = resolvePixiShot03LocalGroupState({
      width: 1080,
      height: 1920,
      sourceLayerStates: [
        state('shot03-background-v1', 0, 0, 1, 0),
        state('shot03-water-v1', 0, 0, 1, 0),
        state('shot03-vessel-v1', 0, 18, 1, 0.6),
        state('shot03-enki-body-v1', 0, 18, 1, 0.6),
        state('shot03-enki-eyes-v1', 0, 18, 1, 0.6, 0),
        state('shot03-rigging-v1', 16, -12, 1, -1.2),
      ],
    });

    expect(groups.camera).toMatchObject({
      id: 'camera-root',
      pivotX: 540,
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      rotationDegrees: 0,
    });
    expect(groups.camera.pivotY).toBeCloseTo(921.6, 10);

    expect(groups.vessel).toMatchObject({
      id: 'vessel-root',
      pivotX: 540,
      offsetX: 0,
      offsetY: 18,
      scale: 1,
      rotationDegrees: 0.6,
    });
    expect(groups.vessel.pivotY).toBeCloseTo(1190.4, 10);

    expect(groups.enki).toMatchObject({
      id: 'enki-root',
      pivotX: 540,
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      rotationDegrees: 0,
    });
    expect(groups.enki.pivotY).toBeCloseTo(883.2, 10);

    expect(groups.rigging).toMatchObject({
      id: 'rigging-root',
      pivotX: 540,
      offsetX: 16,
      offsetY: -12,
      scale: 1,
      rotationDegrees: -1.2,
    });
    expect(groups.rigging.pivotY).toBeCloseTo(345.6, 10);
  });

  it('separates camera, vessel, Enki, and rigging local response', () => {
    const groups = resolvePixiShot03LocalGroupState({
      width: 1080,
      height: 1920,
      sourceLayerStates: [
        state('shot03-background-v1', -5, -7, 1.024, 0),
        state('shot03-water-v1', -5, -7, 1.024, 0),
        state('shot03-vessel-v1', -5, -3, 1.024, 0.2),
        state('shot03-enki-body-v1', -3.5, -4.25, 1.024, 0.08),
        state('shot03-enki-eyes-v1', -3.5, -4.25, 1.024, 0.08, 0),
        state('shot03-rigging-v1', 2, -10, 1.024, -0.3),
      ],
    });

    expect(groups.camera.offsetX).toBe(-5);
    expect(groups.camera.offsetY).toBe(-7);
    expect(groups.camera.scale).toBe(1.024);

    expect(groups.vessel.offsetX).toBe(0);
    expect(groups.vessel.offsetY).toBe(4);
    expect(groups.vessel.scale).toBe(1);
    expect(groups.vessel.rotationDegrees).toBe(0.2);

    expect(groups.enki.offsetX).toBeCloseTo(1.5, 10);
    expect(groups.enki.offsetY).toBeCloseTo(-1.25, 10);
    expect(groups.enki.scale).toBe(1);
    expect(groups.enki.rotationDegrees).toBeCloseTo(-0.12, 10);

    expect(groups.rigging.offsetX).toBe(7);
    expect(groups.rigging.offsetY).toBe(-3);
    expect(groups.rigging.scale).toBe(1);
    expect(groups.rigging.rotationDegrees).toBe(-0.3);
  });

  it('allows Enki to perform locally while remaining nested under the vessel root', () => {
    const groups = resolvePixiShot03LocalGroupState({
      width: 1080,
      height: 1920,
      sourceLayerStates: [
        state('shot03-background-v1', 0, 0, 1, 0),
        state('shot03-water-v1', 0, 0, 1, 0),
        state('shot03-vessel-v1', 0, 10, 1, 0.2),
        state('shot03-enki-body-v1', 1.25, 9.25, 1, 0.08),
        state('shot03-enki-eyes-v1', 1.25, 9.25, 1, 0.08, 0),
        state('shot03-rigging-v1', 0, 0, 1, 0),
      ],
    });

    expect(groups.enki.offsetX).toBeCloseTo(1.25, 10);
    expect(groups.enki.offsetY).toBeCloseTo(-0.75, 10);
    expect(groups.enki.rotationDegrees).toBeCloseTo(-0.12, 10);
  });

  it('rejects an eye-state layer that escapes the Enki parent transform', () => {
    expect(() =>
      resolvePixiShot03LocalGroupState({
        width: 1080,
        height: 1920,
        sourceLayerStates: [
          state('shot03-background-v1', 0, 0, 1, 0),
          state('shot03-water-v1', 0, 0, 1, 0),
          state('shot03-vessel-v1', 0, 10, 1, 0.2),
          state('shot03-enki-body-v1', 1, 9, 1, 0.1),
          state('shot03-enki-eyes-v1', 1, 8.5, 1, 0.1, 0),
          state('shot03-rigging-v1', 0, 0, 1, 0),
        ],
      }),
    ).toThrow(/character-carried/i);
  });
});
