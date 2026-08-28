import { ForgeMotionProposalService } from './forge-motion-proposal.service';

describe('ForgeMotionProposalService', () => {
  it('uses canonical shot context, clamps values, and drops unknown channels', async () => {
    const provider = {
      id: 'ollama' as const,
      getCapability: jest.fn().mockResolvedValue({
        id: 'ollama',
        available: true,
        text: true,
        structuredOutput: true,
        configuredModel: 'qwen3:8b',
      }),
      chat: jest.fn().mockResolvedValue({
        provider: 'ollama',
        model: 'qwen3:8b',
        content: JSON.stringify({
          summary: 'Keep the vessel heavy and Enki restrained.',
          parameters: {
            vesselHeave: 1.4,
            vesselRoll: -0.2,
            enkiCounterSway: 0.55,
            cameraPush: 0.25,
            forbiddenExtraMotion: 0.9,
          },
          rationale: {
            vesselHeave: 'Heavy low-frequency movement.',
            vesselRoll: 'Very small roll.',
            enkiCounterSway: 'Planted compensation.',
            cameraPush: 'Restrained emphasis.',
            forbiddenExtraMotion: 'Must be ignored.',
          },
        }),
      }),
    };
    const localAi = {
      getProvider: jest.fn().mockReturnValue(provider),
    };
    const productionStatus = {
      getStatus: jest.fn().mockResolvedValue({
        observedAt: '2026-08-28T19:00:00.000Z',
        shots: [
          {
            sourceShotNumber: 3,
            shotId: 'enki-at-the-helm',
            layers: [
              {
                id: 'shot03-enki-body-v1',
                role: 'character',
                material: 'cloth-heavy',
                motionPresets: ['breathing'],
                required: true,
                ready: true,
              },
            ],
            decisions: [
              {
                id: 'shot3-approved-stillness-anchor',
                state: 'approved',
                path: 'composition.stillnessAnchor',
                value: 'enki-facial-identity',
                rationale: 'Identity remains stable.',
              },
            ],
          },
        ],
      }),
    };

    const service = new ForgeMotionProposalService(
      localAi as never,
      productionStatus as never,
    );
    const result = await service.propose({ shot: 3 });

    expect(result.state).toBe('proposal');
    expect(result.provider).toBe('ollama');
    expect(result.model).toBe('qwen3:8b');
    expect(result.parameters.map((parameter) => parameter.id)).toEqual([
      'vesselHeave',
      'vesselRoll',
      'enkiCounterSway',
      'cameraPush',
    ]);
    expect(result.parameters.map((parameter) => parameter.value)).toEqual([
      1,
      0,
      0.55,
      0.25,
    ]);
    expect(JSON.stringify(result)).not.toContain('forbiddenExtraMotion');
    expect(result.guardrails).toContain(
      'No proposal may promote or mutate animation-v1.',
    );
    expect(provider.chat).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'react-forge-lab',
        task: 'forge-motion-proposal-shot-3',
        model: 'qwen3:8b',
        keepAlive: '0s',
      }),
    );
  });

  it('rejects providers that are unavailable for managed text inference', async () => {
    const localAi = {
      getProvider: jest.fn().mockReturnValue({
        getCapability: jest.fn().mockResolvedValue({
          id: 'ollama',
          available: false,
          text: false,
          structuredOutput: true,
        }),
      }),
    };
    const service = new ForgeMotionProposalService(
      localAi as never,
      { getStatus: jest.fn() } as never,
    );

    await expect(service.propose({ shot: 4 })).rejects.toThrow(
      "Local AI provider 'ollama' is not available for text inference.",
    );
  });
});
