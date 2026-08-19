import { Injectable, NotFoundException } from '@nestjs/common';
import { RenderJobMode, RenderJobStatus } from '@prisma/client';
import {
  CHAPTER_ONE_REELS,
  CHAPTER_ONE_SUMMARY,
  type ChapterReelSummary,
  type ReelEpisode,
  type RenderJob,
} from '@sumer-reel-forge/reel-core';
import { PrismaService } from './prisma.service';
import { CreateRenderJobDto, UpdateRenderJobStatusDto } from './render-job.dto';

export const REEL_REPOSITORY = Symbol('REEL_REPOSITORY');

export interface ReelRepository {
  getChapterOneSummary(): Promise<ChapterReelSummary[]>;
  getEpisode(episodeId: number): Promise<ReelEpisode>;
  createRenderJob(request: CreateRenderJobDto): Promise<RenderJob>;
  getRenderJobs(): Promise<RenderJob[]>;
  getStaleRenderJobs(maxAgeSeconds: number): Promise<RenderJob[]>;
  updateRenderJobStatus(
    jobId: string,
    request: UpdateRenderJobStatusDto,
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
    };
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

  async updateRenderJobStatus(
    jobId: string,
    request: UpdateRenderJobStatusDto,
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
      },
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

  async getChapterOneSummary(): Promise<ChapterReelSummary[]> {
    return CHAPTER_ONE_SUMMARY;
  }

  async getEpisode(episodeId: number): Promise<ReelEpisode> {
    const episode = CHAPTER_ONE_REELS.find((item) => item.episode === episodeId);

    if (!episode) {
      throw new NotFoundException(
        `Episode ${episodeId} is not storyboarded yet.`,
      );
    }

    return episode;
  }

  async createRenderJob(request: CreateRenderJobDto): Promise<RenderJob> {
    await this.getEpisode(request.episodeId);

    const job: RenderJob = {
      id: crypto.randomUUID(),
      episodeId: request.episodeId,
      mode: request.mode,
      status: 'queued',
      createdAt: new Date().toISOString(),
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

  async updateRenderJobStatus(
    jobId: string,
    request: UpdateRenderJobStatusDto,
  ): Promise<RenderJob> {
    const job = this.jobs.find((item) => item.id === jobId);

    if (!job) {
      throw new NotFoundException(`Render job ${jobId} was not found.`);
    }

    job.status = request.status;
    job.notes = request.notes ?? job.notes;
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
  notes: string | null;
}): RenderJob {
  return {
    id: job.id,
    episodeId: job.episodeId,
    mode: fromPrismaMode(job.mode),
    status: fromPrismaStatus(job.status),
    createdAt: job.createdAt.toISOString(),
    notes: job.notes ?? undefined,
  };
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
