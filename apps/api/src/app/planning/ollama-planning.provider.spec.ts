import { OllamaPlanningProvider } from './ollama-planning.provider';
import type { OllamaLocalAiProvider } from '../local-ai/ollama-local-ai.provider';

describe('OllamaPlanningProvider', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('delegates managed inference to the local AI adapter and preserves approved rules', async () => {
    process.env.OLLAMA_TEXT_MODEL = 'qwen3:8b';
    const localAi = {
      chat: jest.fn().mockResolvedValue({
        provider: 'ollama',
        model: 'qwen3:8b',
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
      }),
      getCapability: jest.fn(),
      listModels: jest.fn(),
    } as unknown as OllamaLocalAiProvider;

    const provider = new OllamaPlanningProvider(localAi);
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

    expect(localAi.chat).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'api-ollama-planning',
        task: 'shot-plan-proposal-enki-at-the-helm',
        model: 'qwen3:8b',
        messages: [{ role: 'system', content: expect.any(String) }, { role: 'user', content: expect.any(String) }],
        options: { temperature: 0.2 },
      }),
    );
    expect(proposal.inheritedStyleRules).toEqual([
      'character-closeup.camera.maxPushPercent = 3',
    ]);
  });

  it('reports adapter failures as planning unavailability', async () => {
    process.env.OLLAMA_TEXT_MODEL = 'qwen3:8b';
    const localAi = {
      chat: jest.fn().mockRejectedValue(new Error('lease unavailable')),
      getCapability: jest.fn(),
      listModels: jest.fn(),
    } as unknown as OllamaLocalAiProvider;

    const provider = new OllamaPlanningProvider(localAi);
    await expect(
      provider.proposeShotPlan({
        shotId: 'enki-at-the-helm',
        storyFunction: 'Establish Enki as the visual anchor.',
        emotionalPurpose: 'calm authority',
        styleRules: [],
        constraints: [],
        availableAssets: [],
      }),
    ).rejects.toThrow(/Ollama shot planning failed: lease unavailable/);
  });
});
