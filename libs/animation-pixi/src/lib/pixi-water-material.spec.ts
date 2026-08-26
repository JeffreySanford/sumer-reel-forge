import { describe, expect, it } from 'vitest';
import {
  buildPixiContainedWaterMaterialState,
  PIXI_CONTAINED_WATER_MATERIAL_KIND,
  type PixiContainedWaterMaterialBinding,
} from './pixi-water-material';

const BINDING: PixiContainedWaterMaterialBinding = Object.freeze({
  id: 'shot03-water-micro-drift-v1',
  assetId: 'shot03-water-v1',
  kind: PIXI_CONTAINED_WATER_MATERIAL_KIND,
  amplitudeX: 2.4,
  amplitudeY: 1.2,
  periodSecondsX: 3.2,
  periodSecondsY: 4.4,
  phaseX: 0.25,
  phaseY: 0.25,
  overscanScale: 1.006,
  movingOpacity: 0.24,
  settleStartProgress: 0.88,
  settleFloor: 0.55,
  readableRippleOpacity: 0.55,
  readableRippleRateHz: 0.22,
});

describe('Pixi contained water material state', () => {
  it('starts registered with zero drift and no readable crest at the control frame', () => {
    const state = buildPixiContainedWaterMaterialState(BINDING, {
      frame: 0,
      fps: 30,
      durationFrames: 210,
    });

    expect(state).toMatchObject({
      id: 'shot03-water-micro-drift-v1',
      assetId: 'shot03-water-v1',
      kind: 'contained-water-micro-drift',
      offsetX: 0,
      offsetY: 0,
      settle: 1,
      scale: 1.006,
      movingOpacity: 0.24,
      readableRippleStrength: 0,
      maxOffsetX: 2.4,
      maxOffsetY: 1.2,
      maxScale: 1.006,
      containment: 'source-alpha',
      timeSource: 'exact-frame',
    });
    expect(state.ripples).toHaveLength(3);
    expect(state.ripples.every((ripple) => ripple.opacity === 0)).toBe(true);
  });

  it('produces deterministic bounded drift plus readable ripple state at frame 101', () => {
    const first = buildPixiContainedWaterMaterialState(BINDING, {
      frame: 101,
      fps: 30,
      durationFrames: 210,
    });
    const second = buildPixiContainedWaterMaterialState(BINDING, {
      frame: 101,
      fps: 30,
      durationFrames: 210,
    });

    expect(second).toEqual(first);
    expect(first.offsetX).toBeCloseTo(0.5, 9);
    expect(first.offsetY).toBeCloseTo(-1.1272727273, 9);
    expect(first.readableRippleStrength).toBe(1);
    expect(first.ripples).toHaveLength(3);
    expect(first.ripples[0]).toMatchObject({ index: 0 });
    expect(first.ripples[0]?.cycle).toBeCloseTo(0.7406666667, 9);
    expect(first.ripples[0]?.opacity).toBeCloseTo(0.2852666667, 9);
    expect(first.ripples[2]?.cycle).toBeCloseTo(0.4606666667, 9);
    expect(first.ripples[2]?.opacity).toBeCloseTo(0.4053866667, 9);
    expect(Math.abs(first.offsetX)).toBeLessThanOrEqual(first.maxOffsetX);
    expect(Math.abs(first.offsetY)).toBeLessThanOrEqual(first.maxOffsetY);
    expect(first.scale).toBeLessThanOrEqual(first.maxScale);
  });

  it('settles the fine motion and removes the readable crest at END_SETTLED', () => {
    const state = buildPixiContainedWaterMaterialState(BINDING, {
      frame: 209,
      fps: 30,
      durationFrames: 210,
    });

    expect(state.settle).toBe(0.55);
    expect(state.offsetX).toBeCloseTo(0.935, 9);
    expect(state.offsetY).toBeCloseTo(-0.22, 9);
    expect(state.scale).toBeCloseTo(1.0033, 9);
    expect(state.movingOpacity).toBeCloseTo(0.132, 9);
    expect(state.readableRippleStrength).toBe(0);
    expect(state.ripples.every((ripple) => ripple.opacity === 0)).toBe(true);
    expect(state.timeSource).toBe('exact-frame');
  });

  it('rejects invalid bounds, ripple controls, and out-of-range exact frames', () => {
    expect(() =>
      buildPixiContainedWaterMaterialState(
        { ...BINDING, overscanScale: 0.99 },
        { frame: 0, fps: 30, durationFrames: 210 },
      ),
    ).toThrow(/overscanScale.*at least 1/i);

    expect(() =>
      buildPixiContainedWaterMaterialState(
        { ...BINDING, readableRippleOpacity: 1.1 },
        { frame: 0, fps: 30, durationFrames: 210 },
      ),
    ).toThrow(/readableRippleOpacity.*between 0 and 1/i);

    expect(() =>
      buildPixiContainedWaterMaterialState(BINDING, {
        frame: 210,
        fps: 30,
        durationFrames: 210,
      }),
    ).toThrow(/exceeds duration/i);
  });
});
