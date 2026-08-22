import axios from 'axios';
import { OllamaPlanningProvider } from './ollama-planning.provider';

describe('OllamaPlanningProvider', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('disables thinking, keeps the model warm, and preserves approved rules', async () => {
    process.env.OLLAMA_TEXT_MODEL = 'qwen3:8b';
    delete process.env.PLANNING_TIMEOUT_MS;
    delete process.env.OLLAMA_KEEP_ALIVE;

    const post = jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        model: 'qwen3:8b',
        message: {
          content: JSON.stringify({
            eyeTarget: 'enki-face',
            stillnessAnchor: 'enki-facial-identity',
            camera: {
              preset: 'slowPush',
              scaleFrom: 1,
              scaleTo: 1.025,
              easing: 'cinematicSlow',
            },
            motionBudget: {
              primary: 'slow camera push',
              subject: 'restrained breathing with one blink',
              environment: ['multi-frequency water', 'restrained rigging'],
              lighting: 'soft reflected water light',
            },
            requiredAssets: ['editorial-v1/shot-03.png'],
            inheritedStyleRules: ['model attempted rewrite'],
            unresolvedQuestions: [],
            rationale: 'Keep the camera subordinate to Enki.',
          }),
        },
      },
    });

    const provider = new OllamaPlanningProvider();
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

    expect(post).toHaveBeenCalledTimes(1);
    const [, body, config] = post.mock.calls[0];
    expect(body).toMatchObject({
      model: 'qwen3:8b',
      stream: false,
      think: false,
      keep_alive: '10m',
    });
    expect(config).toMatchObject({ timeout: 120_000 });
    expect(proposal.inheritedStyleRules).toEqual([
      'character-closeup.camera.maxPushPercent = 3',
    ]);
  });
});
