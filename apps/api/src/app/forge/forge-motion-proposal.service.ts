import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { access, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import {
  AnimationProductionStatusService,
  type AnimationProductionShotStatus,
  type AnimationProductionStatus,
} from '../animation-production-status.service';
import type { LocalAiProviderId } from '../local-ai/local-ai.provider';
import { LocalAiService } from '../local-ai/local-ai.service';
import {
  FORGE_LOCAL_AI_PROVIDERS,
  type AcceptForgeMotionProposalDto,
  type CreateForgeMotionProposalDto,
} from './forge-motion-proposal.dto';

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
  canonicalFingerprint: string;
  summary: string;
  parameters: ForgeMotionProposalParameter[];
  guardrails: string[];
}

export interface AcceptedForgeMotionProposal {
  schemaVersion: 1;
  id: string;
  state: 'accepted-for-review';
  acceptedAt: string;
  evidencePath: string;
  proposal: ForgeMotionProposal;
  humanDirection: string | null;
  workingParameters: Array<{
    id: string;
    label: string;
    value: number;
    minimum: 0;
    maximum: 1;
  }>;
  canonical: {
    fingerprint: string;
    observedAt: string;
    proposalObservedAt: string;
  };
  review: {
    deterministicQa: 'pending';
    humanReview: 'required';
    promotion: 'not-requested';
  };
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
      canonicalFingerprint: fingerprintCanonicalShot(production, shot),
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
        'Proposal generation is ephemeral; no database or filesystem write occurs until explicit human acceptance for review.',
        'Apply changes React working state only; canonical production state is unchanged.',
        'No proposal may promote or mutate animation-v1.',
        'Human cinematic acceptance remains authoritative.',
      ],
    };
  }

  async acceptForReview(
    dto: AcceptForgeMotionProposalDto,
  ): Promise<AcceptedForgeMotionProposal> {
    const proposal = normalizeProposal(dto.proposal);
    const channels = MOTION_CHANNELS[proposal.shot];
    const workingParameters = normalizeWorkingParameters(
      dto.workingParameters,
      channels,
    );

    const production = await this.productionStatus.getStatus();
    const shot = production.shots.find(
      (candidate) => candidate.sourceShotNumber === proposal.shot,
    );
    if (!shot || shot.shotId !== proposal.shotId) {
      throw new ConflictException(
        `Shot ${proposal.shot} canonical identity changed since the proposal was created. Request a fresh proposal before accepting it for review.`,
      );
    }

    const currentFingerprint = fingerprintCanonicalShot(production, shot);
    if (currentFingerprint !== proposal.canonicalFingerprint) {
      throw new ConflictException(
        `Shot ${proposal.shot} canonical production state changed since the proposal was created. Request a fresh proposal before accepting it for review.`,
      );
    }

    const root = await findWorkspaceRoot(process.cwd());
    const evidenceRoot = resolve(root, 'tmp', 'forge-proposals');
    const acceptedAt = new Date().toISOString();
    const id = randomUUID();
    const filename = `shot-${proposal.shot}-${acceptedAt.replace(/[:.]/g, '-')}-${id}.json`;
    const evidencePath = resolve(evidenceRoot, filename);
    assertInside(evidenceRoot, evidencePath, 'Forge proposal evidence');

    const record: Omit<AcceptedForgeMotionProposal, 'evidencePath'> = {
      schemaVersion: 1,
      id,
      state: 'accepted-for-review',
      acceptedAt,
      proposal,
      humanDirection: dto.direction?.trim() || null,
      workingParameters,
      canonical: {
        fingerprint: currentFingerprint,
        observedAt: production.observedAt,
        proposalObservedAt: proposal.canonicalObservedAt,
      },
      review: {
        deterministicQa: 'pending',
        humanReview: 'required',
        promotion: 'not-requested',
      },
      guardrails: [
        'This file is non-canonical review evidence under tmp/forge-proposals/.',
        'Persistence does not alter animation-v1, manifests, assets, approvals, or production jobs.',
        'Deterministic QA and explicit human review remain required before any existing promotion authority may be invoked.',
      ],
    };

    await mkdir(evidenceRoot, { recursive: true });
    const temporaryPath = `${evidencePath}.${randomUUID()}.tmp`;
    try {
      await writeFile(
        temporaryPath,
        `${JSON.stringify(record, null, 2)}\n`,
        { encoding: 'utf8', flag: 'wx' },
      );
      await rename(temporaryPath, evidencePath);
    } finally {
      await rm(temporaryPath, { force: true }).catch(() => undefined);
    }

    return {
      ...record,
      evidencePath: relative(root, evidencePath).replace(/\\/g, '/'),
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

function normalizeProposal(value: unknown): ForgeMotionProposal {
  if (!isRecord(value)) {
    throw new BadRequestException('Forge proposal must be an object.');
  }
  if (value.schemaVersion !== 1 || value.state !== 'proposal') {
    throw new BadRequestException('Forge proposal schema/state is invalid.');
  }
  const shot = value.shot;
  if (shot !== 3 && shot !== 4) {
    throw new BadRequestException('Forge proposal shot must be 3 or 4.');
  }
  const id = requiredString(value.id, 'proposal id');
  const shotId = requiredString(value.shotId, 'proposal shotId');
  const providerValue = requiredString(value.provider, 'proposal provider');
  if (!FORGE_LOCAL_AI_PROVIDERS.includes(providerValue as LocalAiProviderId)) {
    throw new BadRequestException(`Unknown Forge proposal provider '${providerValue}'.`);
  }
  const provider = providerValue as LocalAiProviderId;
  const model = requiredString(value.model, 'proposal model');
  const createdAt = requiredString(value.createdAt, 'proposal createdAt');
  const canonicalObservedAt = requiredString(
    value.canonicalObservedAt,
    'proposal canonicalObservedAt',
  );
  const canonicalFingerprint = requiredString(
    value.canonicalFingerprint,
    'proposal canonicalFingerprint',
  ).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(canonicalFingerprint)) {
    throw new BadRequestException(
      'Forge proposal canonicalFingerprint must be a SHA-256 hex digest.',
    );
  }
  const summary = requiredString(value.summary, 'proposal summary');
  if (!Array.isArray(value.parameters)) {
    throw new BadRequestException('Forge proposal parameters must be an array.');
  }

  const channels = MOTION_CHANNELS[shot];
  const byId = new Map<string, Record<string, unknown>>();
  for (const raw of value.parameters) {
    if (!isRecord(raw)) {
      throw new BadRequestException('Forge proposal parameter entries must be objects.');
    }
    const parameterId = requiredString(raw.id, 'proposal parameter id');
    if (byId.has(parameterId)) {
      throw new BadRequestException(
        `Forge proposal contains duplicate parameter '${parameterId}'.`,
      );
    }
    byId.set(parameterId, raw);
  }
  if (byId.size !== channels.length) {
    throw new BadRequestException(
      `Forge proposal must contain exactly ${channels.length} bounded motion parameters for Shot ${shot}.`,
    );
  }

  const parameters = channels.map((channel) => {
    const raw = byId.get(channel.id);
    if (!raw) {
      throw new BadRequestException(
        `Forge proposal is missing allowed parameter '${channel.id}'.`,
      );
    }
    const parameterValue = strictUnitInterval(
      raw.value,
      `proposal parameter '${channel.id}'`,
    );
    return {
      id: channel.id,
      label: channel.label,
      value: parameterValue,
      minimum: 0 as const,
      maximum: 1 as const,
      rationale: stringValue(raw.rationale, channel.description),
    };
  });

  const unknownIds = [...byId.keys()].filter(
    (parameterId) => !channels.some((channel) => channel.id === parameterId),
  );
  if (unknownIds.length > 0) {
    throw new BadRequestException(
      `Forge proposal contains unknown motion channels: ${unknownIds.join(', ')}.`,
    );
  }

  return {
    schemaVersion: 1,
    id,
    state: 'proposal',
    shot,
    shotId,
    provider,
    model,
    createdAt,
    canonicalObservedAt,
    canonicalFingerprint,
    summary,
    parameters,
    guardrails: [
      'Proposal was schema-revalidated before persistence.',
      'No proposal may promote or mutate animation-v1.',
      'Human cinematic acceptance remains authoritative.',
    ],
  };
}

function normalizeWorkingParameters(
  value: Record<string, unknown>,
  channels: MotionChannelDefinition[],
): AcceptedForgeMotionProposal['workingParameters'] {
  const allowed = new Set(channels.map((channel) => channel.id));
  const keys = Object.keys(value);
  const unknown = keys.filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    throw new BadRequestException(
      `Working state contains unknown motion channels: ${unknown.join(', ')}.`,
    );
  }
  const missing = channels.filter((channel) => !(channel.id in value));
  if (missing.length > 0) {
    throw new BadRequestException(
      `Working state is missing motion channels: ${missing.map((channel) => channel.id).join(', ')}.`,
    );
  }
  return channels.map((channel) => ({
    id: channel.id,
    label: channel.label,
    value: strictUnitInterval(value[channel.id], `working parameter '${channel.id}'`),
    minimum: 0,
    maximum: 1,
  }));
}

