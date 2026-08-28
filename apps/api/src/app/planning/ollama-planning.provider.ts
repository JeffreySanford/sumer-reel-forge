import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  PlanningProvider,
  PlanningProviderCapability,
  ShotPlanProposal,
  ShotPlanningInput,
} from './planning-provider';
import { OllamaLocalAiProvider } from '../local-ai/ollama-local-ai.provider';

const MAX_DEFAULT_CAMERA_SCALE_DELTA = 0.05;

const SHOT_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'eyeTarget',
    'stillnessAnchor',
    'camera',
    'motionBudget',
    'requiredAssets',
    'inheritedStyleRules',
    'unresolvedQuestions',
    'rationale',
  ],
  properties: {
    eyeTarget: { type: 'string' },
    stillnessAnchor: { type: 'string' },
    camera: {
      type: 'object',
      additionalProperties: false,
      required: ['preset', 'scaleFrom', 'scaleTo', 'easing'],
      properties: {
        preset: { type: 'string' },
        scaleFrom: { type: 'number' },
        scaleTo: { type: 'number' },
        easing: { type: 'string' },
      },
    },
    motionBudget: {
      type: 'object',
      additionalProperties: false,
      required: ['primary', 'subject', 'environment', 'lighting'],
      properties: {
        primary: { type: 'string' },
        subject: { type: 'string' },
        environment: { type: 'array', items: { type: 'string' } },
        lighting: { type: 'string' },
      },
    },
    requiredAssets: { type: 'array', items: { type: 'string' } },
    inheritedStyleRules: { type: 'array', items: { type: 'string' } },
    unresolvedQuestions: { type: 'array', items: { type: 'string' } },
    rationale: { type: 'string' },
  },
} as const;

@Injectable()
export class OllamaPlanningProvider implements PlanningProvider {
  readonly id = 'ollama' as const;
  private readonly textModel = process.env.OLLAMA_TEXT_MODEL;

  constructor(private readonly localAi: OllamaLocalAiProvider) {}

  async getCapability(): Promise<PlanningProviderCapability> {
    const capability = await this.localAi.getCapability();
    let models: string[] | undefined;
    if (capability.available && capability.modelInventory) {
      try {
        models = (await this.localAi.listModels()).map((model) => model.id);
      } catch {
        models = undefined;
      }
    }
    return {
      id: this.id,
      available: capability.available,
      configuredModel: capability.configuredModel,
      configuredVisionModel: capability.configuredVisionModel,
      models,
      text: capability.text,
      vision: capability.vision,
      structuredOutput: capability.structuredOutput,
      detail: capability.detail,
    };
  }

  async proposeShotPlan(input: ShotPlanningInput): Promise<ShotPlanProposal> {
    if (!this.textModel) {
      throw new ServiceUnavailableException(
        'OLLAMA_TEXT_MODEL is required when the Ollama planning provider is selected.',
      );
    }

    const system = [
      'You are the local assistant director for Sumer Reel Forge.',
      'Return only data that conforms to the supplied JSON schema.',
      'The human remains the director and final approver.',
      'Do not rewrite source narration.',
      'Prefer restrained cinematic illustrated motion over spectacle.',
      'Use the fewest motion channels and assets needed to make the shot feel authored.',
      'Physical materials obey weight and inertia; supernatural motion may carefully depart from those rules.',
      'Treat inherited style rules as immutable constraints unless the input explicitly identifies a conflict for human review.',
    ].join(' ');

    const user = JSON.stringify(
      {
        task: 'Propose one shot direction package.',
        shot: input,
        limits: {
          typicalCameraScaleChangePercent: '0-5',
          onePrimaryMotion: true,
          humanApprovalRequired: true,
        },
      },
      null,
      2,
    );

    try {
      const response = await this.localAi.chat({
        owner: 'api-ollama-planning',
        task: `shot-plan-proposal-${input.shotId}`,
        model: this.textModel,
        format: SHOT_PLAN_SCHEMA,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        options: { temperature: 0.2 },
        errorPrefix: 'Ollama shot planning',
      });

      const parsed = JSON.parse(response.content) as unknown;
      assertShotPlanShape(parsed);
      assertCameraScaleDelta(parsed.camera.scaleFrom, parsed.camera.scaleTo);

      return {
        ...parsed,
        inheritedStyleRules: [...input.styleRules],
        provider: this.id,
        model: response.model,
        shotId: input.shotId,
        status: 'proposal',
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(
        `Ollama shot planning failed: ${errorMessage(error)}`,
      );
    }
  }
}

function assertShotPlanShape(
  value: unknown,
): asserts value is Omit<
  ShotPlanProposal,
  'provider' | 'model' | 'shotId' | 'status'
> {
  if (!isRecord(value)) throw new Error('Structured response is not an object.');
  if (
    !isNonEmptyString(value.eyeTarget) ||
    !isNonEmptyString(value.stillnessAnchor) ||
    !isRecord(value.camera) ||
    !isNonEmptyString(value.camera.preset) ||
    !isFiniteNumber(value.camera.scaleFrom) ||
    !isFiniteNumber(value.camera.scaleTo) ||
    !isNonEmptyString(value.camera.easing) ||
    !isRecord(value.motionBudget) ||
    !isNonEmptyString(value.motionBudget.primary) ||
    !isNonEmptyString(value.motionBudget.subject) ||
    !isStringArray(value.motionBudget.environment) ||
    !isNonEmptyString(value.motionBudget.lighting) ||
    !isStringArray(value.requiredAssets) ||
    !isStringArray(value.inheritedStyleRules) ||
    !isStringArray(value.unresolvedQuestions) ||
    !isNonEmptyString(value.rationale)
  ) {
    throw new Error('Structured response failed shot-plan validation.');
  }
}

function assertCameraScaleDelta(scaleFrom: number, scaleTo: number): void {
  if (scaleFrom <= 0 || scaleTo <= 0) throw new Error('Camera scale values must be positive.');
  if (Math.abs(scaleTo - scaleFrom) > MAX_DEFAULT_CAMERA_SCALE_DELTA) {
    throw new Error(
      `Camera scale delta exceeds the default ${MAX_DEFAULT_CAMERA_SCALE_DELTA * 100}% planning guardrail.`,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
