import {
  Body,
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  ChapterNarrationSettings,
  ChapterReelSummary,
  GeneratedAssetManifest,
  ReelEpisode,
  RenderJob,
  RenderJobAttempt,
  RenderJobLog,
} from '@sumer-reel-forge/reel-core';
import { AppService } from './app.service';
import {
  ClaimRenderJobDto,
  CreateRenderJobDto,
  CreateRenderJobLogDto,
  HeartbeatRenderJobDto,
  RetryRenderJobDto,
  UpdateRenderJobStatusDto,
} from './render-job.dto';
import {
  CreateGeneratedAssetDto,
  RegenerateGeneratedAssetDto,
  UpdateGeneratedAssetReviewDto,
  UpdateReelProductionDto,
} from './reel-production.dto';
import { UpdateReelStatusDto } from './reel-workflow.dto';
import { UpdateChapterNarrationSettingsDto } from './narration.dto';

@Controller()
@ApiTags('studio')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Return API health for local and CI checks.' })
  getHealth(): { status: string; service: string } {
    return this.appService.getHealth();
  }

  @Get('projects/:projectSlug/chapters/:chapterNumber/narration')
  @ApiOperation({
    summary: 'Return story and chapter narration identity settings.',
  })
  getChapterNarrationSettings(
    @Param('projectSlug') projectSlug: string,
    @Param('chapterNumber', ParseIntPipe) chapterNumber: number,
  ): Promise<ChapterNarrationSettings> {
    return this.appService.getChapterNarrationSettings(
      projectSlug,
      chapterNumber,
    );
  }

  @Patch('projects/:projectSlug/chapters/:chapterNumber/narration')
  @ApiOperation({
    summary: 'Save story defaults, chapter overrides, and cast voices.',
  })
  updateChapterNarrationSettings(
    @Param('projectSlug') projectSlug: string,
    @Param('chapterNumber', ParseIntPipe) chapterNumber: number,
    @Body() request: UpdateChapterNarrationSettingsDto,
    @Headers('x-request-id') requestId?: string,
  ): Promise<ChapterNarrationSettings> {
    return this.appService.updateChapterNarrationSettings(
      projectSlug,
      chapterNumber,
      request,
      requestId,
    );
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

  @Patch('chapters/1/reels/:episodeId/status')
  @ApiOperation({ summary: 'Transition a reel through production approval.' })
  updateEpisodeStatus(
    @Param('episodeId', ParseIntPipe) episodeId: number,
    @Body() request: UpdateReelStatusDto,
    @Headers('x-request-id') requestId?: string,
  ): Promise<ReelEpisode> {
    return this.appService.updateEpisodeStatus(episodeId, request, requestId);
  }

  @Get('render-jobs')
  @ApiOperation({ summary: 'Return queued render jobs for audit/debugging.' })
  getRenderJobs(@Query('episodeId') episodeId?: string): Promise<RenderJob[]> {
    return this.appService.getRenderJobs(toOptionalPositiveInt(episodeId));
  }

  @Get('render-jobs/stale')
  @ApiOperation({
    summary: 'Return queued/running render jobs with stale heartbeats.',
  })
  getStaleRenderJobs(
    @Query('maxAgeSeconds', new DefaultValuePipe(900), ParseIntPipe)
    maxAgeSeconds = 900,
  ): Promise<RenderJob[]> {
    return this.appService.getStaleRenderJobs(
      toNonNegativeInt(maxAgeSeconds, 'maxAgeSeconds'),
    );
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
    return this.appService.markStaleRenderJobsFailed(
      toNonNegativeInt(maxAgeSeconds, 'maxAgeSeconds'),
      requestId,
    );
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
  createRenderJob(
    @Body() request: CreateRenderJobDto,
    @Headers('x-request-id') requestId?: string,
  ): Promise<RenderJob> {
    return this.appService.createRenderJob(request, requestId);
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

  @Get('render-jobs/:jobId/attempts')
  @ApiOperation({ summary: 'List retry and failure history for a render job.' })
  getRenderJobAttempts(
    @Param('jobId') jobId: string,
  ): Promise<RenderJobAttempt[]> {
    return this.appService.getRenderJobAttempts(jobId);
  }

  @Get('render-jobs/:jobId/logs')
  @ApiOperation({ summary: 'List persisted worker output for a render job.' })
  getRenderJobLogs(@Param('jobId') jobId: string): Promise<RenderJobLog[]> {
    return this.appService.getRenderJobLogs(jobId);
  }

  @Post('render-jobs/:jobId/logs')
  @ApiOperation({ summary: 'Persist one structured renderer log event.' })
  createRenderJobLog(
    @Param('jobId') jobId: string,
    @Body() request: CreateRenderJobLogDto,
  ): Promise<RenderJobLog> {
    return this.appService.createRenderJobLog(jobId, request);
  }

  @Post('render-jobs/:jobId/retry')
  @ApiOperation({ summary: 'Requeue a failed render job as a new attempt.' })
  retryRenderJob(
    @Param('jobId') jobId: string,
    @Body() request: RetryRenderJobDto,
    @Headers('x-request-id') requestId?: string,
  ): Promise<RenderJob> {
    return this.appService.retryRenderJob(jobId, request.notes, requestId);
  }

  @Get('generated-assets')
  @ApiOperation({ summary: 'List generated asset manifests.' })
  getGeneratedAssets(
    @Query('renderJobId') renderJobId?: string,
    @Query('episodeId') episodeId?: string,
  ): Promise<GeneratedAssetManifest[]> {
    return this.appService.getGeneratedAssets({
      renderJobId,
      episodeId: toOptionalPositiveInt(episodeId),
    });
  }

  @Post('generated-assets')
  @ApiOperation({ summary: 'Persist a generated asset manifest.' })
  createGeneratedAsset(
    @Body() request: CreateGeneratedAssetDto,
    @Headers('x-request-id') requestId?: string,
  ): Promise<GeneratedAssetManifest> {
    return this.appService.createGeneratedAsset(request, requestId);
  }

  @Get('generated-assets/:assetId/content')
  @ApiOperation({ summary: 'Stream a local generated asset for review.' })
  async getGeneratedAssetContent(
    @Param('assetId') assetId: string,
  ): Promise<StreamableFile> {
    const content = await this.appService.getGeneratedAssetContent(assetId);
    return new StreamableFile(createReadStream(content.filePath), {
      type: content.contentType,
      disposition: `inline; filename="${content.filename.replace(/"/g, '')}"`,
    });
  }

  @Patch('generated-assets/:assetId/review')
  @ApiOperation({ summary: 'Approve, reject, or reset an asset review.' })
  updateGeneratedAssetReview(
    @Param('assetId') assetId: string,
    @Body() request: UpdateGeneratedAssetReviewDto,
    @Headers('x-request-id') requestId?: string,
  ): Promise<GeneratedAssetManifest> {
    return this.appService.updateGeneratedAssetReview(
      assetId,
      request,
      requestId,
    );
  }

  @Post('generated-assets/:assetId/regenerate')
  @ApiOperation({ summary: 'Queue a replacement render for one asset.' })
  regenerateGeneratedAsset(
    @Param('assetId') assetId: string,
    @Body() request: RegenerateGeneratedAssetDto,
    @Headers('x-request-id') requestId?: string,
  ): Promise<RenderJob> {
    return this.appService.regenerateGeneratedAsset(
      assetId,
      request.notes,
      requestId,
    );
  }
}

function toOptionalPositiveInt(value?: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestException('Query value must be a positive integer.');
  }
  return parsed;
}

function toNonNegativeInt(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new BadRequestException(`${fieldName} must be zero or greater.`);
  }
  return value;
}
