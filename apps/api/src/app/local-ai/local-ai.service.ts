import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  LocalAiModelDescriptor,
  LocalAiProvider,
  LocalAiProviderCapability,
  LocalAiProviderId,
} from './local-ai.provider';
import { OllamaLocalAiProvider } from './ollama-local-ai.provider';

@Injectable()
export class LocalAiService {
  private readonly providers: Map<LocalAiProviderId, LocalAiProvider>;

  constructor(private readonly ollama: OllamaLocalAiProvider) {
    this.providers = new Map([[ollama.id, ollama]]);
  }

  async listProviders(): Promise<LocalAiProviderCapability[]> {
    return await Promise.all(
      [...this.providers.values()].map((provider) => provider.getCapability()),
    );
  }

  async listModels(providerId?: LocalAiProviderId): Promise<LocalAiModelDescriptor[]> {
    if (providerId) {
      return await this.getProvider(providerId).listModels();
    }
    const groups = await Promise.all(
      [...this.providers.values()].map(async (provider) => {
        try {
          return await provider.listModels();
        } catch {
          return [];
        }
      }),
    );
    return groups.flat();
  }

  getProvider(providerId: LocalAiProviderId): LocalAiProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new NotFoundException(`Local AI provider '${providerId}' is not registered.`);
    }
    return provider;
  }
}
