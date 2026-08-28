import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class RenderForgeShot01WaterAuditionDto {
  @ApiProperty({
    type: Object,
    description:
      'Normalized non-canonical water-motion controls. Exactly four allowlisted values from 0 through 1 are accepted.',
    example: {
      horizontalCurrent: 0.34,
      verticalRipple: 0.22,
      flowSpeed: 0.38,
      rippleScale: 0.46,
    },
  })
  @IsObject()
  parameters!: Record<string, unknown>;
}
