import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export const ANIMATION_JOB_OPERATIONS = [
  'plan',
  'preflight',
  'generate',
  'verify',
  'run',
  'candidates',
] as const;

export type AnimationJobOperation = (typeof ANIMATION_JOB_OPERATIONS)[number];

export class CreateAnimationJobDto {
  @ApiProperty({ example: 4, minimum: 1 })
  @IsInt()
  @Min(1)
  shot!: number;

  @ApiPropertyOptional({ example: 'shot04-surface-refraction-v1' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  layer?: string;

  @ApiProperty({ enum: ANIMATION_JOB_OPERATIONS, example: 'run' })
  @IsIn(ANIMATION_JOB_OPERATIONS)
  operation!: AnimationJobOperation;

  @ApiPropertyOptional({ example: 'Candidate-only production pass.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class ClaimAnimationJobDto {
  @ApiProperty({ example: 'local-animation-worker' })
  @IsString()
  @MaxLength(120)
  workerId!: string;
}

export class HeartbeatAnimationJobDto {
  @ApiPropertyOptional({ example: 'Worker still processing the production lane.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateAnimationJobStatusDto {
  @ApiProperty({ enum: ['queued', 'running', 'complete', 'failed'] })
  @IsIn(['queued', 'running', 'complete', 'failed'])
  status!: 'queued' | 'running' | 'complete' | 'failed';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CreateAnimationJobLogDto {
  @ApiPropertyOptional({ example: 'local-animation-worker' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  workerId?: string;

  @ApiProperty({ enum: ['info', 'warn', 'error'] })
  @IsIn(['info', 'warn', 'error'])
  level!: 'info' | 'warn' | 'error';

  @ApiProperty({ enum: ['stdout', 'stderr', 'system'] })
  @IsIn(['stdout', 'stderr', 'system'])
  stream!: 'stdout' | 'stderr' | 'system';

  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  message!: string;
}

export class RetryAnimationJobDto {
  @ApiPropertyOptional({ example: 'Retry after a transient local service interruption.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
