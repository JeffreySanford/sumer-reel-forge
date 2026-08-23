import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RenderPipeline as PrismaRenderPipeline } from '@prisma/client';
import { existsSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type ChapterNarrationSettings,
  type ChapterReelSummary,
  type CreateGeneratedAssetRequest,
  type CreateRenderJobLogRequest,
  type GeneratedAssetManifest,
  type ReelEpisode,
  type RenderJob,
  type RenderJobAttempt,
  type RenderJobLog,
  type RenderPipeline,
  type UpdateGeneratedAssetReviewRequest,
} from '@sumer-reel-forge/reel-core';
import { PrismaService } from './prisma.service';
import { REEL_REPOSITORY, type ReelRepository } from './reel.repository';
import {
  ClaimRenderJobDto,
  CreateRenderJobDto,
  UpdateRenderJobStatusDto,
} from './render-job.dto';
import { UpdateReelProductionDto } from './reel-production.dto';
import { UpdateReelStatusDto } from './reel-workflow.dto';
import { UpdateChapterNarrationSettingsDto } from './narration.dto';

export interface GeneratedAssetContent {
  filePath: string;
  contentType: string;
  filename: string;
}

@Injectable()
export class AppService {
  constructor(
    @Inject(REEL_REPOSITORY) private readonly repository: ReelRepository,
    private readonly prisma: PrismaService,
  ) {}

  getHealth(): { status: string; service: string } {
    return { status: 'ok', service: 'sumer-reel-forge-api' };
  }

  getChapterNarrationSettings(
    projectSlug: string,
    chapterNumber: number,
  ): Promise<ChapterNarrationSettings> {
    return this.repository.getChapterNarrationSettings(
      projectSlug,
      chapterNumber,
    );
  }

  updateChapterNarrationSettings(
    projectSlug: string,
    chapterNumber: number,
    request: UpdateChapterNarrationSettingsDto,
    requestId?: string,
  ): Promise<ChapterNarrationSettings> {
    return this.repository.updateChapterNarrationSettings(
      projectSlug,
      chapterNumber,
      request,
      requestId,
    );
  }

  getChapterOneSummary(): Promise<ChapterReelSummary[]> {
    return this.repository.getChapterOneSummary();
  }

  getEpisode(episodeId: number): Promise<ReelEpisode> {
    return this.repository.getEpisode(episodeId);
  }

  updateEpisodeProduction(
    episodeId: number,
    request: UpdateReelProductionDto,
    requestId?: string,
  ): Promise<ReelEpisode> {
    return this.repository.updateEpisodeProduction(
      episodeId,
      request,
      requestId,
    );
  }

  updateEpisodeStatus(
    episodeId: number,
    request: UpdateReelStatusDto,
    requestId?: string,
  ): Promise<ReelEpisode> {
    return this.repository.updateEpisodeStatus(episodeId, request, requestId);
  }

  async createRenderJob(
    request: CreateRenderJobDto,
    requestId?: string,
  ): Promise<RenderJob> {
    const job = await this.repository.createRenderJob(request, requestId);
    return this.setRenderJobPipeline(job, request.pipeline ?? 'editorial');
  }

  async getRenderJobs(episodeId?: number): Promise<RenderJob[]> {
    return this.withRenderPipelines(
      await this.repository.getRenderJobs(episodeId),
    );
  }

  async getStaleRenderJobs(maxAgeSeconds: number): Promise<RenderJob[]> {
    return this.withRenderPipelines(
      await this.repository.getStaleRenderJobs(maxAgeSeconds),
    );
  }

  async markStaleRenderJobsFailed(
    maxAgeSeconds: number,
    requestId?: string,
  ): Promise<RenderJob[]> {
    return this.withRenderPipelines(
      await this.repository.markStaleRenderJobsFailed(
        maxAgeSeconds,
        requestId,
      ),
    );
  }

  async claimNextRenderJob(
    request: ClaimRenderJobDto,
    requestId?: string,
  ): Promise<RenderJob | null> {
    const job = await this.repository.claimNextRenderJob(request, requestId);
    return job ? this.withRenderPipeline(job) : null;
  }

  async updateRenderJobStatus(
    jobId: string,
    request: UpdateRenderJobStatusDto,
    requestId?: string,
  ): Promise<RenderJob> {
    return this.withRenderPipeline(
      await this.repository.updateRenderJobStatus(jobId, request, requestId),
    );
  }

  createGeneratedAsset(
    request: CreateGeneratedAssetRequest,
    requestId?: string,
  ): Promise<GeneratedAssetManifest> {
    return this.repository.createGeneratedAsset(request, requestId);
  }

  getGeneratedAssets(filters?: {
    renderJobId?: string;
    episodeId?: number;
  }): Promise<GeneratedAssetManifest[]> {
    return this.repository.getGeneratedAssets(filters);
  }

  updateGeneratedAssetReview(
    assetId: string,
    request: UpdateGeneratedAssetReviewRequest,
    requestId?: string,
  ): Promise<GeneratedAssetManifest> {
    return this.repository.updateGeneratedAssetReview(
      assetId,
      request,
      requestId,
    );
  }

