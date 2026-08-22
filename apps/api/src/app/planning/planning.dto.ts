import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import type { PlanningProviderId } from './planning-provider';

export class CreateShotPlanDto {
  @ApiProperty({ example: 'enki-at-the-helm' })
  @IsString()
  @IsNotEmpty()
  shotId!: string;

  @ApiProperty({ example: 'Establish Enki as the visual anchor of the voyage.' })
  @IsString()
  @IsNotEmpty()
  storyFunction!: string;

  @ApiProperty({ example: 'calm authority' })
  @IsString()
  @IsNotEmpty()
  emotionalPurpose!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  narration?: string;

  @ApiPropertyOptional({ example: 'enki-face' })
  @IsOptional()
  @IsString()
  eyeTarget?: string;

  @ApiPropertyOptional({ example: 'enki-facial-identity' })
  @IsOptional()
  @IsString()
  stillnessAnchor?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  styleRules?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  constraints?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableAssets?: string[];

  @ApiPropertyOptional({ enum: ['deterministic', 'ollama'] })
  @IsOptional()
  @IsIn(['deterministic', 'ollama'])
  provider?: PlanningProviderId;
}
