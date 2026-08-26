import type { PixiSourceAsset } from '@sumer-reel-forge/animation-pixi';
import shot03BackgroundUrl from '../../../../assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/background.png?url';
import shot03WaterUrl from '../../../../assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/water.png?url';
import shot03VesselUrl from '../../../../assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/vessel.png?url';
import shot03EnkiBodyUrl from '../../../../assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/character/enki-body.png?url';
import shot03EnkiEyesUrl from '../../../../assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/character/enki-eyes-closed.png?url';
import shot03RiggingUrl from '../../../../assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/foreground/rigging.png?url';

export const SHOT03_BACKGROUND_SHA256 =
  'sha256:db4b1c33afc38bd93543bd9eba8cb5b992ddfa0d3a8ca989d992bd060ec3f2b1' as const;
export const SHOT03_WATER_SHA256 =
  'sha256:f77eb37906ae589b0483dd3a11504ee39cc1aa28500ec10dba5de14a3b6f8979' as const;
export const SHOT03_VESSEL_SHA256 =
  'sha256:fe28b4ec5cd0efd724908a106649db782f685f76cd0e34d01e085af02467c3d4' as const;
export const SHOT03_ENKI_BODY_SHA256 =
  'sha256:3c7cdfdbde7776f91cf4b3f81908443b56194931a74654ecdbdb5798917aa6f5' as const;
export const SHOT03_ENKI_EYES_SHA256 =
  'sha256:b1d40abaaa8a8d29d368f5063eab35d172f6e70158e97b4facba7142d407d9e7' as const;
export const SHOT03_RIGGING_SHA256 =
  'sha256:1f3e6add78d406d3f17ee618604da37eef9b2a8bf403650ba98986f4ab82d5f7' as const;

export const SHOT03_RECOVERY_BACKGROUND_URL = '/__shot03-recovery/background.png' as const;
export const SHOT03_RECOVERY_VESSEL_URL = '/__shot03-recovery/vessel.png' as const;
export const SHOT03_RECOVERY_ENKI_URL = '/__shot03-recovery/enki.png' as const;

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

export const SHOT03_ENKI_EYES_SOURCE_ASSET = shot03Asset(
  'shot03-enki-eyes-v1',
  'character-state',
  shot03EnkiEyesUrl,
  SHOT03_ENKI_EYES_SHA256,
);

export const SHOT03_RIGGING_SOURCE_ASSET = shot03Asset(
  'shot03-rigging-v1',
  'foreground-occluder',
  shot03RiggingUrl,
  SHOT03_RIGGING_SHA256,
);

// The original material benchmark remains the exact manifest-required review
// composition established by PR #23. Keep it stable so the full-motion proof
// does not rewrite the accepted fixed-frame baseline.
export const SHOT03_SOURCE_BACKED_ASSETS: readonly PixiSourceAsset[] = Object.freeze([
  SHOT03_BACKGROUND_SOURCE_ASSET,
  SHOT03_WATER_SOURCE_ASSET,
  SHOT03_VESSEL_SOURCE_ASSET,
  SHOT03_ENKI_BODY_SOURCE_ASSET,
]);

// Full-shot motion review extends the accepted baseline with the two already
// approved optional Level 2 source layers in canonical depth order.
export const SHOT03_FULL_MOTION_SOURCE_ASSETS: readonly PixiSourceAsset[] = Object.freeze([
  SHOT03_BACKGROUND_SOURCE_ASSET,
  SHOT03_WATER_SOURCE_ASSET,
  SHOT03_VESSEL_SOURCE_ASSET,
  SHOT03_ENKI_BODY_SOURCE_ASSET,
  SHOT03_ENKI_EYES_SOURCE_ASSET,
  SHOT03_RIGGING_SOURCE_ASSET,
]);

export function buildShot03RecoverySourceAssets(input: {
  readonly backgroundSha256: string;
  readonly vesselSha256: string;
  readonly enkiSha256: string;
}): readonly PixiSourceAsset[] {
  return Object.freeze([
    shot03Asset(
      'shot03-background-v1',
      'background',
      SHOT03_RECOVERY_BACKGROUND_URL,
      input.backgroundSha256,
    ),
    SHOT03_WATER_SOURCE_ASSET,
    shot03Asset(
      'shot03-vessel-v1',
      'major-prop',
      SHOT03_RECOVERY_VESSEL_URL,
      input.vesselSha256,
    ),
    shot03Asset(
      'shot03-enki-body-v1',
      'character',
      SHOT03_RECOVERY_ENKI_URL,
      input.enkiSha256,
    ),
    SHOT03_ENKI_EYES_SOURCE_ASSET,
    SHOT03_RIGGING_SOURCE_ASSET,
  ]);
}
