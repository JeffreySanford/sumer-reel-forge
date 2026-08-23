import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlanningRunStatus, Prisma, type PlanningRun } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { DeterministicPlanningProvider } from './deterministic-planning.provider';
import { OllamaPlanningProvider } from './ollama-planning.provider';
import type { CreateShotPlanDto } from './planning.dto';
import type {
  CreatePlanningRunDto,
  LatestPlanningRunQueryDto,
  ReviewPlanningRunDto,
  UpdatePlanningRunProposalDto,
} from './planning-run.dto';
import type { PlanningRunState, PlanningRunView } from './planning-run';
import type {
  PlanningProvider,
  PlanningProviderCapability,
  PlanningProviderId,
  ShotPlanProposal,
  ShotPlanningInput,
} from './planning-provider';

const PROMPT_VERSION = 'shot-plan-v1';

@Injectable()
export class PlanningService {
  constructor(
    private readonly deterministicProvider: DeterministicPlanningProvider,
    private readonly ollamaProvider: OllamaPlanningProvider,
    private readonly prisma: PrismaService,
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
    return provider.proposeShotPlan(toPlanningInput(request));
  }

  async createPlanningRun(request: CreatePlanningRunDto): Promise<PlanningRunView> {
    const reel = await this.findReel(request);
    const input = toPlanningInput(request);
    const providerId = request.provider ?? this.getDefaultProviderId();
    const provider = this.getProvider(providerId);
    const startedAt = Date.now();
    const proposal = await provider.proposeShotPlan(input);
    const durationMs = Date.now() - startedAt;
    assertProposalStructure(proposal);

    const inputHash = hashJson(input);
    const outputHash = hashJson(proposal);

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.planningRun.updateMany({
        where: {
          reelId: reel.id,
          shotNumber: request.shotNumber,
          status: PlanningRunStatus.PROPOSAL_READY,
        },
        data: { status: PlanningRunStatus.SUPERSEDED },
      });

      const created = await tx.planningRun.create({
        data: {
          reelId: reel.id,
          shotNumber: request.shotNumber,
          shotKey: input.shotId,
          provider: proposal.provider,
          model: proposal.model,
          promptVersion: PROMPT_VERSION,
          status: PlanningRunStatus.PROPOSAL_READY,
          inputHash,
          outputHash,
          workingHash: outputHash,
          input: toPrismaJson(input),
          proposal: toPrismaJson(proposal),
          workingProposal: toPrismaJson(proposal),
          durationMs,
        },
      });

      await tx.auditLog.create({
        data: {
          actor: 'local-api',
          action: 'planning.run.create',
          entityType: 'planning-run',
          entityId: created.id,
          summary: {
            reelId: reel.id,
            episodeNumber: request.episodeNumber,
            shotNumber: request.shotNumber,
            shotKey: input.shotId,
            provider: proposal.provider,
            model: proposal.model ?? null,
            promptVersion: PROMPT_VERSION,
            inputHash,
            outputHash,
            durationMs,
          },
        },
      });

      return created;
    });

    return toPlanningRunView(row);
  }

  async getLatestPlanningRun(
    query: LatestPlanningRunQueryDto,
  ): Promise<PlanningRunView | null> {
    const reel = await this.findReel(query);
    const row = await this.prisma.planningRun.findFirst({
      where: { reelId: reel.id, shotNumber: query.shotNumber },
      orderBy: { createdAt: 'desc' },
    });
    return row ? toPlanningRunView(row) : null;
  }

  async updatePlanningRunProposal(
    runId: string,
    request: UpdatePlanningRunProposalDto,
  ): Promise<PlanningRunView> {
    const current = await this.getPlanningRun(runId);
    assertRunEditable(current);
    assertProposalStructure(request.proposal);

    const original = parseProposal(current.proposal);
    const candidate: ShotPlanProposal = {
      ...request.proposal,
      provider: original.provider,
      model: original.model,
      shotId: current.shotKey,
      status: original.status,
      inheritedStyleRules: [...request.proposal.inheritedStyleRules],
    };
    const workingHash = hashJson(candidate);

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.planningRun.update({
        where: { id: runId },
        data: {
          workingProposal: toPrismaJson(candidate),
          workingHash,
        },
      });
      await tx.auditLog.create({
        data: {
          actor: 'local-api',
          action: 'planning.run.edit',
          entityType: 'planning-run',
          entityId: runId,
          summary: {
            shotKey: current.shotKey,
            originalOutputHash: current.outputHash,
            previousWorkingHash: current.workingHash,
            workingHash,
          },
        },
      });
      return updated;
    });

    return toPlanningRunView(row);
  }

  async reviewPlanningRun(
    runId: string,
    request: ReviewPlanningRunDto,
  ): Promise<PlanningRunView> {
    const current = await this.getPlanningRun(runId);
    assertRunEditable(current);
    const input = parseInput(current.input);
    const workingProposal = parseProposal(current.workingProposal);

    if (request.decision === 'approved') {
      assertProposalApprovable(workingProposal, input);
    }

    const reviewedAt = new Date();
    const reviewedBy = 'local-director';
    const status =
      request.decision === 'approved'
        ? PlanningRunStatus.APPROVED
        : PlanningRunStatus.REJECTED;

    const row = await this.prisma.$transaction(async (tx) => {
      if (status === PlanningRunStatus.APPROVED) {
        await tx.planningRun.updateMany({
          where: {
            reelId: current.reelId,
            shotNumber: current.shotNumber,
            status: PlanningRunStatus.APPROVED,
            id: { not: current.id },
          },
          data: { status: PlanningRunStatus.SUPERSEDED },
        });
      }

      const updated = await tx.planningRun.update({
        where: { id: runId },
        data: {
          status,
          reviewedAt,
          reviewedBy,
          reviewNotes: request.notes,
        },
      });
      await tx.auditLog.create({
        data: {
          actor: reviewedBy,
          action:
            status === PlanningRunStatus.APPROVED
              ? 'planning.run.approve'
              : 'planning.run.reject',
          entityType: 'planning-run',
          entityId: runId,
          summary: {
            shotKey: current.shotKey,
            shotNumber: current.shotNumber,
            inputHash: current.inputHash,
            outputHash: current.outputHash,
            workingHash: current.workingHash,
            notes: request.notes ?? null,
          },
        },
      });
      return updated;
    });

    return toPlanningRunView(row);
  }

  private async getPlanningRun(runId: string): Promise<PlanningRun> {
    const row = await this.prisma.planningRun.findUnique({ where: { id: runId } });
    if (!row) {
      throw new NotFoundException(`Planning run ${runId} was not found.`);
    }
    return row;
  }

  private async findReel(query: {
    projectSlug: string;
    chapterNumber: number;
    episodeNumber: number;
    shotNumber: number;
  }): Promise<{ id: string }> {
    const reel = await this.prisma.reel.findFirst({
      where: {
        episodeNumber: query.episodeNumber,
        chapter: {
          chapterNumber: query.chapterNumber,
          document: { project: { slug: query.projectSlug } },
        },
        shots: { some: { shotNumber: query.shotNumber } },
      },
      select: { id: true },
    });
    if (!reel) {
      throw new NotFoundException(
        `Shot ${query.shotNumber} was not found in ${query.projectSlug} chapter ${query.chapterNumber}, episode ${query.episodeNumber}.`,
      );
    }
    return reel;
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

function toPlanningInput(request: CreateShotPlanDto): ShotPlanningInput {
  return {
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
}

function assertRunEditable(run: PlanningRun): void {
  if (run.status !== PlanningRunStatus.PROPOSAL_READY) {
    throw new ConflictException(
      `Planning run ${run.id} is ${fromPrismaStatus(run.status)} and can no longer be edited or reviewed. Generate a new proposal instead.`,
    );
  }
}

function assertProposalApprovable(
  proposal: ShotPlanProposal,
  input: ShotPlanningInput,
): void {
  assertProposalStructure(proposal);
  if (proposal.shotId !== input.shotId) {
    throw new BadRequestException('Proposal shot identity does not match the planning input.');
  }

  const missingRules = input.styleRules.filter(
    (rule) => !proposal.inheritedStyleRules.includes(rule),
  );
  if (missingRules.length > 0) {
    throw new BadRequestException(
      `Proposal cannot be approved because ${missingRules.length} inherited style rule(s) are missing.`,
    );
  }

  const scaleFrom = proposal.camera.scaleFrom;
  const scaleTo = proposal.camera.scaleTo;
  if (scaleFrom <= 0 || scaleTo <= 0) {
    throw new BadRequestException('Camera scale values must be positive.');
  }
  const maxPushPercent = getMaxPushPercent(input.styleRules);
  const actualPushPercent = Math.abs(scaleTo - scaleFrom) * 100;
  if (actualPushPercent > maxPushPercent + Number.EPSILON) {
    throw new BadRequestException(
      `Proposal camera change ${actualPushPercent.toFixed(1)}% exceeds the approved ${maxPushPercent.toFixed(1)}% limit.`,
    );
  }
}

function assertProposalStructure(value: unknown): asserts value is ShotPlanProposal {
  if (!isRecord(value)) {
    throw new BadRequestException('Planning proposal must be an object.');
  }
  const camera = value['camera'];
  const motionBudget = value['motionBudget'];
  if (
    typeof value['shotId'] !== 'string' ||
    typeof value['provider'] !== 'string' ||
    (value['status'] !== 'proposal' && value['status'] !== 'scaffold') ||
    typeof value['eyeTarget'] !== 'string' ||
    typeof value['stillnessAnchor'] !== 'string' ||
    !isRecord(camera) ||
    typeof camera['preset'] !== 'string' ||
    typeof camera['scaleFrom'] !== 'number' ||
    !Number.isFinite(camera['scaleFrom']) ||
    typeof camera['scaleTo'] !== 'number' ||
    !Number.isFinite(camera['scaleTo']) ||
    typeof camera['easing'] !== 'string' ||
    !isRecord(motionBudget) ||
    typeof motionBudget['primary'] !== 'string' ||
    typeof motionBudget['subject'] !== 'string' ||
    !isStringArray(motionBudget['environment']) ||
    typeof motionBudget['lighting'] !== 'string' ||
    !isStringArray(value['requiredAssets']) ||
    !isStringArray(value['inheritedStyleRules']) ||
    !isStringArray(value['unresolvedQuestions']) ||
    typeof value['rationale'] !== 'string'
  ) {
    throw new BadRequestException('Planning proposal failed structural validation.');
  }
}

function getMaxPushPercent(styleRules: string[]): number {
  for (const rule of styleRules) {
    const match = rule.match(/maxPushPercent\s*=\s*(\d+(?:\.\d+)?)/i);
    if (match) {
      return Number(match[1]);
    }
  }
  return 5;
}

function toPlanningRunView(row: PlanningRun): PlanningRunView {
  return {
    id: row.id,
    reelId: row.reelId,
    shotNumber: row.shotNumber,
    shotKey: row.shotKey,
    provider: row.provider,
    model: row.model ?? undefined,
    promptVersion: row.promptVersion,
    status: fromPrismaStatus(row.status),
    inputHash: row.inputHash,
    outputHash: row.outputHash,
    workingHash: row.workingHash,
    input: parseInput(row.input),
    proposal: parseProposal(row.proposal),
    workingProposal: parseProposal(row.workingProposal),
    durationMs: row.durationMs ?? undefined,
    reviewedAt: row.reviewedAt?.toISOString(),
    reviewedBy: row.reviewedBy ?? undefined,
    reviewNotes: row.reviewNotes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function fromPrismaStatus(status: PlanningRunStatus): PlanningRunState {
  switch (status) {
    case PlanningRunStatus.APPROVED:
      return 'approved';
    case PlanningRunStatus.REJECTED:
      return 'rejected';
    case PlanningRunStatus.SUPERSEDED:
      return 'superseded';
    case PlanningRunStatus.FAILED:
      return 'failed';
    default:
      return 'proposal-ready';
  }
}

function parseInput(value: Prisma.JsonValue): ShotPlanningInput {
  return value as unknown as ShotPlanningInput;
}

function parseProposal(value: Prisma.JsonValue): ShotPlanProposal {
  assertProposalStructure(value);
  return value;
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function hashJson(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((key) => value[key] !== undefined)
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
