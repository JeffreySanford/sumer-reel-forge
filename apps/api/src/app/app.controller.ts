import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  ChapterReelSummary,
  ReelEpisode,
  RenderJob,
} from '@sumer-reel-forge/reel-core';
import { AppService } from './app.service';
import { CreateRenderJobDto } from './render-job.dto';

@Controller()
@ApiTags('studio')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Return API health for local and CI checks.' })
  getHealth(): { status: string; service: string } {
    return this.appService.getHealth();
  }

  @Get('chapters/1/reels')
  @ApiOperation({ summary: 'Return the Chapter 1 reel outline.' })
  getChapterOneSummary(): ChapterReelSummary[] {
    return this.appService.getChapterOneSummary();
  }

  @Get('chapters/1/reels/:episodeId')
  @ApiOperation({ summary: 'Return the detailed storyboard for one reel.' })
  getEpisode(@Param('episodeId', ParseIntPipe) episodeId: number): ReelEpisode {
    return this.appService.getEpisode(episodeId);
  }

  @Get('render-jobs')
  @ApiOperation({ summary: 'Return queued render jobs for audit/debugging.' })
  getRenderJobs(): RenderJob[] {
    return this.appService.getRenderJobs();
  }

  @Post('render-jobs')
  @ApiOperation({ summary: 'Queue a render job for an existing storyboard.' })
  createRenderJob(@Body() request: CreateRenderJobDto): RenderJob {
    return this.appService.createRenderJob(request);
  }
}
