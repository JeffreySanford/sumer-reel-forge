import axios from 'axios';

describe('POST /api/planning/shot-plan', () => {
  it('creates a deterministic human-review planning scaffold without Ollama', async () => {
    const res = await axios.post(`/api/planning/shot-plan`, {
      provider: 'deterministic',
      shotId: 'enki-at-the-helm',
      storyFunction: 'Establish Enki as the visual anchor of the voyage.',
      emotionalPurpose: 'calm authority',
      eyeTarget: 'enki-face',
      stillnessAnchor: 'enki-facial-identity',
      styleRules: [
        'character-closeup.camera.maxPushPercent = 3',
        'narratorOnly.lipSync = false',
      ],
      constraints: ['Use one primary movement.'],
      availableAssets: [
        'assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-03.png',
      ],
    });

    expect(res.status).toBe(201);
    expect(res.data).toMatchObject({
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
    expect(res.data.inheritedStyleRules).toContain(
      'character-closeup.camera.maxPushPercent = 3',
    );
  });
});