  async regenerateGeneratedAsset(
    assetId: string,
    notes?: string,
    requestId?: string,
  ): Promise<RenderJob> {
    const source = await this.prisma.generatedAsset.findUnique({
      where: { id: assetId },
      select: {
        renderJob: {
          select: { pipeline: true },
        },
      },
    });
    const sourcePipeline =
      fromPrismaPipeline(source?.renderJob?.pipeline) ?? 'editorial';
    const job = await this.repository.regenerateGeneratedAsset(
      assetId,
      notes,
      requestId,
    );
    return this.setRenderJobPipeline(job, sourcePipeline);
  }

  createRenderJobLog(
    jobId: string,
    request: CreateRenderJobLogRequest,
  ): Promise<RenderJobLog> {
    return this.repository.createRenderJobLog(jobId, request);
  }

  getRenderJobLogs(jobId: string): Promise<RenderJobLog[]> {
    return this.repository.getRenderJobLogs(jobId);
  }

  getRenderJobAttempts(jobId: string): Promise<RenderJobAttempt[]> {
    return this.repository.getRenderJobAttempts(jobId);
  }

  async retryRenderJob(
    jobId: string,
    notes?: string,
    requestId?: string,
  ): Promise<RenderJob> {
    const existing = await this.prisma.renderJob.findUnique({
      where: { id: jobId },
      select: { pipeline: true },
    });
    const pipeline = fromPrismaPipeline(existing?.pipeline) ?? 'editorial';
    const job = await this.repository.retryRenderJob(
      jobId,
      notes,
      requestId,
    );
    return this.setRenderJobPipeline(job, pipeline);
  }

  async getGeneratedAssetContent(
    assetId: string,
  ): Promise<GeneratedAssetContent> {
    const asset = await this.repository.getGeneratedAsset(assetId);
    if (!asset.uri.startsWith('file:')) {
      throw new BadRequestException(
        'Only local file assets are served through this endpoint.',
      );
    }

    const outputRoot = resolve(
      process.env['RENDER_OUTPUT_ROOT'] ??
        resolve(process.cwd(), 'tmp/renders'),
    );
    const filePath = resolve(fileURLToPath(asset.uri));
    const relativePath = relative(outputRoot, filePath);
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new BadRequestException('Asset path is outside the render root.');
    }
    if (!existsSync(filePath)) {
      throw new NotFoundException(`Asset file ${assetId} was not found.`);
    }

    return {
      filePath,
      filename: relativePath.split(/[\\/]/).at(-1) ?? assetId,
      contentType: contentTypeFor(asset.assetType, filePath),
    };
  }

  private async setRenderJobPipeline(
    job: RenderJob,
    pipeline: RenderPipeline,
  ): Promise<RenderJob> {
    await this.prisma.renderJob.update({
      where: { id: job.id },
      data: { pipeline: toPrismaPipeline(pipeline) },
    });
    return { ...job, pipeline };
  }

  private async withRenderPipeline(job: RenderJob): Promise<RenderJob> {
    const row = await this.prisma.renderJob.findUnique({
      where: { id: job.id },
      select: { pipeline: true },
    });
    return {
      ...job,
      pipeline: fromPrismaPipeline(row?.pipeline),
    };
  }

  private async withRenderPipelines(jobs: RenderJob[]): Promise<RenderJob[]> {
    if (jobs.length === 0) {
      return jobs;
    }
    const rows = await this.prisma.renderJob.findMany({
      where: { id: { in: jobs.map((job) => job.id) } },
      select: { id: true, pipeline: true },
    });
    const pipelineById = new Map(
      rows.map((row) => [row.id, fromPrismaPipeline(row.pipeline)]),
    );
    return jobs.map((job) => ({
      ...job,
      pipeline: pipelineById.get(job.id),
    }));
  }
}

function toPrismaPipeline(pipeline: RenderPipeline): PrismaRenderPipeline {
  switch (pipeline) {
    case 'mock':
      return PrismaRenderPipeline.MOCK;
    case 'local':
      return PrismaRenderPipeline.LOCAL;
    case 'animation':
      return PrismaRenderPipeline.ANIMATION;
    case 'editorial':
      return PrismaRenderPipeline.EDITORIAL;
  }
}

function fromPrismaPipeline(
  pipeline: PrismaRenderPipeline | null | undefined,
): RenderPipeline | undefined {
  return pipeline?.toLowerCase() as RenderPipeline | undefined;
}

function contentTypeFor(
  assetType: GeneratedAssetManifest['assetType'],
  filePath: string,
): string {
  const extension = filePath.toLowerCase().split('.').at(-1);
  const byExtension: Record<string, string> = {
    json: 'application/json',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    png: 'image/png',
    srt: 'application/x-subrip',
    svg: 'image/svg+xml',
    wav: 'audio/wav',
    webp: 'image/webp',
  };
  return (
    byExtension[extension ?? ''] ??
    (
      {
        image: 'application/octet-stream',
        audio: 'application/octet-stream',
        captions: 'text/plain',
        video: 'application/octet-stream',
        manifest: 'application/json',
        other: 'application/octet-stream',
      } satisfies Record<GeneratedAssetManifest['assetType'], string>
    )[assetType]
  );
}
