import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type {
  CreateGeneratedAssetRequest,
  ReelExportMetadata,
  ReelShot,
  TimedText,
  UpdateReelProductionRequest,
} from '@sumer-reel-forge/reel-core';

export class TimedTextDto implements TimedText {
  @ApiProperty({ example: '00:08' })
  @IsString()
  @MaxLength(16)
  time!: string;

  @ApiProperty({ example: 'A boat crossed the Absu.' })
  @IsString()
  @MaxLength(160)
  text!: string;
}

export class ReelShotDto implements ReelShot {
  @ApiProperty({ example: '00:00-00:06' })
  @IsString()
  @MaxLength(24)
  time!: string;

  @ApiProperty({ example: 6, minimum: 1, maximum: 30 })
  @IsInt()
  @Min(1)
  @Max(30)
  durationSeconds!: number;

  @ApiProperty({ example: 'Black water before dawn.' })
  @IsString()
  @MaxLength(1000)
  visual!: string;

  @ApiProperty({ example: 'slow push in' })
  @IsString()
  @MaxLength(240)
  motion!: string;

  @ApiProperty({ example: 'cinematic ancient Mesopotamian myth' })
  @IsString()
  @MaxLength(2000)
  prompt!: string;
}

export class ReelExportMetadataDto implements ReelExportMetadata {
  @ApiProperty({ example: 'Facebook-ready caption.' })
  @IsString()
  @MaxLength(1200)
  facebookCaption!: string;

  @ApiProperty({ example: 'Short X post.' })
  @IsString()
  @MaxLength(280)
  xPost!: string;

  @ApiProperty({ example: 'TikTok caption with tags.' })
  @IsString()
  @MaxLength(2200)
  tiktokCaption!: string;

  @ApiProperty({ example: 'YouTube Shorts title' })
  @IsString()
  @MaxLength(100)
  youtubeShortsTitle!: string;

  @ApiProperty({ type: [String], example: ['Sumer', 'Mythology'] })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags!: string[];
}

export class UpdateReelProductionDto implements UpdateReelProductionRequest {
  @ApiProperty({ example: 'A concise production logline.' })
  @IsString()
  @MaxLength(1000)
  logline!: string;

  @ApiProperty({ example: 'Narration script for the reel.' })
  @IsString()
  @MaxLength(8000)
  narration!: string;

  @ApiProperty({ type: [TimedTextDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => TimedTextDto)
  onScreenText!: TimedTextDto[];

  @ApiProperty({ type: [ReelShotDto] })
  @IsArray()
  @ArrayMaxSize(24)
  @ValidateNested({ each: true })
  @Type(() => ReelShotDto)
  shots!: ReelShotDto[];

  @ApiProperty({ example: 'Low frame drum and water ambience.' })
  @IsString()
  @MaxLength(1000)
  musicDirection!: string;

  @ApiProperty({ example: 'Calm mythic narrator.' })
  @IsString()
  @MaxLength(1000)
  voiceDirection!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(400, { each: true })
  platformNotes!: string[];

  @ApiProperty({ type: ReelExportMetadataDto })
  @ValidateNested()
  @Type(() => ReelExportMetadataDto)
  exportMetadata!: ReelExportMetadataDto;
}

export class CreateGeneratedAssetDto implements CreateGeneratedAssetRequest {
  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsString()
  renderJobId?: string;

  @ApiProperty({
    enum: ['image', 'audio', 'captions', 'video', 'manifest', 'other'],
    example: 'image',
  })
  @IsIn(['image', 'audio', 'captions', 'video', 'manifest', 'other'])
  assetType!: CreateGeneratedAssetRequest['assetType'];

  @ApiProperty({ example: 'file:///d/repos/sumer-reel-forge/tmp/render.png' })
  @IsString()
  @MaxLength(2000)
  uri!: string;

  @ApiPropertyOptional({ example: 'sha256:abc123' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  checksum?: string;

  @ApiPropertyOptional({ example: { width: 1080, height: 1920 } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
