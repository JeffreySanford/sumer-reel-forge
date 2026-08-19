import { Inject, Injectable } from '@nestjs/common';
import {
  type ChapterReelSummary,
  type CreateGeneratedAssetRequest,
  type GeneratedAssetManifest,
  type ReelEpisode,
  type RenderJob,
} from '@sumer-reel-forge/reel-core';
import { REEL_REPOSITORY, type ReelRepository } from './reel.repository';
import {
  ClaimRenderJobDto,
  CreateRenderJobDto,
  UpdateRenderJobStatusDto,
} from './render-job.dto';
import { UpdateReelProductionDto } from './reel-production.dto';

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

  createRenderJob(request: CreateRenderJobDto): Promise<RenderJob> {
    return this.repository.createRenderJob(request);
  }

  getRenderJobs(): Promise<RenderJob[]> {
    return this.repository.getRenderJobs();
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

  getGeneratedAssets(renderJobId?: string): Promise<GeneratedAssetManifest[]> {
    return this.repository.getGeneratedAssets(renderJobId);
  }
}
