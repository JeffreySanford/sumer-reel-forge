import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { existsSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
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
import { REEL_REPOSITORY, type ReelRepository } from './reel.repository';
import {
  ClaimRenderJobDto,
  CreateRenderJobDto,
  UpdateRenderJobStatusDto,
} from './render-job.dto';
import { UpdateReelProductionDto } from './reel-production.dto';
import { UpdateReelStatusDto } from './reel-workflow.dto';

export interface GeneratedAssetContent {
  filePath: string;
  contentType: string;
  filename: string;
}

@Injectable()
export class AppService {
  constructor(
    @Inject(REEL_REPOSITORY) private readonly repository: ReelRepository,
  ) {}

  getHealth(): { status: string; service: string } {
    return { status: 'ok', service: 'sumer-reel-forge-api' };
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

  createRenderJob(
    request: CreateRenderJobDto,
    requestId?: string,
  ): Promise<RenderJob> {
    return this.repository.createRenderJob(request, requestId);
  }

  getRenderJobs(episodeId?: number): Promise<RenderJob[]> {
    return this.repository.getRenderJobs(episodeId);
  }

  getStaleRenderJobs(maxAgeSeconds: number): Promise<RenderJob[]> {
    return this.repository.getStaleRenderJobs(maxAgeSeconds);
  }

  markStaleRenderJobsFailed(
    maxAgeSeconds: number,
    requestId?: string,
  ): Promise<RenderJob[]> {
    return this.repository.markStaleRenderJobsFailed(maxAgeSeconds, requestId);
  }

  claimNextRenderJob(
    request: ClaimRenderJobDto,
    requestId?: string,
  ): Promise<RenderJob | null> {
    return this.repository.claimNextRenderJob(request, requestId);
  }

  updateRenderJobStatus(
    jobId: string,
    request: UpdateRenderJobStatusDto,
    requestId?: string,
  ): Promise<RenderJob> {
    return this.repository.updateRenderJobStatus(jobId, request, requestId);
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

  regenerateGeneratedAsset(
    assetId: string,
    notes?: string,
    requestId?: string,
  ): Promise<RenderJob> {
    return this.repository.regenerateGeneratedAsset(assetId, notes, requestId);
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

  retryRenderJob(
    jobId: string,
    notes?: string,
    requestId?: string,
  ): Promise<RenderJob> {
    return this.repository.retryRenderJob(jobId, notes, requestId);
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