function fingerprintCanonicalShot(
  production: AnimationProductionStatus,
  shot: AnimationProductionShotStatus,
): string {
  const payload = {
    manifestId: production.manifestId ?? null,
    projectSlug: production.projectSlug ?? null,
    chapterNumber: production.chapterNumber ?? null,
    episodeNumber: production.episodeNumber ?? null,
    assetVersion: production.assetVersion ?? null,
    sourceEditorialVersion: production.sourceEditorialVersion ?? null,
    laneRegistryId: production.laneRegistryId ?? null,
    styleDecisionLibraryId: production.styleDecisionLibraryId ?? null,
    shot,
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function numberValue(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function strictUnitInterval(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new BadRequestException(`${label} must be a finite number from 0 through 1.`);
  }
  return value;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function findWorkspaceRoot(startPath: string): Promise<string> {
  let current = resolve(startPath);
  while (true) {
    if (
      (await pathExists(resolve(current, 'package.json'))) &&
      (await pathExists(resolve(current, 'assets'))) &&
      (await pathExists(resolve(current, 'tools')))
    ) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      throw new Error(
        `Unable to locate the Sumer Reel Forge workspace root from ${startPath}.`,
      );
    }
    current = parent;
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function assertInside(parent: string, child: string, label: string): void {
  const path = relative(resolve(parent), resolve(child));
  if (path.startsWith('..') || isAbsolute(path)) {
    throw new Error(`${label} must remain under ${parent}: ${child}`);
  }
}
