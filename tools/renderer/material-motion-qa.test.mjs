import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  evaluateMaterialDifferential,
  newestCompletePreviewDirectory,
  selectMaterialTargets,
} from '../scripts/verify-material-local-motion.mjs';

test('material-local QA selects only required candidate layers with recognized motion', () => {
  const scene = {
    shots: [
      {
        shotId: 'traveler-shrine-hospitality',
        layers: [
          {
            id: 'shot05-shrine-base-v1',
            role: 'background',
            material: 'architectural-background',
            motionPresets: [],
          },
          {
            id: 'shot05-welcome-water-v1',
            role: 'water',
            material: 'water',
            motionPresets: ['waterPulse'],
          },
          {
            id: 'shot05-smoke-v1',
            role: 'atmosphere',
            material: 'smoke',
            motionPresets: ['smokeDrift'],
          },
        ],
      },
    ],
  };

  const targets = selectMaterialTargets(scene, [
    'shot05-shrine-base-v1',
    'shot05-welcome-water-v1',
  ]);

  assert.deepEqual(targets, [
    {
      shotId: 'traveler-shrine-hospitality',
      layerId: 'shot05-welcome-water-v1',
      role: 'water',
      material: 'water',
      activePresets: ['waterPulse'],
    },
  ]);
});

test('material-local QA requires repeatable contribution across review beats', () => {
  const thresholds = {
    minMeanDiff: 0.05,
    minChangedRatio: 0.001,
  };
  const comparisons = [
    { meanAbsoluteDifference: 0.01, changedPixelRatio: 0.0001 },
    { meanAbsoluteDifference: 0.14, changedPixelRatio: 0.003 },
    { meanAbsoluteDifference: 0.12, changedPixelRatio: 0.0025 },
    { meanAbsoluteDifference: 0.03, changedPixelRatio: 0.0004 },
    { meanAbsoluteDifference: 0.02, changedPixelRatio: 0.0002 },
  ];

  const result = evaluateMaterialDifferential(comparisons, thresholds);

  assert.equal(result.requiredPassingFrames, 2);
  assert.equal(result.passingFrames, 2);
  assert.equal(result.pass, true);
});

test('material-local QA does not accept a single transient beat as meaningful motion', () => {
  const result = evaluateMaterialDifferential(
    [
      { meanAbsoluteDifference: 0.01, changedPixelRatio: 0.0001 },
      { meanAbsoluteDifference: 0.14, changedPixelRatio: 0.003 },
      { meanAbsoluteDifference: 0.02, changedPixelRatio: 0.0002 },
      { meanAbsoluteDifference: 0.03, changedPixelRatio: 0.0004 },
      { meanAbsoluteDifference: 0.02, changedPixelRatio: 0.0002 },
    ],
    { minMeanDiff: 0.05, minChangedRatio: 0.001 },
  );

  assert.equal(result.requiredPassingFrames, 2);
  assert.equal(result.passingFrames, 1);
  assert.equal(result.pass, false);
});

test('material-local QA skips a newer incomplete preview and selects the newest complete preview', () => {
  const root = mkdtempSync(join(tmpdir(), 'sumer-material-qa-preview-'));
  const complete = join(root, '2026-08-23T23-02-30-429Z');
  const incomplete = join(root, '2026-08-23T23-27-59-250Z');

  mkdirSync(join(complete, 'public'), { recursive: true });
  mkdirSync(incomplete, { recursive: true });
  writeFileSync(
    join(complete, 'preview-manifest.json'),
    JSON.stringify({ sourceShotNumber: 5 }),
    'utf8',
  );
  writeFileSync(
    join(complete, 'scene-v2-candidate-props.json'),
    JSON.stringify({ scene: { shots: [{ shotId: 'traveler-shrine-hospitality' }] } }),
    'utf8',
  );

  assert.equal(newestCompletePreviewDirectory(root, 5), complete);
});
