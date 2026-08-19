import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  ChapterReelSummary,
  ReelEpisode,
  RenderJob,
} from '@sumer-reel-forge/reel-core';
import { AppService } from './app.service';
import { CreateRenderJobDto, UpdateRenderJobStatusDto } from './render-job.dto';

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
  getChapterOneSummary(): Promise<ChapterReelSummary[]> {
    return this.appService.getChapterOneSummary();
  }

  @Get('chapters/1/reels/:episodeId')
  @ApiOperation({ summary: 'Return the detailed storyboard for one reel.' })
  getEpisode(
    @Param('episodeId', ParseIntPipe) episodeId: number,
  ): Promise<ReelEpisode> {
    return this.appService.getEpisode(episodeId);
  }

  @Get('render-jobs')
  @ApiOperation({ summary: 'Return queued render jobs for audit/debugging.' })
  getRenderJobs(): Promise<RenderJob[]> {
    return this.appService.getRenderJobs();
  }

  @Get('render-jobs/stale')
  @ApiOperation({
    summary: 'Return queued/running render jobs with stale heartbeats.',
  })
  getStaleRenderJobs(
    @Query('maxAgeSeconds', new DefaultValuePipe(900), ParseIntPipe)
    maxAgeSeconds = 900,
  ): Promise<RenderJob[]> {
    return this.appService.getStaleRenderJobs(maxAgeSeconds);
  }

  @Post('render-jobs')
  @ApiOperation({ summary: 'Queue a render job for an existing storyboard.' })
  createRenderJob(@Body() request: CreateRenderJobDto): Promise<RenderJob> {
    return this.appService.createRenderJob(request);
  }

  @Patch('render-jobs/:jobId/status')
  @ApiOperation({ summary: 'Update render job status and optional heartbeat.' })
  updateRenderJobStatus(
    @Param('jobId') jobId: string,
    @Body() request: UpdateRenderJobStatusDto,
  ): Promise<RenderJob> {
    return this.appService.updateRenderJobStatus(jobId, request);
  }
}
