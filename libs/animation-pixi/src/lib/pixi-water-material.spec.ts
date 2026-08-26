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
});

describe('Pixi contained water material state', () => {
  it('starts registered with zero drift and exact-frame authority', () => {
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
      maxOffsetX: 2.4,
      maxOffsetY: 1.2,
      maxScale: 1.006,
      containment: 'source-alpha',
      timeSource: 'exact-frame',
    });
  });

  it('produces deterministic bounded motion at the named middle proof frame', () => {
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
    expect(Math.abs(first.offsetX)).toBeLessThanOrEqual(first.maxOffsetX);
    expect(Math.abs(first.offsetY)).toBeLessThanOrEqual(first.maxOffsetY);
    expect(first.scale).toBeLessThanOrEqual(first.maxScale);
  });

  it('settles toward the production water floor at END_SETTLED without stopping story time', () => {
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
    expect(state.timeSource).toBe('exact-frame');
  });

  it('rejects invalid bounds and out-of-range exact frames', () => {
    expect(() =>
      buildPixiContainedWaterMaterialState(
        { ...BINDING, overscanScale: 0.99 },
        { frame: 0, fps: 30, durationFrames: 210 },
      ),
    ).toThrow(/overscanScale.*at least 1/i);

    expect(() =>
      buildPixiContainedWaterMaterialState(BINDING, {
        frame: 210,
        fps: 30,
        durationFrames: 210,
      }),
    ).toThrow(/exceeds duration/i);
  });
});
