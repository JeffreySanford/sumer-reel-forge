import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import type {
  PlanningProvider,
  PlanningProviderCapability,
  ShotPlanProposal,
  ShotPlanningInput,
} from './planning-provider';

interface OllamaTagsResponse {
  models?: Array<{ name?: string; model?: string }>;
}

interface OllamaChatResponse {
  message?: { content?: string };
  model?: string;
}

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

  private readonly baseUrl = (
    process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
  ).replace(/\/$/, '');

  private readonly textModel = process.env.OLLAMA_TEXT_MODEL;
  private readonly visionModel = process.env.OLLAMA_VISION_MODEL;
  private readonly timeoutMs = positiveInteger(
    process.env.PLANNING_TIMEOUT_MS,
    45_000,
  );

  async getCapability(): Promise<PlanningProviderCapability> {
    try {
      const response = await axios.get<OllamaTagsResponse>(
        `${this.baseUrl}/api/tags`,
        { timeout: Math.min(this.timeoutMs, 5_000) },
      );
      const models = (response.data.models ?? [])
        .map((model) => model.name ?? model.model)
        .filter((name): name is string => Boolean(name));

      return {
        id: this.id,
        available: true,
        configuredModel: this.textModel,
        models,
        text: Boolean(this.textModel),
        vision: Boolean(this.visionModel),
        structuredOutput: true,
        detail: this.textModel
          ? 'Local Ollama is reachable and a text planning model is configured.'
          : 'Local Ollama is reachable. Set OLLAMA_TEXT_MODEL to enable AI planning.',
      };
    } catch (error) {
      return {
        id: this.id,
        available: false,
        configuredModel: this.textModel,
        text: false,
        vision: false,
        structuredOutput: true,
        detail: `Ollama is not reachable at ${this.baseUrl}: ${errorMessage(error)}`,
      };
    }
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
      'Treat inherited style rules as constraints unless the input explicitly identifies a conflict.',
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
      const response = await axios.post<OllamaChatResponse>(
        `${this.baseUrl}/api/chat`,
        {
          model: this.textModel,
          stream: false,
          format: SHOT_PLAN_SCHEMA,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          options: { temperature: 0.2 },
        },
        { timeout: this.timeoutMs },
      );

      const content = response.data.message?.content;
      if (!content) {
        throw new Error('Ollama returned no structured message content.');
      }

      const parsed = JSON.parse(content) as unknown;
      assertShotPlanShape(parsed);

      return {
        ...parsed,
        provider: this.id,
        model: response.data.model ?? this.textModel,
        shotId: input.shotId,
        status: 'proposal',
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
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
  if (!isRecord(value)) {
    throw new Error('Structured response is not an object.');
  }
  if (
    !isNonEmptyString(value.eyeTarget) ||
    !isNonEmptyString(value.stillnessAnchor) ||
    !isRecord(value.camera) ||
    !isNonEmptyString(value.camera.preset) ||
    typeof value.camera.scaleFrom !== 'number' ||
    typeof value.camera.scaleTo !== 'number' ||
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
