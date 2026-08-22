import { DeterministicPlanningProvider } from './deterministic-planning.provider';

describe('DeterministicPlanningProvider', () => {
  const provider = new DeterministicPlanningProvider();

  it('preserves approved style rules without inventing art direction', async () => {
    const proposal = await provider.proposeShotPlan({
      shotId: 'enki-at-the-helm',
      storyFunction: 'Establish Enki as the visual anchor.',
      emotionalPurpose: 'calm authority',
      eyeTarget: 'enki-face',
      stillnessAnchor: 'enki-facial-identity',
      styleRules: ['character-closeup.camera.maxPushPercent = 3'],
      constraints: ['narratorOnly.lipSync = false'],
      availableAssets: ['editorial-v1/shot-03.png'],
    });

    expect(proposal).toMatchObject({
      provider: 'deterministic',
      shotId: 'enki-at-the-helm',
      status: 'scaffold',
      eyeTarget: 'enki-face',
      stillnessAnchor: 'enki-facial-identity',
      camera: {
        preset: 'human-review-required',
        scaleFrom: 1,
        scaleTo: 1,
      },
    });
    expect(proposal.inheritedStyleRules).toEqual([
      'character-closeup.camera.maxPushPercent = 3',
    ]);
    expect(proposal.requiredAssets).toEqual(['editorial-v1/shot-03.png']);
  });
});
