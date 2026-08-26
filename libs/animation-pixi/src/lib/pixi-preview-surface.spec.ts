import { describe, expect, it } from 'vitest';
import {
  assertPixiSourceAssetDigest,
  assertPixiSourceAssetHttpResponse,
  buildPixiApplicationOptions,
  buildPixiSourceRegistration,
  normalizePixiSourceAssetSha256,
  PIXI_PREVIEW_RENDER_MODE,
} from './pixi-preview-surface';

describe('Pixi preview surface policy', () => {
  it('uses a manual WebGL renderer with both Pixi tickers disabled', () => {
    const options = buildPixiApplicationOptions(1080, 1920);

    expect(PIXI_PREVIEW_RENDER_MODE).toBe('manual-exact-frame');
    expect(options).toEqual({
      width: 1080,
      height: 1920,
      autoStart: false,
      sharedTicker: false,
      antialias: false,
      backgroundColor: 0x05080d,
      backgroundAlpha: 1,
      resolution: 1,
      preference: 'webgl',
    });
  });

  it('normalizes canonical sha256 identities without weakening validation', () => {
    const digest = 'a'.repeat(64);

    expect(normalizePixiSourceAssetSha256(`sha256:${digest}`)).toBe(digest);
    expect(normalizePixiSourceAssetSha256(digest.toUpperCase())).toBe(digest);
    expect(() => normalizePixiSourceAssetSha256('sha256:not-a-digest')).toThrow(/64 hexadecimal/i);
  });

  it('fails closed when a source asset is missing', () => {
    expect(() =>
      assertPixiSourceAssetHttpResponse({ id: 'shot03-water-v1' }, false, 404),
    ).toThrow('Pixi source asset shot03-water-v1 failed to load with HTTP 404.');
  });

  it('fails closed when source bytes are stale relative to the approved hash', () => {
    const approved = 'a'.repeat(64);
    const stale = 'b'.repeat(64);

    expect(() =>
      assertPixiSourceAssetDigest(
        { id: 'shot03-water-v1', sha256: `sha256:${approved}` },
        stale,
      ),
    ).toThrow(/shot03-water-v1 checksum mismatch/i);
    expect(
      assertPixiSourceAssetDigest(
        { id: 'shot03-water-v1', sha256: `sha256:${approved}` },
        approved,
      ),
    ).toBe(approved);
  });

  it('registers the 941x1672 Shot 3 source into 1080x1920 like centered object-fit cover', () => {
    const registration = buildPixiSourceRegistration(
      {
        id: 'shot03-water-v1',
        width: 941,
        height: 1672,
        registration: 'cover-center',
      },
      1080,
      1920,
    );

    expect(registration.scale).toBeCloseTo(1.1483253589, 9);
    expect(registration.x).toBeCloseTo(-0.28708134, 7);
    expect(registration.y).toBeCloseTo(0, 9);
    expect(registration.width).toBeCloseTo(1080.57416268, 7);
    expect(registration.height).toBeCloseTo(1920, 9);
  });

  it('rejects invalid viewport dimensions before Pixi initialization', () => {
    expect(() => buildPixiApplicationOptions(0, 1920)).toThrow(/positive integer/i);
    expect(() => buildPixiApplicationOptions(1080, -1)).toThrow(/positive integer/i);
    expect(() => buildPixiApplicationOptions(1080.5, 1920)).toThrow(/positive integer/i);
  });
});
