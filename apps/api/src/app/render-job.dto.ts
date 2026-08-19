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
import type { RenderJobRequest } from '@sumer-reel-forge/reel-core';

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
