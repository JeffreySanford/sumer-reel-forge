import {
  buildShot03RecoverySourceAssets,
  SHOT03_ENKI_EYES_SHA256,
  SHOT03_RECOVERY_BACKGROUND_URL,
  SHOT03_RECOVERY_ENKI_URL,
  SHOT03_RECOVERY_EYES_URL,
  SHOT03_RECOVERY_VESSEL_URL,
  SHOT03_RIGGING_SHA256,
  SHOT03_WATER_SHA256,
} from './shot03-source-backed-asset';

describe('Shot 3 recovered source asset bundle', () => {
  it('overrides only background, vessel, and Enki while retaining hidden canonical support layers', () => {
    const assets = buildShot03RecoverySourceAssets({
      backgroundSha256: 'sha256:background-recovered',
      vesselSha256: 'sha256:vessel-recovered',
      enkiSha256: 'sha256:enki-recovered',
    });

    expect(assets.map((asset) => asset.id)).toEqual([
      'shot03-background-v1',
      'shot03-water-v1',
      'shot03-vessel-v1',
      'shot03-enki-body-v1',
      'shot03-enki-eyes-v1',
      'shot03-rigging-v1',
    ]);
    expect(assets[0]).toMatchObject({
      url: SHOT03_RECOVERY_BACKGROUND_URL,
      sha256: 'sha256:background-recovered',
      width: 941,
      height: 1672,
      registration: 'cover-center',
    });
    expect(assets[2]).toMatchObject({
      url: SHOT03_RECOVERY_VESSEL_URL,
      sha256: 'sha256:vessel-recovered',
    });
    expect(assets[3]).toMatchObject({
      url: SHOT03_RECOVERY_ENKI_URL,
      sha256: 'sha256:enki-recovered',
    });
    expect(assets[1].sha256).toBe(SHOT03_WATER_SHA256);
    expect(assets[4].sha256).toBe(SHOT03_ENKI_EYES_SHA256);
    expect(assets[5].sha256).toBe(SHOT03_RIGGING_SHA256);
  });

  it('can override only the closed-eye state for a candidate blink audition', () => {
    const assets = buildShot03RecoverySourceAssets({
      backgroundSha256: 'sha256:background-recovered',
      vesselSha256: 'sha256:vessel-recovered',
      enkiSha256: 'sha256:enki-recovered',
      eyesSha256: 'sha256:eyes-replacement-candidate',
    });

    expect(assets[4]).toMatchObject({
      id: 'shot03-enki-eyes-v1',
      role: 'character-state',
      url: SHOT03_RECOVERY_EYES_URL,
      sha256: 'sha256:eyes-replacement-candidate',
      width: 941,
      height: 1672,
      registration: 'cover-center',
    });
    expect(assets[0].url).toBe(SHOT03_RECOVERY_BACKGROUND_URL);
    expect(assets[2].url).toBe(SHOT03_RECOVERY_VESSEL_URL);
    expect(assets[3].url).toBe(SHOT03_RECOVERY_ENKI_URL);
    expect(assets[1].sha256).toBe(SHOT03_WATER_SHA256);
    expect(assets[5].sha256).toBe(SHOT03_RIGGING_SHA256);
  });
});
