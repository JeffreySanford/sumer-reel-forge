import { BadRequestException, Injectable } from '@nestjs/common';
import { DeterministicPlanningProvider } from './deterministic-planning.provider';
import { OllamaPlanningProvider } from './ollama-planning.provider';
import type { CreateShotPlanDto } from './planning.dto';
import type {
  PlanningProvider,
  PlanningProviderCapability,
  PlanningProviderId,
  ShotPlanProposal,
  ShotPlanningInput,
} from './planning-provider';

@Injectable()
export class PlanningService {
  constructor(
    private readonly deterministicProvider: DeterministicPlanningProvider,
    private readonly ollamaProvider: OllamaPlanningProvider,
  ) {}

  async getCapabilities(): Promise<{
    defaultProvider: PlanningProviderId;
    providers: PlanningProviderCapability[];
  }> {
    return {
      defaultProvider: this.getDefaultProviderId(),
      providers: await Promise.all([
        this.deterministicProvider.getCapability(),
        this.ollamaProvider.getCapability(),
      ]),
    };
  }

  async proposeShotPlan(request: CreateShotPlanDto): Promise<ShotPlanProposal> {
    const providerId = request.provider ?? this.getDefaultProviderId();
    const provider = this.getProvider(providerId);
    const input: ShotPlanningInput = {
      shotId: request.shotId,
      storyFunction: request.storyFunction,
      emotionalPurpose: request.emotionalPurpose,
      narration: request.narration,
      eyeTarget: request.eyeTarget,
      stillnessAnchor: request.stillnessAnchor,
      styleRules: request.styleRules ?? [],
      constraints: request.constraints ?? [],
      availableAssets: request.availableAssets ?? [],
    };

    return provider.proposeShotPlan(input);
  }

  private getProvider(id: PlanningProviderId): PlanningProvider {
    if (id === 'deterministic') {
      return this.deterministicProvider;
    }
    if (id === 'ollama') {
      return this.ollamaProvider;
    }
    throw new BadRequestException(`Unsupported planning provider: ${id}`);
  }

  private getDefaultProviderId(): PlanningProviderId {
    const configured = process.env.PLANNING_PROVIDER ?? 'deterministic';
    if (configured === 'deterministic' || configured === 'ollama') {
      return configured;
    }
    return 'deterministic';
  }
}
