import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssetReviewStatus,
  ReelProductionStatus,
  RenderJobMode,
  RenderJobStatus,
  RenderLogLevel,
  RenderLogStream,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import {
  CHAPTER_ONE_REELS,
  CHAPTER_ONE_SUMMARY,
  type ChapterReelSummary,
  type CreateGeneratedAssetRequest,
  type CreateRenderJobLogRequest,
  type GeneratedAssetManifest,
  type ReelEpisode,
  type RenderJob,
  type RenderJobAttempt,
  type RenderJobLog,
  type UpdateGeneratedAssetReviewRequest,
} from '@sumer-reel-forge/reel-core';
import { PrismaService } from './prisma.service';
import {
  ClaimRenderJobDto,
  CreateRenderJobDto,
  UpdateRenderJobStatusDto,
} from './render-job.dto';
import { UpdateReelProductionDto } from './reel-production.dto';
import { UpdateReelStatusDto } from './reel-workflow.dto';

export const REEL_REPOSITORY = Symbol('REEL_REPOSITORY');

export interface ReelRepository {
  getChapterOneSummary(): Promise<ChapterReelSummary[]>;
  getEpisode(episodeId: number): Promise<ReelEpisode>;
  updateEpisodeProduction(
    episodeId: number,
    request: UpdateReelProductionDto,
    requestId?: string,
  ): Promise<ReelEpisode>;
  updateEpisodeStatus(
    episodeId: number,
    request: UpdateReelStatusDto,
    requestId?: string,
  ): Promise<ReelEpisode>;
  createRenderJob(
    request: CreateRenderJobDto,
    requestId?: string,
  ): Promise<RenderJob>;
  getRenderJobs(episodeId?: number): Promise<RenderJob[]>;
  getStaleRenderJobs(maxAgeSeconds: number): Promise<RenderJob[]>;
  markStaleRenderJobsFailed(
    maxAgeSeconds: number,
    requestId?: string,
  ): Promise<RenderJob[]>;
  claimNextRenderJob(
    request: ClaimRenderJobDto,
    requestId?: string,
  ): Promise<RenderJob | null>;
  updateRenderJobStatus(
    jobId: string,
    request: UpdateRenderJobStatusDto,
    requestId?: string,
  ): Promise<RenderJob>;
  createGeneratedAsset(
    request: CreateGeneratedAssetRequest,
    requestId?: string,
  ): Promise<GeneratedAssetManifest>;
  getGeneratedAssets(filters?: {
    renderJobId?: string;
    episodeId?: number;
  }): Promise<GeneratedAssetManifest[]>;
  getGeneratedAsset(assetId: string): Promise<GeneratedAssetManifest>;
  updateGeneratedAssetReview(
    assetId: string,
    request: UpdateGeneratedAssetReviewRequest,
    requestId?: string,
  ): Promise<GeneratedAssetManifest>;
  regenerateGeneratedAsset(
    assetId: string,
    notes?: string,
    requestId?: string,
  ): Promise<RenderJob>;
  createRenderJobLog(
    jobId: string,
    request: CreateRenderJobLogRequest,
  ): Promise<RenderJobLog>;
  getRenderJobLogs(jobId: string): Promise<RenderJobLog[]>;
  getRenderJobAttempts(jobId: string): Promise<RenderJobAttempt[]>;
  retryRenderJob(
    jobId: string,
    notes?: string,
    requestId?: string,
  ): Promise<RenderJob>;
}

@Injectable()
export class PrismaReelRepository implements ReelRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getChapterOneSummary(): Promise<ChapterReelSummary[]> {
    const rows = await this.prisma.reel.findMany({
      where: {
        chapter: {
          chapterNumber: 1,
          document: {
            project: {
              slug: 'blessings-of-sumer',
            },
          },
        },
      },
      orderBy: { episodeNumber: 'asc' },
    });

    if (rows.length === 0) {
      return CHAPTER_ONE_SUMMARY;
    }

