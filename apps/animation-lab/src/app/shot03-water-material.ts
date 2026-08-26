import {
  PIXI_CONTAINED_WATER_MATERIAL_KIND,
  type PixiContainedWaterMaterialBinding,
} from '@sumer-reel-forge/animation-pixi';

export const SHOT03_WATER_MATERIAL_BINDING: PixiContainedWaterMaterialBinding = Object.freeze({
  id: 'shot03-water-micro-drift-v1',
  assetId: 'shot03-water-v1',
  kind: PIXI_CONTAINED_WATER_MATERIAL_KIND,
  amplitudeX: 8,
  amplitudeY: 4,
  periodSecondsX: 3.2,
  periodSecondsY: 4.4,
  phaseX: 0.25,
  phaseY: 0.25,
  overscanScale: 1.012,
  movingOpacity: 0.42,
  settleStartProgress: 0.88,
  settleFloor: 0.55,
});

export const SHOT03_WATER_MATERIAL_BINDINGS: readonly PixiContainedWaterMaterialBinding[] =
  Object.freeze([SHOT03_WATER_MATERIAL_BINDING]);
