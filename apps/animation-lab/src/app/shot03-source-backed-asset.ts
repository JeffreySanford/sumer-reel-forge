import type { PixiSourceAsset } from '@sumer-reel-forge/animation-pixi';
import shot03BackgroundUrl from '../../../../assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/background.png?url';
import shot03WaterUrl from '../../../../assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/water.png?url';
import shot03VesselUrl from '../../../../assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/vessel.png?url';
import shot03EnkiBodyUrl from '../../../../assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/character/enki-body.png?url';

export const SHOT03_BACKGROUND_SHA256 =
  'sha256:db4b1c33afc38bd93543bd9eba8cb5b992ddfa0d3a8ca989d992bd060ec3f2b1' as const;
export const SHOT03_WATER_SHA256 =
  'sha256:f77eb37906ae589b0483dd3a11504ee39cc1aa28500ec10dba5de14a3b6f8979' as const;
export const SHOT03_VESSEL_SHA256 =
  'sha256:fe28b4ec5cd0efd724908a106649db782f685f76cd0e34d01e085af02467c3d4' as const;
export const SHOT03_ENKI_BODY_SHA256 =
  'sha256:3c7cdfdbde7776f91cf4b3f81908443b56194931a74654ecdbdb5798917aa6f5' as const;

function shot03Asset(
  id: string,
  role: string,
  url: string,
  sha256: string,
): PixiSourceAsset {
  return Object.freeze({
    id,
    role,
    url,
    sha256,
    width: 941,
    height: 1672,
    registration: 'cover-center',
  });
}

export const SHOT03_BACKGROUND_SOURCE_ASSET = shot03Asset(
  'shot03-background-v1',
  'background',
  shot03BackgroundUrl,
  SHOT03_BACKGROUND_SHA256,
);

export const SHOT03_WATER_SOURCE_ASSET = shot03Asset(
  'shot03-water-v1',
  'water',
  shot03WaterUrl,
  SHOT03_WATER_SHA256,
);

export const SHOT03_VESSEL_SOURCE_ASSET = shot03Asset(
  'shot03-vessel-v1',
  'major-prop',
  shot03VesselUrl,
  SHOT03_VESSEL_SHA256,
);

export const SHOT03_ENKI_BODY_SOURCE_ASSET = shot03Asset(
  'shot03-enki-body-v1',
  'character',
  shot03EnkiBodyUrl,
  SHOT03_ENKI_BODY_SHA256,
);

// This is deliberately the manifest-required review composition, in depth
// order: background -> water -> vessel -> Enki. Optional rigging and closed-eye
// state stay out of this material proof so only water motion is under review.
export const SHOT03_SOURCE_BACKED_ASSETS: readonly PixiSourceAsset[] = Object.freeze([
  SHOT03_BACKGROUND_SOURCE_ASSET,
  SHOT03_WATER_SOURCE_ASSET,
  SHOT03_VESSEL_SOURCE_ASSET,
  SHOT03_ENKI_BODY_SOURCE_ASSET,
]);