    return rows.map((row) => ({
      episode: row.episodeNumber,
      title: row.title,
      sourceSection: row.sourceSection,
      hook: row.hook,
      visualCore: row.visualCore,
      productionStatus: fromPrismaProductionStatus(row.productionStatus),
    }));
  }

  async getEpisode(episodeId: number): Promise<ReelEpisode> {
    const row = await this.prisma.reel.findFirst({
      where: {
        episodeNumber: episodeId,
        chapter: {
          chapterNumber: 1,
          document: {
            project: {
              slug: 'blessings-of-sumer',
            },
          },
        },
      },
      include: {
        shots: {
          orderBy: { shotNumber: 'asc' },
        },
      },
    });

    if (!row) {
      const fixture = CHAPTER_ONE_REELS.find(
        (episode) => episode.episode === episodeId,
      );

      if (fixture) {
        return fixture;
      }

      throw new NotFoundException(
        `Episode ${episodeId} is not storyboarded yet.`,
      );
    }

    return {
      series: 'Blessings of Sumer',
      chapter: 1,
      episode: row.episodeNumber,
      title: row.title,
      targetDurationSeconds: row.targetDurationSeconds,
      sourceSection: row.sourceSection,
      hook: row.hook,
      visualCore: row.visualCore,
      logline: row.logline ?? '',
      narration: row.narration ?? '',
      onScreenText: this.parseJsonArray(row.onScreenText),
      shots: row.shots.map((shot) => ({
        time: shot.timecode,
        durationSeconds: shot.durationSeconds,
        visual: shot.visual,
        motion: shot.motion,
        prompt: shot.prompt,
      })),
      musicDirection: row.musicDirection ?? '',
      voiceDirection: row.voiceDirection ?? '',
      platformNotes: row.platformNotes,
      exportMetadata: toExportMetadata(row.exportMetadata),
      productionStatus: fromPrismaProductionStatus(row.productionStatus),
    };
  }

  async updateEpisodeProduction(
    episodeId: number,
    request: UpdateReelProductionDto,
    requestId?: string,
  ): Promise<ReelEpisode> {
    const reel = await this.findReelForEpisode(episodeId);

    await this.prisma.$transaction(async (tx) => {
      await tx.reel.update({
        where: { id: reel.id },
        data: {
          logline: request.logline,
          narration: request.narration,
          musicDirection: request.musicDirection,
          voiceDirection: request.voiceDirection,
          platformNotes: request.platformNotes,
          onScreenText: toPrismaJson(request.onScreenText),
          exportMetadata: toPrismaJson(request.exportMetadata),
          productionStatus: ReelProductionStatus.DRAFT,
        },
      });

      await tx.reelShot.deleteMany({
        where: { reelId: reel.id },
      });

      await tx.reelShot.createMany({
        data: request.shots.map((shot, index) => ({
          reelId: reel.id,
          shotNumber: index + 1,
          timecode: shot.time,
          durationSeconds: shot.durationSeconds,
          visual: shot.visual,
          motion: shot.motion,
          prompt: shot.prompt,
        })),
      });

      await tx.auditLog.create({
        data: {
          actor: 'local-api',
          action: 'reel.production.update',
          entityType: 'reel',
          entityId: reel.id,
          requestId,
          summary: {
            episodeId,
            shots: request.shots.length,
            captions: request.onScreenText.length,
            previousStatus: reel.productionStatus,
            status: ReelProductionStatus.DRAFT,
          },
        },
      });
    });

    return this.getEpisode(episodeId);
  }

  async updateEpisodeStatus(
    episodeId: number,
    request: UpdateReelStatusDto,
    requestId?: string,
  ): Promise<ReelEpisode> {
    const reel = await this.findReelForEpisode(episodeId);
    const current = fromPrismaProductionStatus(reel.productionStatus);

    if (!canTransitionProductionStatus(current, request.status)) {
      throw new ConflictException(
        `Reel status cannot transition from ${current} to ${request.status}.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.reel.update({
        where: { id: reel.id },
        data: { productionStatus: toPrismaProductionStatus(request.status) },
      });
      await tx.auditLog.create({
        data: {
          actor: 'local-api',
          action: 'reel.status.update',
          entityType: 'reel',
          entityId: reel.id,
          requestId,
          summary: {
            episodeId,
            from: current,
            to: request.status,
            notes: request.notes,
          },
        },
      });
    });

    return this.getEpisode(episodeId);
  }

  async createRenderJob(
    request: CreateRenderJobDto,
    requestId?: string,
  ): Promise<RenderJob> {
    const episode = await this.findReelForEpisode(request.episodeId);

    if (
      request.mode === 'final-video' &&
      episode.productionStatus !== ReelProductionStatus.APPROVED
    ) {
      throw new ConflictException(
        'Final-video rendering requires an approved production record.',
      );
    }

    const job = await this.prisma.$transaction(async (tx) => {
      const created = await tx.renderJob.create({
        data: {
          reelId: episode.id,
          episodeId: episode.episodeNumber,
          mode: toPrismaMode(request.mode),
          voice: request.voice,
          notes: request.notes,
        },
      });

      if (request.mode === 'final-video') {
        await tx.reel.update({
          where: { id: episode.id },
          data: { productionStatus: ReelProductionStatus.RENDERING },
        });
      }

      await tx.auditLog.create({
        data: {
          actor: 'local-api',
          action: 'render-job.create',
          entityType: 'render_job',
          entityId: created.id,
          requestId,
          summary: {
            episodeId: created.episodeId,
            mode: created.mode,
            status: created.status,
          },
        },
      });

      return created;
    });

    return toRenderJob(job);
  }

  async getRenderJobs(episodeId?: number): Promise<RenderJob[]> {
    const rows = await this.prisma.renderJob.findMany({
      where: episodeId ? { episodeId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return rows.map(toRenderJob);
  }

  async getStaleRenderJobs(maxAgeSeconds: number): Promise<RenderJob[]> {
    const staleBefore = new Date(Date.now() - maxAgeSeconds * 1000);
    const rows = await this.prisma.renderJob.findMany({
      where: {
        status: {
          in: [RenderJobStatus.QUEUED, RenderJobStatus.RUNNING],
        },
        OR: [
          {
            heartbeatAt: null,
            createdAt: { lt: staleBefore },
          },
          {
            heartbeatAt: { lt: staleBefore },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return rows.map(toRenderJob);
  }

  async markStaleRenderJobsFailed(
    maxAgeSeconds: number,
    requestId?: string,
  ): Promise<RenderJob[]> {
    const staleJobs = await this.getStaleRenderJobs(maxAgeSeconds);
    const staleIds = staleJobs.map((job) => job.id);

    if (staleIds.length === 0) {
      return [];
    }

    const now = new Date();
    const rows = await this.prisma.$transaction(async (tx) => {
      const staleRows = await tx.renderJob.findMany({
        where: { id: { in: staleIds } },
        select: { id: true, reelId: true, mode: true },
      });

      await tx.renderJob.updateMany({
        where: { id: { in: staleIds } },
        data: {
          status: RenderJobStatus.FAILED,
          finishedAt: now,
          notes: `Marked failed by stale-job watchdog after ${maxAgeSeconds}s.`,
        },
      });

      await tx.renderJobAttempt.updateMany({
        where: {
          renderJobId: { in: staleIds },
          status: RenderJobStatus.RUNNING,
        },
        data: {
          status: RenderJobStatus.FAILED,
          finishedAt: now,
          error: `Heartbeat stale for more than ${maxAgeSeconds}s.`,
        },
      });

      const finalReelIds = staleRows
        .filter((job) => job.mode === RenderJobMode.FINAL_VIDEO)
        .map((job) => job.reelId);
      if (finalReelIds.length > 0) {
        await tx.reel.updateMany({
          where: {
            id: { in: finalReelIds },
            productionStatus: ReelProductionStatus.RENDERING,
          },
          data: { productionStatus: ReelProductionStatus.APPROVED },
        });
      }

      await tx.auditLog.createMany({
        data: staleJobs.map((job) => ({
          actor: 'watchdog',
          action: 'render-job.watchdog.failed',
          entityType: 'render_job',
          entityId: job.id,
          requestId,
          summary: {
            maxAgeSeconds,
            previousStatus: job.status,
          },
        })),
      });

      return tx.renderJob.findMany({
        where: { id: { in: staleIds } },
        orderBy: { updatedAt: 'desc' },
      });
    });

    return rows.map(toRenderJob);
  }

  async claimNextRenderJob(
    request: ClaimRenderJobDto,
    requestId?: string,
  ): Promise<RenderJob | null> {
    const job = await this.prisma.$transaction(async (tx) => {
      const next = await tx.renderJob.findFirst({
        where: { status: RenderJobStatus.QUEUED },
        orderBy: { createdAt: 'asc' },
      });

      if (!next) {
        return null;
      }

      const now = new Date();
      const claimed = await tx.renderJob.updateMany({
        where: { id: next.id, status: RenderJobStatus.QUEUED },
        data: {
          status: RenderJobStatus.RUNNING,
          workerId: request.workerId,
          attemptCount: { increment: 1 },
          startedAt: now,
          heartbeatAt: now,
        },
      });

      if (claimed.count === 0) {
        return null;
      }

      const updated = await tx.renderJob.findUniqueOrThrow({
        where: { id: next.id },
      });
      await tx.renderJobAttempt.create({
        data: {
          renderJobId: updated.id,
          attemptNumber: updated.attemptCount,
          workerId: request.workerId,
          status: RenderJobStatus.RUNNING,
          heartbeatAt: now,
        },
      });
      await tx.auditLog.create({
        data: {
          actor: request.workerId,
          action: 'render-job.claim',
          entityType: 'render_job',
          entityId: updated.id,
          requestId,
          summary: {
            episodeId: updated.episodeId,
            attemptCount: updated.attemptCount,
          },
        },
      });

      return updated;
    });

    return job ? toRenderJob(job) : null;
  }

  async updateRenderJobStatus(
    jobId: string,
    request: UpdateRenderJobStatusDto,
    requestId?: string,
  ): Promise<RenderJob> {
    const previous = await this.prisma.renderJob.findUnique({
      where: { id: jobId },
    });

    if (!previous) {
      throw new NotFoundException(`Render job ${jobId} was not found.`);
    }

    const now = new Date();
    const job = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.renderJob.update({
        where: { id: jobId },
        data: {
          status: toPrismaStatus(request.status),
          heartbeatAt: request.heartbeat ? now : undefined,
          finishedAt: ['complete', 'failed'].includes(request.status)
            ? now
            : undefined,
          notes: request.notes ?? undefined,
        },
      });

      if (previous.attemptCount > 0) {
        await tx.renderJobAttempt.updateMany({
          where: {
            renderJobId: jobId,
            attemptNumber: previous.attemptCount,
          },
          data: {
            status: toPrismaStatus(request.status),
            heartbeatAt: request.heartbeat ? now : undefined,
            finishedAt: ['complete', 'failed'].includes(request.status)
              ? now
              : undefined,
            error:
              request.status === 'failed' ? (request.notes ?? 'Failed') : null,
          },
        });
      }

      if (
        previous.mode === RenderJobMode.FINAL_VIDEO &&
        ['complete', 'failed'].includes(request.status)
      ) {
        await tx.reel.updateMany({
          where: {
            id: previous.reelId,
            productionStatus: ReelProductionStatus.RENDERING,
          },
          data: { productionStatus: ReelProductionStatus.APPROVED },
        });
      }

      await tx.auditLog.create({
        data: {
          actor: previous.workerId ?? 'local-api',
          action: 'render-job.status.update',
          entityType: 'render_job',
          entityId: updated.id,
          summary: {
            from: previous.status,
            to: updated.status,
            heartbeat: request.heartbeat === true,
          },
          requestId,
        },
      });

      return updated;
    });

    return toRenderJob(job);
  }

  async createGeneratedAsset(
    request: CreateGeneratedAssetRequest,
    requestId?: string,
  ): Promise<GeneratedAssetManifest> {
    if (request.renderJobId) {
      const job = await this.prisma.renderJob.findUnique({
        where: { id: request.renderJobId },
      });

      if (!job) {
        throw new NotFoundException(
          `Render job ${request.renderJobId} was not found.`,
        );
      }
    }

    const asset = await this.prisma.generatedAsset.create({
      data: {
        renderJobId: request.renderJobId,
        shotNumber: request.shotNumber,
        assetType: request.assetType,
        uri: request.uri,
        checksum: request.checksum,
        metadata: toPrismaJson(request.metadata ?? {}),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actor: 'local-api',
        action: 'asset.create',
        entityType: 'generated_asset',
        entityId: asset.id,
        requestId,
        summary: {
          renderJobId: asset.renderJobId,
          assetType: asset.assetType,
          shotNumber: asset.shotNumber,
          uri: asset.uri,
        },
      },
    });

    return toGeneratedAsset(asset);
  }

  async getGeneratedAssets(
    filters: { renderJobId?: string; episodeId?: number } = {},
  ): Promise<GeneratedAssetManifest[]> {
    const rows = await this.prisma.generatedAsset.findMany({
      where: {
        renderJobId: filters.renderJobId,
        renderJob: filters.episodeId
          ? { episodeId: filters.episodeId }
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return rows.map(toGeneratedAsset);
  }

  async getGeneratedAsset(assetId: string): Promise<GeneratedAssetManifest> {
    const asset = await this.prisma.generatedAsset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException(`Generated asset ${assetId} was not found.`);
    }

    return toGeneratedAsset(asset);
  }

  async updateGeneratedAssetReview(
    assetId: string,
    request: UpdateGeneratedAssetReviewRequest,
    requestId?: string,
  ): Promise<GeneratedAssetManifest> {
    const previous = await this.prisma.generatedAsset.findUnique({
      where: { id: assetId },
    });
    if (!previous) {
      throw new NotFoundException(`Generated asset ${assetId} was not found.`);
    }

    const reviewedAt = request.status === 'pending' ? null : new Date();
    const reviewedBy =
      request.status === 'pending'
        ? null
        : (request.reviewer ?? 'local-reviewer');
    const asset = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.generatedAsset.update({
        where: { id: assetId },
        data: {
          reviewStatus: toPrismaAssetReviewStatus(request.status),
          reviewNotes: request.notes ?? null,
          reviewedAt,
          reviewedBy,
        },
      });
      await tx.auditLog.create({
        data: {
          actor: reviewedBy ?? 'local-reviewer',
          action: 'asset.review.update',
          entityType: 'generated_asset',
          entityId: assetId,
          requestId,
          summary: {
            from: previous.reviewStatus,
            to: updated.reviewStatus,
            shotNumber: updated.shotNumber,
            notes: request.notes ?? null,
          },
        },
      });
      return updated;
    });

    return toGeneratedAsset(asset);
  }

  async regenerateGeneratedAsset(
    assetId: string,
    notes?: string,
    requestId?: string,
  ): Promise<RenderJob> {
    const asset = await this.prisma.generatedAsset.findUnique({
      where: { id: assetId },
      include: { renderJob: true },
    });
    if (!asset) {
      throw new NotFoundException(`Generated asset ${assetId} was not found.`);
    }
    if (!asset.renderJob) {
      throw new ConflictException(
        'Only assets linked to a render job can be regenerated.',
      );
    }

    return this.createRenderJob(
      {
        episodeId: asset.renderJob.episodeId,
        mode: fromPrismaMode(asset.renderJob.mode),
        voice: asset.renderJob.voice ?? undefined,
        notes: [
          `Regenerate asset ${assetId}${asset.shotNumber ? ` for shot ${asset.shotNumber}` : ''}.`,
          notes,
        ]
          .filter(Boolean)
          .join(' '),
      },
      requestId,
    );
  }

  async createRenderJobLog(
    jobId: string,
    request: CreateRenderJobLogRequest,
  ): Promise<RenderJobLog> {
    const job = await this.prisma.renderJob.findUnique({
      where: { id: jobId },
      select: { id: true },
    });
    if (!job) {
      throw new NotFoundException(`Render job ${jobId} was not found.`);
    }

    const log = await this.prisma.renderJobLog.create({
      data: {
        renderJobId: jobId,
        workerId: request.workerId,
        level: toPrismaLogLevel(request.level),
        stream: toPrismaLogStream(request.stream),
        message: request.message,
      },
    });
    return toRenderJobLog(log);
  }

  async getRenderJobLogs(jobId: string): Promise<RenderJobLog[]> {
    const rows = await this.prisma.renderJobLog.findMany({
      where: { renderJobId: jobId },
      orderBy: { createdAt: 'asc' },
      take: 1000,
    });
    return rows.map(toRenderJobLog);
  }

  async getRenderJobAttempts(jobId: string): Promise<RenderJobAttempt[]> {
    const rows = await this.prisma.renderJobAttempt.findMany({
      where: { renderJobId: jobId },
      orderBy: { attemptNumber: 'asc' },
    });
    return rows.map(toRenderJobAttempt);
  }

  async retryRenderJob(
    jobId: string,
    notes?: string,
    requestId?: string,
  ): Promise<RenderJob> {
    const previous = await this.prisma.renderJob.findUnique({
      where: { id: jobId },
    });
    if (!previous) {
      throw new NotFoundException(`Render job ${jobId} was not found.`);
    }
    if (previous.status !== RenderJobStatus.FAILED) {
      throw new ConflictException('Only failed render jobs can be retried.');
    }

    const job = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.renderJob.update({
        where: { id: jobId },
        data: {
          status: RenderJobStatus.QUEUED,
          workerId: null,
          startedAt: null,
          finishedAt: null,
          heartbeatAt: null,
          notes: notes ?? previous.notes,
        },
      });
      if (previous.mode === RenderJobMode.FINAL_VIDEO) {
        await tx.reel.update({
          where: { id: previous.reelId },
          data: { productionStatus: ReelProductionStatus.RENDERING },
        });
      }
      await tx.auditLog.create({
        data: {
          actor: 'local-api',
          action: 'render-job.retry',
          entityType: 'render_job',
          entityId: jobId,
          requestId,
          summary: {
            previousAttempts: previous.attemptCount,
            notes: notes ?? null,
          },
        },
      });
      return updated;
    });
    return toRenderJob(job);
  }

  private async findReelForEpisode(episodeId: number) {
    const reel = await this.prisma.reel.findFirst({
      where: {
        episodeNumber: episodeId,
        chapter: {
          chapterNumber: 1,
          document: {
            project: {
              slug: 'blessings-of-sumer',
            },
          },
        },
      },
    });

    if (!reel) {
      throw new NotFoundException(
        `Episode ${episodeId} is not persisted yet. Run the database seed before queueing render jobs.`,
      );
    }

    return reel;
  }

  private parseJsonArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
  }
}

export class InMemoryReelRepository implements ReelRepository {
  private readonly jobs: RenderJob[] = [];
  private readonly assets: GeneratedAssetManifest[] = [];
  private readonly attempts: RenderJobAttempt[] = [];
  private readonly logs: RenderJobLog[] = [];
  private readonly episodes = structuredClone(CHAPTER_ONE_REELS);

  async getChapterOneSummary(): Promise<ChapterReelSummary[]> {
    return CHAPTER_ONE_SUMMARY.map((summary) => ({
      ...summary,
      productionStatus:
        this.episodes.find((episode) => episode.episode === summary.episode)
          ?.productionStatus ?? 'draft',
    }));
  }

  async getEpisode(episodeId: number): Promise<ReelEpisode> {
    const episode = this.episodes.find((item) => item.episode === episodeId);

    if (!episode) {
      throw new NotFoundException(
        `Episode ${episodeId} is not storyboarded yet.`,
      );
    }

    return episode;
  }

  async updateEpisodeProduction(
    episodeId: number,
    request: UpdateReelProductionDto,
  ): Promise<ReelEpisode> {
    const episode = await this.getEpisode(episodeId);
    const updated: ReelEpisode = {
      ...episode,
      ...request,
      productionStatus: 'draft',
    };
    this.episodes.splice(this.episodes.indexOf(episode), 1, updated);
    return updated;
  }

  async updateEpisodeStatus(
    episodeId: number,
    request: UpdateReelStatusDto,
  ): Promise<ReelEpisode> {
    const episode = await this.getEpisode(episodeId);
    if (
      !canTransitionProductionStatus(episode.productionStatus, request.status)
    ) {
      throw new ConflictException(
        `Reel status cannot transition from ${episode.productionStatus} to ${request.status}.`,
      );
    }
    episode.productionStatus = request.status;
    return episode;
  }

  async createRenderJob(request: CreateRenderJobDto): Promise<RenderJob> {
    const episode = await this.getEpisode(request.episodeId);
    if (
      request.mode === 'final-video' &&
      episode.productionStatus !== 'approved'
    ) {
      throw new ConflictException(
        'Final-video rendering requires an approved production record.',
      );
    }

    const job: RenderJob = {
      id: crypto.randomUUID(),
      episodeId: request.episodeId,
      mode: request.mode,
      status: 'queued',
      createdAt: new Date().toISOString(),
      attemptCount: 0,
      notes: request.notes,
    };

    this.jobs.unshift(job);
    if (request.mode === 'final-video') {
      episode.productionStatus = 'rendering';
    }
    return job;
  }

  async getRenderJobs(episodeId?: number): Promise<RenderJob[]> {
    return episodeId
      ? this.jobs.filter((job) => job.episodeId === episodeId)
      : this.jobs;
  }

  async getStaleRenderJobs(maxAgeSeconds: number): Promise<RenderJob[]> {
    const staleBefore = Date.now() - maxAgeSeconds * 1000;
    return this.jobs.filter(
      (job) =>
        ['queued', 'running'].includes(job.status) &&
        Date.parse(job.createdAt) < staleBefore,
    );
  }

  async markStaleRenderJobsFailed(maxAgeSeconds: number): Promise<RenderJob[]> {
    const staleJobs = await this.getStaleRenderJobs(maxAgeSeconds);
    for (const job of staleJobs) {
      job.status = 'failed';
      job.notes = `Marked failed by stale-job watchdog after ${maxAgeSeconds}s.`;
    }

    return staleJobs;
  }

  async claimNextRenderJob(
    request: ClaimRenderJobDto,
  ): Promise<RenderJob | null> {
    const job = this.jobs.find((item) => item.status === 'queued');

    if (!job) {
      return null;
    }

    job.status = 'running';
    job.workerId = request.workerId;
    job.attemptCount += 1;
    job.heartbeatAt = new Date().toISOString();
    job.startedAt = job.heartbeatAt;
    this.attempts.push({
      id: crypto.randomUUID(),
      renderJobId: job.id,
      attemptNumber: job.attemptCount,
      workerId: request.workerId,
      status: 'running',
      startedAt: job.heartbeatAt,
      heartbeatAt: job.heartbeatAt,
    });
    return job;
  }

  async updateRenderJobStatus(
    jobId: string,
    request: UpdateRenderJobStatusDto,
  ): Promise<RenderJob> {
    const job = this.jobs.find((item) => item.id === jobId);

    if (!job) {
      throw new NotFoundException(`Render job ${jobId} was not found.`);
    }

    job.status = request.status;
    job.heartbeatAt = request.heartbeat
      ? new Date().toISOString()
      : job.heartbeatAt;
    job.notes = request.notes ?? job.notes;
    if (['complete', 'failed'].includes(request.status)) {
      job.finishedAt = new Date().toISOString();
    }
    const attempt = this.attempts.find(
      (item) =>
        item.renderJobId === jobId && item.attemptNumber === job.attemptCount,
    );
    if (attempt) {
      attempt.status = request.status;
      attempt.heartbeatAt = request.heartbeat
        ? new Date().toISOString()
        : attempt.heartbeatAt;
      attempt.finishedAt = job.finishedAt;
      attempt.error = request.status === 'failed' ? request.notes : undefined;
    }
    if (
      job.mode === 'final-video' &&
      ['complete', 'failed'].includes(job.status)
    ) {
      const episode = await this.getEpisode(job.episodeId);
      episode.productionStatus = 'approved';
    }
    return job;
  }

  async createGeneratedAsset(
    request: CreateGeneratedAssetRequest,
  ): Promise<GeneratedAssetManifest> {
    const id = crypto.randomUUID();
    const asset: GeneratedAssetManifest = {
      id,
      renderJobId: request.renderJobId,
      assetType: request.assetType,
      shotNumber: request.shotNumber,
      uri: request.uri,
      contentUrl: `/api/generated-assets/${id}/content`,
      checksum: request.checksum,
      metadata: request.metadata ?? {},
      reviewStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.assets.unshift(asset);
    return asset;
  }

  async getGeneratedAssets(
    filters: { renderJobId?: string; episodeId?: number } = {},
  ): Promise<GeneratedAssetManifest[]> {
    return this.assets.filter((asset) => {
      if (filters.renderJobId && asset.renderJobId !== filters.renderJobId) {
        return false;
      }
      if (filters.episodeId) {
        const job = this.jobs.find((item) => item.id === asset.renderJobId);
        return job?.episodeId === filters.episodeId;
      }
      return true;
    });
  }

  async getGeneratedAsset(assetId: string): Promise<GeneratedAssetManifest> {
    const asset = this.assets.find((item) => item.id === assetId);
    if (!asset) {
      throw new NotFoundException(`Generated asset ${assetId} was not found.`);
    }
    return asset;
  }

  async updateGeneratedAssetReview(
    assetId: string,
    request: UpdateGeneratedAssetReviewRequest,
  ): Promise<GeneratedAssetManifest> {
    const asset = await this.getGeneratedAsset(assetId);
    asset.reviewStatus = request.status;
    asset.reviewNotes = request.notes;
    asset.reviewedAt =
      request.status === 'pending' ? undefined : new Date().toISOString();
    asset.reviewedBy =
      request.status === 'pending'
        ? undefined
        : (request.reviewer ?? 'local-reviewer');
    return asset;
  }

  async regenerateGeneratedAsset(
    assetId: string,
    notes?: string,
  ): Promise<RenderJob> {
    const asset = await this.getGeneratedAsset(assetId);
    const sourceJob = this.jobs.find((job) => job.id === asset.renderJobId);
    if (!sourceJob) {
      throw new ConflictException(
        'Only assets linked to a render job can be regenerated.',
      );
    }
    return this.createRenderJob({
      episodeId: sourceJob.episodeId,
      mode: sourceJob.mode,
      notes: `Regenerate asset ${assetId}. ${notes ?? ''}`.trim(),
    });
  }

  async createRenderJobLog(
    jobId: string,
    request: CreateRenderJobLogRequest,
  ): Promise<RenderJobLog> {
    if (!this.jobs.some((job) => job.id === jobId)) {
      throw new NotFoundException(`Render job ${jobId} was not found.`);
    }
    const log: RenderJobLog = {
      id: crypto.randomUUID(),
      renderJobId: jobId,
      workerId: request.workerId,
      level: request.level,
      stream: request.stream,
      message: request.message,
      createdAt: new Date().toISOString(),
    };
    this.logs.push(log);
    return log;
  }

  async getRenderJobLogs(jobId: string): Promise<RenderJobLog[]> {
    return this.logs.filter((log) => log.renderJobId === jobId);
  }

  async getRenderJobAttempts(jobId: string): Promise<RenderJobAttempt[]> {
    return this.attempts.filter((attempt) => attempt.renderJobId === jobId);
  }

  async retryRenderJob(jobId: string, notes?: string): Promise<RenderJob> {
    const job = this.jobs.find((item) => item.id === jobId);
    if (!job) {
      throw new NotFoundException(`Render job ${jobId} was not found.`);
    }
    if (job.status !== 'failed') {
      throw new ConflictException('Only failed render jobs can be retried.');
    }
    job.status = 'queued';
    job.workerId = undefined;
    job.startedAt = undefined;
    job.finishedAt = undefined;
    job.heartbeatAt = undefined;
    job.notes = notes ?? job.notes;
    if (job.mode === 'final-video') {
      const episode = await this.getEpisode(job.episodeId);
      episode.productionStatus = 'rendering';
    }
    return job;
  }
}

function toPrismaMode(mode: CreateRenderJobDto['mode']): RenderJobMode {
  switch (mode) {
    case 'draft-video':
      return RenderJobMode.DRAFT_VIDEO;
    case 'final-video':
      return RenderJobMode.FINAL_VIDEO;
    case 'storyboard':
      return RenderJobMode.STORYBOARD;
  }
}

function toPrismaStatus(status: RenderJob['status']): RenderJobStatus {
  switch (status) {
    case 'complete':
      return RenderJobStatus.COMPLETE;
    case 'failed':
      return RenderJobStatus.FAILED;
    case 'running':
      return RenderJobStatus.RUNNING;
    case 'queued':
      return RenderJobStatus.QUEUED;
  }
}

function toRenderJob(job: {
  id: string;
  episodeId: number;
  mode: RenderJobMode;
  status: RenderJobStatus;
  createdAt: Date;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  heartbeatAt?: Date | null;
  workerId?: string | null;
  attemptCount?: number;
  notes: string | null;
}): RenderJob {
  return {
    id: job.id,
    episodeId: job.episodeId,
    mode: fromPrismaMode(job.mode),
    status: fromPrismaStatus(job.status),
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString(),
    finishedAt: job.finishedAt?.toISOString(),
    heartbeatAt: job.heartbeatAt?.toISOString(),
    workerId: job.workerId ?? undefined,
    attemptCount: job.attemptCount ?? 0,
    notes: job.notes ?? undefined,
  };
}

function toGeneratedAsset(asset: {
  id: string;
  renderJobId: string | null;
  assetType: string;
  shotNumber: number | null;
  uri: string;
  checksum: string | null;
  metadata: Prisma.JsonValue;
  reviewStatus: AssetReviewStatus;
  reviewNotes: string | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  createdAt: Date;
}): GeneratedAssetManifest {
  return {
    id: asset.id,
    renderJobId: asset.renderJobId ?? undefined,
    assetType: toAssetType(asset.assetType),
    shotNumber: asset.shotNumber ?? undefined,
    uri: asset.uri,
    contentUrl: `/api/generated-assets/${asset.id}/content`,
    checksum: asset.checksum ?? undefined,
    metadata: toMetadata(asset.metadata),
    reviewStatus: fromPrismaAssetReviewStatus(asset.reviewStatus),
    reviewNotes: asset.reviewNotes ?? undefined,
    reviewedAt: asset.reviewedAt?.toISOString(),
    reviewedBy: asset.reviewedBy ?? undefined,
    createdAt: asset.createdAt.toISOString(),
  };
}

function toRenderJobAttempt(attempt: {
  id: string;
  renderJobId: string;
  attemptNumber: number;
  workerId: string;
  status: RenderJobStatus;
  startedAt: Date;
  heartbeatAt: Date | null;
  finishedAt: Date | null;
  error: string | null;
}): RenderJobAttempt {
  return {
    id: attempt.id,
    renderJobId: attempt.renderJobId,
    attemptNumber: attempt.attemptNumber,
    workerId: attempt.workerId,
    status: fromPrismaStatus(attempt.status),
    startedAt: attempt.startedAt.toISOString(),
    heartbeatAt: attempt.heartbeatAt?.toISOString(),
    finishedAt: attempt.finishedAt?.toISOString(),
    error: attempt.error ?? undefined,
  };
}

function toRenderJobLog(log: {
  id: string;
  renderJobId: string;
  workerId: string | null;
  level: RenderLogLevel;
  stream: RenderLogStream;
  message: string;
  createdAt: Date;
}): RenderJobLog {
  return {
    id: log.id,
    renderJobId: log.renderJobId,
    workerId: log.workerId ?? undefined,
    level: fromPrismaLogLevel(log.level),
    stream: fromPrismaLogStream(log.stream),
    message: log.message,
    createdAt: log.createdAt.toISOString(),
  };
}

function toAssetType(assetType: string): GeneratedAssetManifest['assetType'] {
  if (
    ['image', 'audio', 'captions', 'video', 'manifest', 'other'].includes(
      assetType,
    )
  ) {
    return assetType as GeneratedAssetManifest['assetType'];
  }

  return 'other';
}

function toMetadata(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toExportMetadata(
  value: Prisma.JsonValue,
): ReelEpisode['exportMetadata'] {
  const metadata = toMetadata(value);
  return {
    facebookCaption: String(metadata['facebookCaption'] ?? ''),
    xPost: String(metadata['xPost'] ?? ''),
    tiktokCaption: String(metadata['tiktokCaption'] ?? ''),
    youtubeShortsTitle: String(metadata['youtubeShortsTitle'] ?? ''),
    tags: Array.isArray(metadata['tags']) ? metadata['tags'].map(String) : [],
  };
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toPrismaProductionStatus(
  status: ReelEpisode['productionStatus'],
): ReelProductionStatus {
  return ReelProductionStatus[
    status.toUpperCase() as keyof typeof ReelProductionStatus
  ];
}

function fromPrismaProductionStatus(
  status: ReelProductionStatus,
): ReelEpisode['productionStatus'] {
  return status.toLowerCase() as ReelEpisode['productionStatus'];
}

function canTransitionProductionStatus(
  from: ReelEpisode['productionStatus'],
  to: ReelEpisode['productionStatus'],
): boolean {
  if (from === to) {
    return true;
  }

  const transitions: Record<
    ReelEpisode['productionStatus'],
    ReelEpisode['productionStatus'][]
  > = {
    draft: ['review'],
    review: ['draft', 'approved'],
    approved: ['draft', 'rendering'],
    rendering: ['approved', 'published'],
    published: ['draft'],
  };
  return transitions[from].includes(to);
}

function toPrismaAssetReviewStatus(
  status: GeneratedAssetManifest['reviewStatus'],
): AssetReviewStatus {
  return AssetReviewStatus[
    status.toUpperCase() as keyof typeof AssetReviewStatus
  ];
}

function fromPrismaAssetReviewStatus(
  status: AssetReviewStatus,
): GeneratedAssetManifest['reviewStatus'] {
  return status.toLowerCase() as GeneratedAssetManifest['reviewStatus'];
}

function toPrismaLogLevel(level: RenderJobLog['level']): RenderLogLevel {
  return RenderLogLevel[level.toUpperCase() as keyof typeof RenderLogLevel];
}

function fromPrismaLogLevel(level: RenderLogLevel): RenderJobLog['level'] {
  return level.toLowerCase() as RenderJobLog['level'];
}

function toPrismaLogStream(stream: RenderJobLog['stream']): RenderLogStream {
  return RenderLogStream[stream.toUpperCase() as keyof typeof RenderLogStream];
}

function fromPrismaLogStream(stream: RenderLogStream): RenderJobLog['stream'] {
  return stream.toLowerCase() as RenderJobLog['stream'];
}

function fromPrismaMode(mode: RenderJobMode): RenderJob['mode'] {
  switch (mode) {
    case RenderJobMode.DRAFT_VIDEO:
      return 'draft-video';
    case RenderJobMode.FINAL_VIDEO:
      return 'final-video';
    case RenderJobMode.STORYBOARD:
      return 'storyboard';
  }
}

function fromPrismaStatus(status: RenderJobStatus): RenderJob['status'] {
  switch (status) {
    case RenderJobStatus.COMPLETE:
      return 'complete';
    case RenderJobStatus.FAILED:
      return 'failed';
    case RenderJobStatus.RUNNING:
      return 'running';
    case RenderJobStatus.QUEUED:
      return 'queued';
  }
}
