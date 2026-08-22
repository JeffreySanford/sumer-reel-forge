import { REEL_ONE } from '@sumer-reel-forge/reel-core';
import {
  buildDirectionChecks,
  buildShotPlanningRequest,
} from './direction-panel.component';
import type { ShotPlanProposal } from './direction-planning.types';

describe('DirectionPanel policy helpers', () => {
  it('builds the strict Reel 1 Shot 3 Enki request', () => {
    const request = buildShotPlanningRequest(REEL_ONE, REEL_ONE.shots[2], 2);

    expect(request.shotId).toBe('enki-at-the-helm');
    expect(request.eyeTarget).toBe('enki-face');
    expect(request.stillnessAnchor).toBe('enki-facial-identity');
    expect(request.styleRules).toContain(
      'character-closeup.camera.maxPushPercent = 3',
    );
    expect(request.styleRules).toContain('narratorOnly.lipSync = false');
    expect(request.availableAssets).toEqual([
      'assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-03.png',
    ]);
  });

  it('marks the first live Qwen3-style proposal for easing and motion review', () => {
    const request = buildShotPlanningRequest(REEL_ONE, REEL_ONE.shots[2], 2);
    const proposal: ShotPlanProposal = {
      eyeTarget: 'enki-face',
      stillnessAnchor: 'enki-facial-identity',
      camera: {
        preset: 'character-closeup',
        scaleFrom: 1,
        scaleTo: 1.02,
        easing: 'linear',
      },
      motionBudget: {
        primary: 'camera-tilt',
        subject: 'enki-shoulders',
        environment: ['water-multi-frequency', 'vessel-heavyPhysical'],
        lighting: 'natural-ambient',
      },
      requiredAssets: request.availableAssets ?? [],
      inheritedStyleRules: request.styleRules ?? [],
      unresolvedQuestions: [
        'Does the camera tilt align with the natural weight of the vessel?',
      ],
      rationale: 'Restrained direction.',
      provider: 'ollama',
      model: 'qwen3:8b',
      shotId: 'enki-at-the-helm',
      status: 'proposal',
    };

    const checks = buildDirectionChecks(proposal, request);

    expect(checks.find((check) => check.label === 'Camera policy')?.status).toBe(
      'pass',
    );
    expect(checks.find((check) => check.label === 'Camera easing')?.status).toBe(
      'review',
    );
    expect(
      checks.find((check) => check.label === 'Motion coherence')?.status,
    ).toBe('review');
    expect(
      checks.find((check) => check.label === 'Inherited style rules')?.status,
    ).toBe('pass');
  });

  it('fails Shot 3 proposals that exceed the stricter three percent camera rule', () => {
    const request = buildShotPlanningRequest(REEL_ONE, REEL_ONE.shots[2], 2);
    const proposal: ShotPlanProposal = {
      eyeTarget: 'enki-face',
      stillnessAnchor: 'enki-facial-identity',
      camera: {
        preset: 'character-closeup',
        scaleFrom: 1,
        scaleTo: 1.04,
        easing: 'cinematicSlow',
      },
      motionBudget: {
        primary: 'slow-push',
        subject: 'subtle-breathing',
        environment: ['water-multi-frequency'],
        lighting: 'natural-ambient',
      },
      requiredAssets: request.availableAssets ?? [],
      inheritedStyleRules: request.styleRules ?? [],
      unresolvedQuestions: [],
      rationale: 'A proposal that is too aggressive for the benchmark.',
      provider: 'ollama',
      model: 'qwen3:8b',
      shotId: 'enki-at-the-helm',
      status: 'proposal',
    };

    const checks = buildDirectionChecks(proposal, request);

    expect(checks.find((check) => check.label === 'Camera policy')?.status).toBe(
      'fail',
    );
  });
});
