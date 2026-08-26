import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import {
  SHOT03_BACKGROUND_SHA256,
  SHOT03_BACKGROUND_SOURCE_ASSET,
  SHOT03_ENKI_BODY_SHA256,
  SHOT03_ENKI_BODY_SOURCE_ASSET,
  SHOT03_SOURCE_BACKED_ASSETS,
  SHOT03_VESSEL_SHA256,
  SHOT03_VESSEL_SOURCE_ASSET,
  SHOT03_WATER_SHA256,
  SHOT03_WATER_SOURCE_ASSET,
} from './shot03-source-backed-asset';

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

function findRepositoryRoot(start: string): string {
  let current = resolve(start);
  while (true) {
    if (existsSync(join(current, 'nx.json')) && existsSync(join(current, 'package.json'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      throw new Error(`Could not locate repository root from ${start}.`);
    }
    current = parent;
  }
}

function readPngDimensions(buffer: Buffer): { readonly width: number; readonly height: number } {
  if (
    buffer.length < 24 ||
    buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
    buffer.subarray(12, 16).toString('ascii') !== 'IHDR'
  ) {
    throw new Error('Expected a valid PNG with an IHDR header.');
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

const repositoryRoot = findRepositoryRoot(process.cwd());
const editorialSourcePath = join(
  repositoryRoot,
  'assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-03.png',
);
const manifestPath = join(
  repositoryRoot,
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);

const reviewLayers = [
  {
    asset: SHOT03_BACKGROUND_SOURCE_ASSET,
    sha256: SHOT03_BACKGROUND_SHA256,
    relativePath: 'blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/background.png',
  },
  {
    asset: SHOT03_WATER_SOURCE_ASSET,
    sha256: SHOT03_WATER_SHA256,
    relativePath: 'blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/water.png',
  },
  {
    asset: SHOT03_VESSEL_SOURCE_ASSET,
    sha256: SHOT03_VESSEL_SHA256,
    relativePath: 'blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/vessel.png',
  },
  {
    asset: SHOT03_ENKI_BODY_SOURCE_ASSET,
    sha256: SHOT03_ENKI_BODY_SHA256,
    relativePath: 'blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/character/enki-body.png',
  },
] as const;

describe('Shot 3 source-backed Pixi review composition', () => {
  it('matches the exact approved canonical bytes and source-space identity for all required layers', () => {
    const editorialDimensions = readPngDimensions(readFileSync(editorialSourcePath));
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as AnimationManifest;
    const shot = manifest.shots.find((candidate) => candidate.shotId === 'enki-at-the-helm');

    expect(SHOT03_SOURCE_BACKED_ASSETS.map((asset) => asset.id)).toEqual([
      'shot03-background-v1',
      'shot03-water-v1',
      'shot03-vessel-v1',
      'shot03-enki-body-v1',
    ]);

    for (const reviewLayer of reviewLayers) {
      const bytes = readFileSync(join(repositoryRoot, 'assets', reviewLayer.relativePath));
      const actualSha256 = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
      const dimensions = readPngDimensions(bytes);
      const layer = shot?.layers.find((candidate) => candidate.id === reviewLayer.asset.id);

      expect(actualSha256).toBe(reviewLayer.sha256);
      expect(dimensions).toEqual({ width: 941, height: 1672 });
      expect(dimensions).toEqual(editorialDimensions);
      expect(reviewLayer.asset.sha256).toBe(reviewLayer.sha256);
      expect(reviewLayer.asset.width).toBe(dimensions.width);
      expect(reviewLayer.asset.height).toBe(dimensions.height);
      expect(reviewLayer.asset.registration).toBe('cover-center');
      expect(layer).toMatchObject({
        id: reviewLayer.asset.id,
        path: reviewLayer.relativePath,
        state: 'approved',
        sha256: reviewLayer.sha256,
        review: { status: 'approved' },
      });
    }
  });
});
