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
import {
  ClaimAnimationJobDto,
  CreateAnimationJobDto,
  CreateAnimationJobLogDto,
  HeartbeatAnimationJobDto,
  RetryAnimationJobDto,
  UpdateAnimationJobStatusDto,
} from './animation-job.dto';
import {
  AnimationJobsService,
  type AnimationJobAttemptRecord,
  type AnimationJobLogRecord,
  type AnimationJobRecord,
} from './animation-jobs.service';

@Controller('animation-jobs')
@ApiTags('animation-jobs')
export class AnimationJobsController {
  constructor(private readonly jobs: AnimationJobsService) {}

  @Post()
  @ApiOperation({ summary: 'Queue an animation production operation without promotion.' })
  create(@Body() request: CreateAnimationJobDto): Promise<AnimationJobRecord> {
    return this.jobs.create(request);
  }

  @Get()
  @ApiOperation({ summary: 'List recent animation production jobs.' })
  list(): Promise<AnimationJobRecord[]> {
    return this.jobs.list();
  }

  @Get('stale')
  @ApiOperation({ summary: 'List animation jobs whose heartbeat is stale.' })
  stale(
    @Query('maxAgeSeconds', new DefaultValuePipe(900), ParseIntPipe) maxAgeSeconds = 900,
  ): Promise<AnimationJobRecord[]> {
    return this.jobs.stale(maxAgeSeconds);
  }

  @Post('watchdog/stale')
  @ApiOperation({ summary: 'Fail stale queued/running animation jobs.' })
  failStale(
    @Query('maxAgeSeconds', new DefaultValuePipe(900), ParseIntPipe) maxAgeSeconds = 900,
  ): Promise<AnimationJobRecord[]> {
    return this.jobs.failStale(maxAgeSeconds);
  }

  @Post('claim')
  @ApiOperation({ summary: 'Claim the next queued animation operation.' })
  claim(@Body() request: ClaimAnimationJobDto): Promise<AnimationJobRecord | null> {
    return this.jobs.claim(request);
  }

  @Get(':jobId')
  @ApiOperation({ summary: 'Get one animation job.' })
  get(@Param('jobId') jobId: string): Promise<AnimationJobRecord> {
    return this.jobs.get(jobId);
  }

  @Patch(':jobId/status')
  @ApiOperation({ summary: 'Update animation job status.' })
  updateStatus(
    @Param('jobId') jobId: string,
    @Body() request: UpdateAnimationJobStatusDto,
  ): Promise<AnimationJobRecord> {
    return this.jobs.updateStatus(jobId, request);
  }

  @Patch(':jobId/heartbeat')
  @ApiOperation({ summary: 'Record an animation worker heartbeat.' })
  heartbeat(
    @Param('jobId') jobId: string,
    @Body() request: HeartbeatAnimationJobDto,
  ): Promise<AnimationJobRecord> {
    return this.jobs.heartbeat(jobId, request.notes);
  }

  @Get(':jobId/attempts')
  @ApiOperation({ summary: 'List animation job attempts.' })
  attempts(@Param('jobId') jobId: string): Promise<AnimationJobAttemptRecord[]> {
    return this.jobs.listAttempts(jobId);
  }

  @Get(':jobId/logs')
  @ApiOperation({ summary: 'List persisted animation worker output.' })
  logs(@Param('jobId') jobId: string): Promise<AnimationJobLogRecord[]> {
    return this.jobs.listLogs(jobId);
  }

  @Post(':jobId/logs')
  @ApiOperation({ summary: 'Persist one animation worker log event.' })
  createLog(
    @Param('jobId') jobId: string,
    @Body() request: CreateAnimationJobLogDto,
  ): Promise<AnimationJobLogRecord> {
    return this.jobs.createLog(jobId, request);
  }

  @Post(':jobId/retry')
  @ApiOperation({ summary: 'Explicitly requeue a failed animation job.' })
  retry(
    @Param('jobId') jobId: string,
    @Body() request: RetryAnimationJobDto,
  ): Promise<AnimationJobRecord> {
    return this.jobs.retry(jobId, request.notes);
  }
}
