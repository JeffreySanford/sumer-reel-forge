import { Injectable } from '@nestjs/common';
import type {
  PlanningProvider,
  PlanningProviderCapability,
  ShotPlanProposal,
  ShotPlanningInput,
} from './planning-provider';

@Injectable()
export class DeterministicPlanningProvider implements PlanningProvider {
  readonly id = 'deterministic' as const;

  async getCapability(): Promise<PlanningProviderCapability> {
    return {
      id: this.id,
      available: true,
      text: true,
      vision: false,
      structuredOutput: true,
      detail: 'Template and approved-style-rule planning without an LLM.',
    };
  }

  async proposeShotPlan(input: ShotPlanningInput): Promise<ShotPlanProposal> {
    return {
      provider: this.id,
      shotId: input.shotId,
      status: 'scaffold',
      eyeTarget: input.eyeTarget ?? 'human-review-required',
      stillnessAnchor: input.stillnessAnchor ?? 'composition',
      camera: {
        preset: 'human-review-required',
        scaleFrom: 1,
        scaleTo: 1,
        easing: 'cinematicSlow',
      },
      motionBudget: {
        primary: 'human-review-required',
        subject: 'restrained-or-none',
        environment: [],
        lighting: 'restrained-or-none',
      },
      requiredAssets: [...input.availableAssets],
      inheritedStyleRules: [...input.styleRules],
      unresolvedQuestions: [
        'Choose the primary camera or subject movement.',
        'Confirm the minimum semantic layer set before rendering.',
      ],
      rationale:
        'Deterministic provider preserves the planning contract and inherited rules without inventing new art direction.',
    };
  }
}
