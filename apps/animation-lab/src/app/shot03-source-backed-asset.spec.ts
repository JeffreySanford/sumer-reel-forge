import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SHOT03_WATER_SHA256, SHOT03_WATER_SOURCE_ASSET } from './shot03-source-backed-asset';

type ManifestLayer = {
  readonly id: string;
  readonly path: string;
  readonly state: string;
  readonly sha256?: string;
  readonly review?: { readonly status?: string };
};

type ManifestShot = {
  readonly shotId: string;
  readonly layers: readonly ManifestLayer[];
};

type AnimationManifest = {
  readonly shots: readonly ManifestShot[];
};

const waterPath = fileURLToPath(
  new URL(
    '../../../../assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/water.png',
    import.meta.url,
  ),
);
const manifestPath = fileURLToPath(
  new URL(
    '../../../../assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
    import.meta.url,
  ),
);

describe('Shot 3 source-backed Pixi asset', () => {
  it('matches the exact approved canonical water bytes and manifest identity', () => {
    const bytes = readFileSync(waterPath);
    const actualSha256 = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as AnimationManifest;
    const shot = manifest.shots.find((candidate) => candidate.shotId === 'enki-at-the-helm');
    const layer = shot?.layers.find((candidate) => candidate.id === 'shot03-water-v1');

    expect(actualSha256).toBe(SHOT03_WATER_SHA256);
    expect(SHOT03_WATER_SOURCE_ASSET.sha256).toBe(SHOT03_WATER_SHA256);
    expect(SHOT03_WATER_SOURCE_ASSET.width).toBe(1080);
    expect(SHOT03_WATER_SOURCE_ASSET.height).toBe(1920);
    expect(layer).toMatchObject({
      id: 'shot03-water-v1',
      path: 'blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/water.png',
      state: 'approved',
      sha256: SHOT03_WATER_SHA256,
      review: { status: 'approved' },
    });
  });
});
