import { NotFoundException } from '@nestjs/common';
import type { LocalAiProvider } from './local-ai.provider';
import { LocalAiService } from './local-ai.service';

function provider(overrides: Partial<LocalAiProvider> = {}): LocalAiProvider {
  return {
    id: 'ollama',
    async getCapability() {
      return {
        id: 'ollama',
        available: true,
        baseUrl: 'http://localhost:11434',
        configuredModel: 'qwen3:8b',
        text: true,
        vision: false,
        structuredOutput: true,
        modelInventory: true,
        managedUnload: true,
        managedStartup: false,
        openAiCompatible: false,
      };
    },
    async listModels() {
      return [{ id: 'qwen3:8b', provider: 'ollama', configuredFor: ['text'] }];
    },
    async chat() {
      return { provider: 'ollama', model: 'qwen3:8b', content: '{}' };
    },
    ...overrides,
  };
}

describe('LocalAiService', () => {
  it('returns registered provider capabilities and model inventory', async () => {
    const service = new LocalAiService(provider() as never);

    await expect(service.listProviders()).resolves.toEqual([
      expect.objectContaining({ id: 'ollama', available: true, text: true }),
    ]);
    await expect(service.listModels()).resolves.toEqual([
      { id: 'qwen3:8b', provider: 'ollama', configuredFor: ['text'] },
    ]);
  });

  it('keeps aggregate model inventory resilient when one provider inventory call fails', async () => {
    const service = new LocalAiService(
      provider({
        async listModels() {
          throw new Error('inventory unavailable');
        },
      }) as never,
    );

    await expect(service.listModels()).resolves.toEqual([]);
  });

  it('rejects provider ids that are not registered', () => {
    const service = new LocalAiService(provider() as never);

    expect(() => service.getProvider('lmstudio')).toThrow(NotFoundException);
  });
});
