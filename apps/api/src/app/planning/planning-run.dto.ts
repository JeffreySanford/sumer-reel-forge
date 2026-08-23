import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CreateShotPlanDto } from './planning.dto';
import type { ShotPlanProposal } from './planning-provider';

export class CreatePlanningRunDto extends CreateShotPlanDto {
  @ApiProperty({ example: 'blessings-of-sumer' })
  @IsString()
  @IsNotEmpty()
  projectSlug!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  chapterNumber!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  episodeNumber!: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  shotNumber!: number;
}

export class LatestPlanningRunQueryDto {
  @ApiProperty({ example: 'blessings-of-sumer' })
  @IsString()
  @IsNotEmpty()
  projectSlug!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  chapterNumber!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  episodeNumber!: number;

  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  shotNumber!: number;
}

export class UpdatePlanningRunProposalDto {
  @ApiProperty({ type: Object })
  @IsObject()
  proposal!: ShotPlanProposal;
}

export class ReviewPlanningRunDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
