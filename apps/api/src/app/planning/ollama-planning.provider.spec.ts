import axios from 'axios';
import { EventEmitter } from 'node:events';
import * as childProcess from 'node:child_process';
import { OllamaPlanningProvider } from './ollama-planning.provider';

jest.mock('node:child_process', () => ({
  spawn: jest.fn(),
}));

describe('OllamaPlanningProvider', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('uses the managed Ollama bridge and preserves approved rules', async () => {
    process.env.OLLAMA_TEXT_MODEL = 'qwen3:8b';
    delete process.env.PLANNING_TIMEOUT_MS;
    delete process.env.OLLAMA_KEEP_ALIVE;

    const post = jest.spyOn(axios, 'post');
    const requests: unknown[] = [];
    const spawn = jest.mocked(childProcess.spawn);
    spawn.mockImplementation((_command, _args, _options) => {
        const child = new EventEmitter() as ReturnType<typeof childProcess.spawn>;
        const stdout = new EventEmitter();
        const stderr = new EventEmitter();
        Object.assign(child, {
          stdout,
          stderr,
          kill: jest.fn(),
          stdin: {
            end: (value: string) => {
              requests.push(JSON.parse(value));
              process.nextTick(() => {
                stdout.emit(
                  'data',
                  Buffer.from(
                    JSON.stringify({
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
                            environment: [
                              'multi-frequency water',
                              'restrained rigging',
                            ],
                            lighting: 'soft reflected water light',
                          },
                          requiredAssets: ['editorial-v1/shot-03.png'],
                          inheritedStyleRules: ['model attempted rewrite'],
                          unresolvedQuestions: [],
                          rationale: 'Keep the camera subordinate to Enki.',
                        }),
                      },
                    }),
                  ),
                );
                child.emit('close', 0, null);
              });
            },
          },
        });
        return child;
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

    expect(post).not.toHaveBeenCalled();
    expect(spawn).toHaveBeenCalledWith(
      process.execPath,
      [expect.stringMatching(/tools[\\/]scripts[\\/]managed-ollama-chat-bridge\.mjs$/)],
      expect.objectContaining({
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      }),
    );
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      owner: 'api-ollama-planning',
      task: 'shot-plan-proposal-enki-at-the-helm',
      model: 'qwen3:8b',
      keepAlive: '10m',
      messages: [
        { role: 'system' },
        { role: 'user' },
      ],
      options: { temperature: 0.2 },
    });
    expect(proposal.inheritedStyleRules).toEqual([
      'character-closeup.camera.maxPushPercent = 3',
    ]);
  });

  it('reports managed bridge failures as planning unavailability', async () => {
    process.env.OLLAMA_TEXT_MODEL = 'qwen3:8b';

    jest.mocked(childProcess.spawn).mockImplementation(() => {
      const child = new EventEmitter() as ReturnType<typeof childProcess.spawn>;
      const stdout = new EventEmitter();
      const stderr = new EventEmitter();
      Object.assign(child, {
        stdout,
        stderr,
        kill: jest.fn(),
        stdin: {
          end: () => {
            process.nextTick(() => {
              stderr.emit('data', Buffer.from('lease unavailable'));
              child.emit('close', 1, null);
            });
          },
        },
      });
      return child;
    });

    const provider = new OllamaPlanningProvider();
    await expect(
      provider.proposeShotPlan({
        shotId: 'enki-at-the-helm',
        storyFunction: 'Establish Enki as the visual anchor.',
        emotionalPurpose: 'calm authority',
        styleRules: [],
        constraints: [],
        availableAssets: [],
      }),
    ).rejects.toThrow(/Ollama shot planning failed: Managed Ollama bridge exited with code 1: lease unavailable/);
  });
});
