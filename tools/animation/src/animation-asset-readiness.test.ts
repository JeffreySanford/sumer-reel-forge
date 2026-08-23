import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import {
  inspectAnimationAssetReadiness,
  prepareAnimationAssetWorkspace,
  readPngDimensions,
} from './animation-asset-readiness';
import type { AnimationAssetManifest } from './animation-asset-manifest';

function manifest(): AnimationAssetManifest {
  return {
    schemaVersion: 1,
    manifestId: 'test-animation-v1',
    projectSlug: 'test-project',
    chapterNumber: 1,
    reelId: 'test-reel',
    episodeNumber: 1,
    visualBible: 'test-v1',
    assetVersion: 'animation-v1',
    sourceEditorialVersion: 'editorial-v1',
    shots: [
      {
        shotId: 'test-shot',
        sourceShotNumber: 3,
        sourceFrame: 'project/reel/editorial-v1/shot-03.png',
        status: 'draft',
        fallback: {
          assetId: 'editorial-flat',
          assetPath: 'project/reel/editorial-v1/shot-03.png',
        },
        overscan: {
          leftPercent: 10,
          rightPercent: 10,
          topPercent: 8,
          bottomPercent: 8,
        },
        activationPolicy: {
          requiredLayerIds: ['background', 'character'],
          enableDeferredPerformanceWhenApproved: true,
        },
        layers: [
          {
            id: 'background',
            path: 'project/reel/animation-v1/shot-03/background.png',
            role: 'background',
            material: 'atmosphere-distant',
            depthDefault: 0.1,
            motionPresets: ['cinematicSlow'],
            state: 'planned',
            hasAlpha: false,
            source: {
              type: 'derived',
              from: 'project/reel/editorial-v1/shot-03.png',
            },
            review: { status: 'pending', notes: [] },
          },
          {
            id: 'character',
            path: 'project/reel/animation-v1/shot-03/character.png',
            role: 'character',
            material: 'cloth-heavy',
            depthDefault: 0.6,
            motionPresets: ['breathing'],
            state: 'planned',
            hasAlpha: true,
            source: {
              type: 'derived',
              from: 'project/reel/editorial-v1/shot-03.png',
            },
            review: { status: 'pending', notes: [] },
          },
        ],
      },
    ],
  };
}

test('reads PNG IHDR dimensions without an image dependency', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sumer-png-'));
  const path = join(root, 'test.png');
  await writeFakePng(path, 1080, 1920);

  assert.deepEqual(await readPngDimensions(path), { width: 1080, height: 1920 });
});

test('missing planned required assets keep a shot on editorial fallback', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sumer-readiness-'));
  const source = join(root, 'project/reel/editorial-v1/shot-03.png');
  await writeFakePng(source, 1080, 1920);

  const report = await inspectAnimationAssetReadiness(manifest(), root);
  const shot = report.shots[0]!;

  assert.equal(shot.activationReady, false);
  assert.equal(shot.requiredApproved, 0);
  assert.equal(shot.requiredTotal, 2);
  assert.deepEqual(
    shot.layers.map((layer) => layer.readiness),
    ['missing', 'missing'],
  );
});

test('existing planned asset is present but cannot activate without approval', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sumer-readiness-'));
  const source = join(root, 'project/reel/editorial-v1/shot-03.png');
  const layer = join(root, 'project/reel/animation-v1/shot-03/background.png');
  await writeFakePng(source, 1080, 1920);
  await writeFakePng(layer, 1080, 1920);

  const report = await inspectAnimationAssetReadiness(manifest(), root);
  assert.equal(report.shots[0]!.layers[0]!.readiness, 'present-planned');
  assert.match(report.shots[0]!.layers[0]!.blockers.join('\n'), /manifest state is planned/);
});

test('wrong canvas dimensions block an otherwise approved layer', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sumer-readiness-'));
  const source = join(root, 'project/reel/editorial-v1/shot-03.png');
  const layer = join(root, 'project/reel/animation-v1/shot-03/background.png');
  await writeFakePng(source, 1080, 1920);
  await writeFakePng(layer, 900, 1600);
  const value = manifest();
  value.shots[0]!.layers[0]!.state = 'approved';
  value.shots[0]!.layers[0]!.review.status = 'approved';

  const report = await inspectAnimationAssetReadiness(value, root);
  const inspected = report.shots[0]!.layers[0]!;
  assert.equal(inspected.readiness, 'error');
  assert.equal(inspected.dimensionsMatch, false);
  assert.match(inspected.blockers.join('\n'), /do not match source 1080x1920/);
});

test('prepare creates directories and a plan but never creates image placeholders', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sumer-prepare-'));
  const source = join(root, 'project/reel/editorial-v1/shot-03.png');
  const output = join(root, 'tmp/prep-plan.json');
  await writeFakePng(source, 1080, 1920);

  const plan = await prepareAnimationAssetWorkspace(manifest(), {
    assetRoot: root,
    outputPath: output,
    shotNumber: 3,
  });

  assert.equal(plan.shots.length, 1);
  assert.deepEqual(plan.shots[0]!.sourceDimensions, { width: 1080, height: 1920 });
  const background = join(root, 'project/reel/animation-v1/shot-03/background.png');
  await access(dirname(background));
  await assert.rejects(access(background));
  const serialized = JSON.parse(await readFile(output, 'utf8')) as {
    shots: Array<{ sourceDimensions?: { width: number; height: number } }>;
  };
  assert.deepEqual(serialized.shots[0]?.sourceDimensions, {
    width: 1080,
    height: 1920,
  });
});

async function writeFakePng(
  path: string,
  width: number,
  height: number,
): Promise<void> {
  const buffer = Buffer.alloc(24);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  await import('node:fs/promises').then(({ mkdir }) => mkdir(dirname(path), { recursive: true }));
  await writeFile(path, buffer);
}
