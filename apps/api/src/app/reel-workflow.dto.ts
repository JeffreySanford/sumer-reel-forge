import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { UpdateReelStatusRequest } from '@sumer-reel-forge/reel-core';

export class UpdateReelStatusDto implements UpdateReelStatusRequest {
  @ApiProperty({
    enum: ['draft', 'review', 'approved', 'rendering', 'published'],
    example: 'review',
  })
  @IsIn(['draft', 'review', 'approved', 'rendering', 'published'])
  status!: UpdateReelStatusRequest['status'];

  @ApiPropertyOptional({ example: 'Narration and visual continuity reviewed.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
