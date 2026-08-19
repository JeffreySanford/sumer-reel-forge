import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CHAPTER_ONE_REELS,
  CHAPTER_ONE_SUMMARY,
  type ChapterReelSummary,
  type ReelEpisode,
  type RenderJob,
} from '@sumer-reel-forge/reel-core';
import { CreateRenderJobDto } from './render-job.dto';

@Injectable()
export class AppService {
  private readonly jobs: RenderJob[] = [];

  getHealth(): { status: string; service: string } {
    return { status: 'ok', service: 'sumer-reel-forge-api' };
  }

  getChapterOneSummary(): ChapterReelSummary[] {
    return CHAPTER_ONE_SUMMARY;
  }

  getEpisode(episodeId: number): ReelEpisode {
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

  createRenderJob(request: CreateRenderJobDto): RenderJob {
    this.getEpisode(request.episodeId);

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

  getRenderJobs(): RenderJob[] {
    return this.jobs;
  }
}
