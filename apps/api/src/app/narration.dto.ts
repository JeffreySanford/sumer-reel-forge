import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  NarrationRoleType,
  NarrationStylePreset,
  UpdateChapterNarrationRoleRequest,
  UpdateChapterNarrationSettingsRequest,
} from '@sumer-reel-forge/reel-core';

const STYLE_PRESETS: NarrationStylePreset[] = [
  'documentary',
  'intimate',
  'mythic',
  'dramatic',
  'archival',
];
const ROLE_TYPES: NarrationRoleType[] = [
  'narrator',
  'character',
  'archival',
  'chorus',
];

export class UpdateChapterNarrationRoleDto
  implements UpdateChapterNarrationRoleRequest
{
  @ApiProperty({ example: 'ninhursag' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(80)
  roleKey!: string;

  @ApiProperty({ example: 'Ninhursag' })
  @IsString()
  @MaxLength(120)
  displayName!: string;

  @ApiProperty({ enum: ROLE_TYPES, example: 'character' })
  @IsIn(ROLE_TYPES)
  roleType!: NarrationRoleType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  voiceProfileId?: string;

  @ApiPropertyOptional({ enum: STYLE_PRESETS, example: 'intimate' })
  @IsOptional()
  @IsIn(STYLE_PRESETS)
  stylePreset?: NarrationStylePreset;

  @ApiProperty({ example: 'Warm, maternal, reflective, with patient pacing.' })
  @IsString()
  @MaxLength(1000)
  styleNotes!: string;
}

export class UpdateChapterNarrationSettingsDto
  implements UpdateChapterNarrationSettingsRequest
{
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  storyVoiceProfileId!: string;

  @ApiProperty({ enum: STYLE_PRESETS, example: 'mythic' })
  @IsIn(STYLE_PRESETS)
  storyStylePreset!: NarrationStylePreset;

  @ApiProperty({ example: 'Mature, intimate, and restrained.' })
  @IsString()
  @MaxLength(1000)
  storyStyleNotes!: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  useStoryDefault!: boolean;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  chapterVoiceProfileId?: string;

  @ApiPropertyOptional({ enum: STYLE_PRESETS, example: 'intimate' })
  @IsOptional()
  @IsIn(STYLE_PRESETS)
  chapterStylePreset?: NarrationStylePreset;

  @ApiPropertyOptional({
    example: 'First-person maternal recollection with an older cadence.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  chapterStyleNotes?: string;

  @ApiProperty({ type: [UpdateChapterNarrationRoleDto] })
  @IsArray()
  @ArrayMaxSize(24)
  @ValidateNested({ each: true })
  @Type(() => UpdateChapterNarrationRoleDto)
  roles!: UpdateChapterNarrationRoleDto[];
}
