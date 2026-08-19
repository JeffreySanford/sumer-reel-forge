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
  @IsInt()
  @Min(1)
  episodeId!: number;

  @IsIn(['storyboard', 'draft-video', 'final-video'])
  mode!: RenderJobRequest['mode'];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  voice?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
