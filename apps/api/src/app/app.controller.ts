import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import type {
  ChapterReelSummary,
  ReelEpisode,
  RenderJob,
} from '@sumer-reel-forge/reel-core';
import { AppService } from './app.service';
import { CreateRenderJobDto } from './render-job.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): { status: string; service: string } {
    return this.appService.getHealth();
  }

  @Get('chapters/1/reels')
  getChapterOneSummary(): ChapterReelSummary[] {
    return this.appService.getChapterOneSummary();
  }

  @Get('chapters/1/reels/:episodeId')
  getEpisode(@Param('episodeId', ParseIntPipe) episodeId: number): ReelEpisode {
    return this.appService.getEpisode(episodeId);
  }

  @Get('render-jobs')
  getRenderJobs(): RenderJob[] {
    return this.appService.getRenderJobs();
  }

  @Post('render-jobs')
  createRenderJob(@Body() request: CreateRenderJobDto): RenderJob {
    return this.appService.createRenderJob(request);
  }
}
