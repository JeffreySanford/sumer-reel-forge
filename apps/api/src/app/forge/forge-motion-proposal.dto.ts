import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { LocalAiProviderId } from '../local-ai/local-ai.provider';

export const FORGE_MOTION_SHOTS = [3, 4] as const;
export const FORGE_LOCAL_AI_PROVIDERS: LocalAiProviderId[] = [
  'ollama',
  'llamacpp',
  'lmstudio',
  'nvidia-nim',
];

export class CreateForgeMotionProposalDto {
  @ApiProperty({ enum: FORGE_MOTION_SHOTS, example: 3 })
  @IsInt()
  @IsIn(FORGE_MOTION_SHOTS)
  shot!: 3 | 4;

  @ApiPropertyOptional({
    enum: FORGE_LOCAL_AI_PROVIDERS,
    default: 'ollama',
    description: 'Provider must already be registered by LocalAiService.',
  })
  @IsOptional()
  @IsIn(FORGE_LOCAL_AI_PROVIDERS)
  provider?: LocalAiProviderId;

  @ApiPropertyOptional({
    example: 'qwen3:8b',
    description: 'Defaults to the selected provider configured text model.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  model?: string;

  @ApiPropertyOptional({
    example: 'Make the vessel feel heavier without increasing character motion.',
    description: 'Optional bounded human direction included in the proposal context.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  direction?: string;
}

export class AcceptForgeMotionProposalDto {
  @ApiProperty({
    type: Object,
    description:
      'The server-issued Forge motion proposal being explicitly accepted for review.',
  })
  @IsObject()
  proposal!: Record<string, unknown>;

  @ApiProperty({
    type: Object,
    description:
      'Human-adjusted normalized working values keyed only by the proposal motion-channel ids.',
    example: {
      vesselHeave: 0.72,
      vesselRoll: 0.24,
      enkiCounterSway: 0.44,
      cameraPush: 0.22,
    },
  })
  @IsObject()
  workingParameters!: Record<string, unknown>;

  @ApiPropertyOptional({
    example: 'Make the vessel feel heavier without increasing character motion.',
    description:
      'Optional human direction retained as non-canonical review provenance.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1200)
  direction?: string;
}
