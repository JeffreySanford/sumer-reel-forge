import { Inject, Injectable } from '@nestjs/common';
import {
  type ChapterReelSummary,
  type ReelEpisode,
  type RenderJob,
} from '@sumer-reel-forge/reel-core';
import { REEL_REPOSITORY, type ReelRepository } from './reel.repository';
import { CreateRenderJobDto, UpdateRenderJobStatusDto } from './render-job.dto';

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

  createRenderJob(request: CreateRenderJobDto): Promise<RenderJob> {
    return this.repository.createRenderJob(request);
  }

  getRenderJobs(): Promise<RenderJob[]> {
    return this.repository.getRenderJobs();
  }

  getStaleRenderJobs(maxAgeSeconds: number): Promise<RenderJob[]> {
    return this.repository.getStaleRenderJobs(maxAgeSeconds);
  }

  updateRenderJobStatus(
    jobId: string,
    request: UpdateRenderJobStatusDto,
  ): Promise<RenderJob> {
    return this.repository.updateRenderJobStatus(jobId, request);
  }
}
