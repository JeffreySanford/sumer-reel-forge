import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
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
const waterPath = join(
  repositoryRoot,
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/water.png',
);
const editorialSourcePath = join(
  repositoryRoot,
  'assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-03.png',
);
const manifestPath = join(
  repositoryRoot,
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);

describe('Shot 3 source-backed Pixi asset', () => {
  it('matches the exact approved canonical water bytes and source-space identity', () => {
    const bytes = readFileSync(waterPath);
    const editorialBytes = readFileSync(editorialSourcePath);
    const actualSha256 = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    const waterDimensions = readPngDimensions(bytes);
    const editorialDimensions = readPngDimensions(editorialBytes);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as AnimationManifest;
    const shot = manifest.shots.find((candidate) => candidate.shotId === 'enki-at-the-helm');
    const layer = shot?.layers.find((candidate) => candidate.id === 'shot03-water-v1');

    expect(actualSha256).toBe(SHOT03_WATER_SHA256);
    expect(waterDimensions).toEqual({ width: 941, height: 1672 });
    expect(waterDimensions).toEqual(editorialDimensions);
    expect(SHOT03_WATER_SOURCE_ASSET.sha256).toBe(SHOT03_WATER_SHA256);
    expect(SHOT03_WATER_SOURCE_ASSET.width).toBe(waterDimensions.width);
    expect(SHOT03_WATER_SOURCE_ASSET.height).toBe(waterDimensions.height);
    expect(SHOT03_WATER_SOURCE_ASSET.registration).toBe('cover-center');
    expect(layer).toMatchObject({
      id: 'shot03-water-v1',
      path: 'blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03/water.png',
      state: 'approved',
      sha256: SHOT03_WATER_SHA256,
      review: { status: 'approved' },
    });
  });
});
