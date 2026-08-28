import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AnimationProductionStatusService } from '../animation-production-status.service';
import type { LocalAiProviderId } from '../local-ai/local-ai.provider';
import { LocalAiService } from '../local-ai/local-ai.service';
import type { CreateForgeMotionProposalDto } from './forge-motion-proposal.dto';

interface MotionChannelDefinition {
  id: string;
  label: string;
  description: string;
}

const MOTION_CHANNELS: Record<3 | 4, MotionChannelDefinition[]> = {
  3: [
    {
      id: 'vesselHeave',
      label: 'Vessel heave',
      description: 'Low-frequency vertical vessel inertia. Restrained and heavy.',
    },
    {
      id: 'vesselRoll',
      label: 'Vessel roll',
      description: 'Low-amplitude rigid roll. Never elastic or puppet-like.',
    },
    {
      id: 'enkiCounterSway',
      label: 'Enki counter-sway',
      description: 'Small planted-body compensation layered over vessel inertia.',
    },
    {
      id: 'cameraPush',
      label: 'Camera push',
      description: 'Restrained cinematic push without changing editorial composition.',
    },
  ],
  4: [
    {
      id: 'waterPulse',
      label: 'Water pulse',
      description: 'Material-internal underwater current/refraction motion.',
    },
    {
      id: 'refractionStrength',
      label: 'Refraction strength',
      description: 'Subtle source-supported refraction intensity.',
    },
    {
      id: 'numinousDrift',
      label: 'Numinous drift',
      description: 'Environmental coherence drift; never a literal character fade.',
    },
    {
      id: 'cameraDrift',
      label: 'Camera drift',
      description: 'Near-static camera movement that keeps the reveal environmental.',
    },
  ],
};

export interface ForgeMotionProposalParameter {
  id: string;
  label: string;
  value: number;
  minimum: 0;
  maximum: 1;
  rationale: string;
}

export interface ForgeMotionProposal {
  schemaVersion: 1;
  id: string;
  state: 'proposal';
  shot: 3 | 4;
  shotId: string;
  provider: LocalAiProviderId;
  model: string;
  createdAt: string;
  canonicalObservedAt: string;
  summary: string;
  parameters: ForgeMotionProposalParameter[];
  guardrails: string[];
}

@Injectable()
export class ForgeMotionProposalService {
  constructor(
    private readonly localAi: LocalAiService,
    private readonly productionStatus: AnimationProductionStatusService,
  ) {}

