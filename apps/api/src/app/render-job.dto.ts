import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
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
