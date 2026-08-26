import type { PixiSourceAsset } from '@sumer-reel-forge/animation-pixi';
import shot03WaterUrl from '../../../../assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/water.png?url';

export const SHOT03_WATER_SHA256 =
  'sha256:f77eb37906ae589b0483dd3a11504ee39cc1aa28500ec10dba5de14a3b6f8979' as const;

export const SHOT03_WATER_SOURCE_ASSET: PixiSourceAsset = Object.freeze({
  id: 'shot03-water-v1',
  role: 'water',
  url: shot03WaterUrl,
  sha256: SHOT03_WATER_SHA256,
  width: 941,
  height: 1672,
  registration: 'cover-center',
});

export const SHOT03_SOURCE_BACKED_ASSETS: readonly PixiSourceAsset[] = Object.freeze([
  SHOT03_WATER_SOURCE_ASSET,
]);