  async propose(dto: CreateForgeMotionProposalDto): Promise<ForgeMotionProposal> {
    const providerId = dto.provider ?? 'ollama';
    const provider = this.localAi.getProvider(providerId);
    const capability = await provider.getCapability();
    if (!capability.available || !capability.text) {
      throw new ServiceUnavailableException(
        `Local AI provider '${providerId}' is not available for text inference.`,
      );
    }
    if (!capability.structuredOutput) {
      throw new BadRequestException(
        `Local AI provider '${providerId}' does not advertise structured output.`,
      );
    }

    const model = dto.model ?? capability.configuredModel;
    if (!model) {
      throw new BadRequestException(
        `No text model is configured for local AI provider '${providerId}'.`,
      );
    }

    const production = await this.productionStatus.getStatus();
    const shot = production.shots.find(
      (candidate) => candidate.sourceShotNumber === dto.shot,
    );
    if (!shot) {
      throw new BadRequestException(`Shot ${dto.shot} is not present in production status.`);
    }

    const channels = MOTION_CHANNELS[dto.shot];
    const response = await provider.chat({
      owner: 'react-forge-lab',
      task: `forge-motion-proposal-shot-${dto.shot}`,
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a motion-design advisor inside Sumer Reel Forge. Return only the requested JSON object. AI proposes; deterministic rules constrain; human review remains authoritative. Never propose file writes, asset promotion, canonical manifest mutation, new imagery, identity changes, or changes outside the supplied motion channels.',
        },
        {
          role: 'user',
          content: buildPrompt({
            shotNumber: dto.shot,
            shotId: shot.shotId,
            direction: dto.direction,
            channels,
            layers: shot.layers.map((layer) => ({
              id: layer.id,
              role: layer.role,
              material: layer.material,
              motionPresets: layer.motionPresets,
              required: layer.required,
              ready: layer.ready,
            })),
            decisions: shot.decisions.map((decision) => ({
              id: decision.id,
              state: decision.state,
              path: decision.path,
              value: decision.value,
              rationale: decision.rationale,
            })),
          }),
        },
      ],
      format: buildFormat(channels),
      options: { temperature: 0.2 },
      keepAlive: '0s',
      errorPrefix: `Forge motion proposal Shot ${dto.shot}`,
    });

    const parsed = parseProposal(response.content);
    return {
      schemaVersion: 1,
      id: randomUUID(),
      state: 'proposal',
      shot: dto.shot,
      shotId: shot.shotId,
      provider: response.provider,
      model: response.model,
      createdAt: new Date().toISOString(),
      canonicalObservedAt: production.observedAt,
      summary: stringValue(parsed.summary, 'Local AI motion proposal'),
      parameters: channels.map((channel) => ({
        id: channel.id,
        label: channel.label,
        value: clamp01(numberValue(parsed.parameters?.[channel.id])),
        minimum: 0,
        maximum: 1,
        rationale: stringValue(
          parsed.rationale?.[channel.id],
          channel.description,
        ),
      })),
      guardrails: [
        'Proposal is ephemeral API output; no database or filesystem write occurs.',
        'Apply changes React working state only; canonical production state is unchanged.',
        'No proposal may promote or mutate animation-v1.',
        'Human cinematic acceptance remains authoritative.',
      ],
    };
  }
}

function buildPrompt(input: {
  shotNumber: 3 | 4;
  shotId: string;
  direction?: string;
  channels: MotionChannelDefinition[];
  layers: unknown[];
  decisions: unknown[];
}): string {
  return JSON.stringify(
    {
      task: 'Propose normalized motion strengths for an existing approved shot.',
      shot: input.shotNumber,
      shotId: input.shotId,
      humanDirection: input.direction ?? 'Preserve the current approved cinematic intent.',
      allowedChannels: input.channels,
      canonicalLayers: input.layers,
      inheritedDecisions: input.decisions,
      outputRules: [
        'Every parameter value must be a number from 0 through 1.',
        'Use only allowed channel ids.',
        'Keep motion restrained, source-grounded, and physically coherent.',
        'Do not propose edits to assets, manifests, approvals, identities, or source pixels.',
      ],
    },
    null,
    2,
  );
}

function buildFormat(channels: MotionChannelDefinition[]) {
  const numericProperties = Object.fromEntries(
    channels.map((channel) => [
      channel.id,
      { type: 'number', minimum: 0, maximum: 1 },
    ]),
  );
  const rationaleProperties = Object.fromEntries(
    channels.map((channel) => [channel.id, { type: 'string' }]),
  );
  const required = channels.map((channel) => channel.id);
  return {
    type: 'object',
    additionalProperties: false,
    required: ['summary', 'parameters', 'rationale'],
    properties: {
      summary: { type: 'string' },
      parameters: {
        type: 'object',
        additionalProperties: false,
        required,
        properties: numericProperties,
      },
      rationale: {
        type: 'object',
        additionalProperties: false,
        required,
        properties: rationaleProperties,
      },
    },
  };
}

function parseProposal(content: string): {
  summary?: unknown;
  parameters?: Record<string, unknown>;
  rationale?: Record<string, unknown>;
} {
  const trimmed = content.trim();
  const candidate = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    : trimmed;
  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('proposal JSON must be an object');
    }
    return parsed as {
      summary?: unknown;
      parameters?: Record<string, unknown>;
      rationale?: Record<string, unknown>;
    };
  } catch (error) {
    throw new BadRequestException(
      `Local AI returned invalid Forge proposal JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function numberValue(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
