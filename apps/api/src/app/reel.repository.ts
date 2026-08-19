import { Injectable, NotFoundException } from '@nestjs/common';
import { RenderJobMode, RenderJobStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import {
  CHAPTER_ONE_REELS,
  CHAPTER_ONE_SUMMARY,
  type ChapterReelSummary,
  type CreateGeneratedAssetRequest,
  type GeneratedAssetManifest,
  type ReelEpisode,
  type RenderJob,
} from '@sumer-reel-forge/reel-core';
import { PrismaService } from './prisma.service';
import {
  ClaimRenderJobDto,
  CreateRenderJobDto,
  UpdateRenderJobStatusDto,
} from './render-job.dto';
import { UpdateReelProductionDto } from './reel-production.dto';

export const REEL_REPOSITORY = Symbol('REEL_REPOSITORY');

export interface ReelRepository {
  getChapterOneSummary(): Promise<ChapterReelSummary[]>;
  getEpisode(episodeId: number): Promise<ReelEpisode>;
  updateEpisodeProduction(
    episodeId: number,
    request: UpdateReelProductionDto,
    requestId?: string,
  ): Promise<ReelEpisode>;
  createRenderJob(request: CreateRenderJobDto): Promise<RenderJob>;
  getRenderJobs(): Promise<RenderJob[]>;
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
  getGeneratedAssets(renderJobId?: string): Promise<GeneratedAssetManifest[]>;
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
          },
        },
      });
    });

    return this.getEpisode(episodeId);
  }

  async createRenderJob(request: CreateRenderJobDto): Promise<RenderJob> {
    const episode = await this.findReelForEpisode(request.episodeId);

    const job = await this.prisma.renderJob.create({
      data: {
        reelId: episode.id,
        episodeId: episode.episodeNumber,
        mode: toPrismaMode(request.mode),
        voice: request.voice,
        notes: request.notes,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actor: 'local-api',
        action: 'render-job.create',
        entityType: 'render_job',
        entityId: job.id,
        summary: {
          episodeId: job.episodeId,
          mode: job.mode,
          status: job.status,
        },
      },
    });

    return toRenderJob(job);
  }

  async getRenderJobs(): Promise<RenderJob[]> {
    const rows = await this.prisma.renderJob.findMany({
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
      await tx.renderJob.updateMany({
        where: { id: { in: staleIds } },
        data: {
          status: RenderJobStatus.FAILED,
          finishedAt: now,
          notes: `Marked failed by stale-job watchdog after ${maxAgeSeconds}s.`,
        },
      });

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
    const next = await this.prisma.renderJob.findFirst({
      where: { status: RenderJobStatus.QUEUED },
      orderBy: { createdAt: 'asc' },
    });

    if (!next) {
      return null;
    }

    const now = new Date();
    const job = await this.prisma.renderJob.update({
      where: { id: next.id },
      data: {
        status: RenderJobStatus.RUNNING,
        workerId: request.workerId,
        attemptCount: { increment: 1 },
        startedAt: now,
        heartbeatAt: now,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actor: request.workerId,
        action: 'render-job.claim',
        entityType: 'render_job',
        entityId: job.id,
        requestId,
        summary: {
          episodeId: job.episodeId,
          attemptCount: job.attemptCount,
        },
      },
    });

    return toRenderJob(job);
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

    const job = await this.prisma.renderJob.update({
      where: { id: jobId },
      data: {
        status: toPrismaStatus(request.status),
        heartbeatAt: request.heartbeat ? new Date() : undefined,
        finishedAt: ['complete', 'failed'].includes(request.status)
          ? new Date()
          : undefined,
        notes: request.notes ?? undefined,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actor: 'local-api',
        action: 'render-job.status.update',
        entityType: 'render_job',
        entityId: job.id,
        summary: {
          from: previous.status,
          to: job.status,
          heartbeat: request.heartbeat === true,
        },
        requestId,
      },
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
          uri: asset.uri,
        },
      },
    });

    return toGeneratedAsset(asset);
  }

  async getGeneratedAssets(
    renderJobId?: string,
  ): Promise<GeneratedAssetManifest[]> {
    const rows = await this.prisma.generatedAsset.findMany({
      where: renderJobId ? { renderJobId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return rows.map(toGeneratedAsset);
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

  async getChapterOneSummary(): Promise<ChapterReelSummary[]> {
    return CHAPTER_ONE_SUMMARY;
  }

  async getEpisode(episodeId: number): Promise<ReelEpisode> {
    const episode = CHAPTER_ONE_REELS.find(
      (item) => item.episode === episodeId,
    );

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
    return {
      ...episode,
      ...request,
    };
  }

  async createRenderJob(request: CreateRenderJobDto): Promise<RenderJob> {
    await this.getEpisode(request.episodeId);

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
    return job;
  }

  async getRenderJobs(): Promise<RenderJob[]> {
    return this.jobs;
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
    return job;
  }

  async createGeneratedAsset(
    request: CreateGeneratedAssetRequest,
  ): Promise<GeneratedAssetManifest> {
    const asset: GeneratedAssetManifest = {
      id: crypto.randomUUID(),
      renderJobId: request.renderJobId,
      assetType: request.assetType,
      uri: request.uri,
      checksum: request.checksum,
      metadata: request.metadata ?? {},
      createdAt: new Date().toISOString(),
    };
    this.assets.unshift(asset);
    return asset;
  }

  async getGeneratedAssets(
    renderJobId?: string,
  ): Promise<GeneratedAssetManifest[]> {
    return renderJobId
      ? this.assets.filter((asset) => asset.renderJobId === renderJobId)
      : this.assets;
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
  uri: string;
  checksum: string | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
}): GeneratedAssetManifest {
  return {
    id: asset.id,
    renderJobId: asset.renderJobId ?? undefined,
    assetType: toAssetType(asset.assetType),
    uri: asset.uri,
    checksum: asset.checksum ?? undefined,
    metadata: toMetadata(asset.metadata),
    createdAt: asset.createdAt.toISOString(),
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
