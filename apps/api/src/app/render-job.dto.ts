import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import type {
  ClaimRenderJobRequest,
  CreateRenderJobLogRequest,
  RenderJobRequest,
} from '@sumer-reel-forge/reel-core';

export class CreateRenderJobDto implements RenderJobRequest {
  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  episodeId!: number;

  @ApiProperty({
    enum: ['storyboard', 'draft-video', 'final-video'],
    example: 'storyboard',
  })
  @IsIn(['storyboard', 'draft-video', 'final-video'])
  mode!: RenderJobRequest['mode'];

  @ApiPropertyOptional({ example: 'calm mythic narrator' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  voice?: string;

  @ApiPropertyOptional({ example: 'First local prototype' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateRenderJobStatusDto {
  @ApiProperty({
    enum: ['queued', 'running', 'complete', 'failed'],
    example: 'running',
  })
  @IsIn(['queued', 'running', 'complete', 'failed'])
  status!: 'queued' | 'running' | 'complete' | 'failed';

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  heartbeat?: boolean;

  @ApiPropertyOptional({ example: 'Renderer worker accepted the job.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class HeartbeatRenderJobDto {
  @ApiPropertyOptional({ example: 'Renderer worker still processing frames.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class ClaimRenderJobDto implements ClaimRenderJobRequest {
  @ApiProperty({ example: 'local-renderer-worker' })
  @IsString()
  @MaxLength(120)
  workerId!: string;
}

export class CreateRenderJobLogDto implements CreateRenderJobLogRequest {
  @ApiPropertyOptional({ example: 'local-renderer-worker' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  workerId?: string;

  @ApiProperty({ enum: ['info', 'warn', 'error'], example: 'info' })
  @IsIn(['info', 'warn', 'error'])
  level!: CreateRenderJobLogRequest['level'];

  @ApiProperty({ enum: ['stdout', 'stderr', 'system'], example: 'stdout' })
  @IsIn(['stdout', 'stderr', 'system'])
  stream!: CreateRenderJobLogRequest['stream'];

  @ApiProperty({ example: 'FFmpeg assembled the final video.' })
  @IsString()
  @MaxLength(4000)
  message!: string;
}

export class RetryRenderJobDto {
  @ApiPropertyOptional({
    example: 'Retry after correcting the renderer configuration.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
