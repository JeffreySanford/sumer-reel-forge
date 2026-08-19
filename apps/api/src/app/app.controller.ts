import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  ChapterReelSummary,
  GeneratedAssetManifest,
  ReelEpisode,
  RenderJob,
} from '@sumer-reel-forge/reel-core';
import { AppService } from './app.service';
import {
  ClaimRenderJobDto,
  CreateRenderJobDto,
  HeartbeatRenderJobDto,
  UpdateRenderJobStatusDto,
} from './render-job.dto';
import {
  CreateGeneratedAssetDto,
  UpdateReelProductionDto,
} from './reel-production.dto';

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

  @Patch('chapters/1/reels/:episodeId/production')
  @ApiOperation({ summary: 'Save editable production fields for one reel.' })
  updateEpisodeProduction(
    @Param('episodeId', ParseIntPipe) episodeId: number,
    @Body() request: UpdateReelProductionDto,
    @Headers('x-request-id') requestId?: string,
  ): Promise<ReelEpisode> {
    return this.appService.updateEpisodeProduction(
      episodeId,
      request,
      requestId,
    );
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

  @Post('render-jobs/watchdog/stale')
  @ApiOperation({
    summary: 'Mark stale queued/running render jobs as failed.',
  })
  markStaleRenderJobsFailed(
    @Query('maxAgeSeconds', new DefaultValuePipe(900), ParseIntPipe)
    maxAgeSeconds = 900,
    @Headers('x-request-id') requestId?: string,
  ): Promise<RenderJob[]> {
    return this.appService.markStaleRenderJobsFailed(maxAgeSeconds, requestId);
  }

  @Post('render-jobs/claim')
  @ApiOperation({ summary: 'Claim the next queued render job for a worker.' })
  claimNextRenderJob(
    @Body() request: ClaimRenderJobDto,
    @Headers('x-request-id') requestId?: string,
  ): Promise<RenderJob | null> {
    return this.appService.claimNextRenderJob(request, requestId);
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
    @Headers('x-request-id') requestId?: string,
  ): Promise<RenderJob> {
    return this.appService.updateRenderJobStatus(jobId, request, requestId);
  }

  @Patch('render-jobs/:jobId/heartbeat')
  @ApiOperation({ summary: 'Record a worker heartbeat for a render job.' })
  heartbeatRenderJob(
    @Param('jobId') jobId: string,
    @Body() request: HeartbeatRenderJobDto,
    @Headers('x-request-id') requestId?: string,
  ): Promise<RenderJob> {
    return this.appService.updateRenderJobStatus(
      jobId,
      {
        status: 'running',
        heartbeat: true,
        notes: request.notes,
      },
      requestId,
    );
  }

  @Get('generated-assets')
  @ApiOperation({ summary: 'List generated asset manifests.' })
  getGeneratedAssets(
    @Query('renderJobId') renderJobId?: string,
  ): Promise<GeneratedAssetManifest[]> {
    return this.appService.getGeneratedAssets(renderJobId);
  }

  @Post('generated-assets')
  @ApiOperation({ summary: 'Persist a generated asset manifest.' })
  createGeneratedAsset(
    @Body() request: CreateGeneratedAssetDto,
    @Headers('x-request-id') requestId?: string,
  ): Promise<GeneratedAssetManifest> {
    return this.appService.createGeneratedAsset(request, requestId);
  }
}
