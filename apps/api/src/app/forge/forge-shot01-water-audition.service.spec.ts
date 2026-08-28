import { BadRequestException } from '@nestjs/common';
import {
  buildShot01WaterAuditionScene,
  normalizeShot01WaterParameters,
} from './forge-shot01-water-audition.service';

function sourceScene() {
  return {
    schemaVersion: 2,
    sceneId: 'chapter-01-reel-01-shot-01-level2-candidate-v1',
    assetManifestPath:
      'blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
    reviewPolicy: {
      humanApprovalRequired: true,
    },
    sourcePolicy: {
      storyMutationAllowed: false,
    },
    shots: [
      {
        id: 'black-water-before-dawn',
        sourceShotNumber: 1,
        layers: [
          {
            id: 'shot01-editorial-source-v1',
            assetPath:
              'blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-01.png',
            motionPresets: [],
          },
        ],
      },
    ],
  };
}

describe('ForgeShot01WaterAuditionService helpers', () => {
  it('accepts exactly four normalized source-safe water controls', () => {
    expect(
      normalizeShot01WaterParameters({
        horizontalCurrent: 0.34,
        verticalRipple: 0.22,
        flowSpeed: 0.38,
        rippleScale: 0.46,
      }),
    ).toEqual({
      horizontalCurrent: 0.34,
      verticalRipple: 0.22,
      flowSpeed: 0.38,
      rippleScale: 0.46,
    });
  });

  it('rejects unknown, missing, and out-of-range water controls', () => {
    expect(() =>
      normalizeShot01WaterParameters({
        horizontalCurrent: 0.34,
        verticalRipple: 0.22,
        flowSpeed: 0.38,
        rippleScale: 0.46,
        repaintWater: 1,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      normalizeShot01WaterParameters({
        horizontalCurrent: 0.34,
        verticalRipple: 0.22,
        flowSpeed: 1.2,
        rippleScale: 0.46,
      }),
    ).toThrow("parameter 'flowSpeed' must be a number from 0 through 1");
  });

  it('adds only the transient waterSurface envelope and preserves the source layer and manifest binding', () => {
    const source = sourceScene();
    const parameters = normalizeShot01WaterParameters({
      horizontalCurrent: 0.34,
      verticalRipple: 0.22,
      flowSpeed: 0.38,
      rippleScale: 0.46,
    });
    const result = buildShot01WaterAuditionScene(
      source,
      parameters,
      '11111111-1111-4111-8111-111111111111',
    );
    const shot = (result.shots as Array<Record<string, unknown>>)[0];

    expect(result.assetManifestPath).toBe(source.assetManifestPath);
    expect(result.sourcePolicy).toEqual(source.sourcePolicy);
    expect(result.reviewPolicy).toEqual(source.reviewPolicy);
    expect(shot.layers).toEqual(source.shots[0].layers);
    expect(shot.waterSurface).toEqual({ enabled: true, ...parameters });
    expect(result.sceneId).toContain('forge-water-audition');
    expect(source.shots[0]).not.toHaveProperty('waterSurface');
  });
});
