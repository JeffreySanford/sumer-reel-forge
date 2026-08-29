import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { createReadStream } from 'node:fs';
import { RenderForgeShot01WaterAuditionDto } from './forge-shot01-water-audition.dto';
import { ForgeShot01WaterAuditionService } from './forge-shot01-water-audition.service';

@Controller('forge/shot-1-water-auditions')
@ApiTags('forge')
export class ForgeShot01WaterAuditionController {
  constructor(private readonly auditions: ForgeShot01WaterAuditionService) {}

  @Post()
  @ApiOperation({
    summary:
      'Render a non-canonical Shot 1 water-motion audition from normalized Forge controls without mutating animation-v1.',
  })
  async render(@Body() dto: RenderForgeShot01WaterAuditionDto) {
    return await this.auditions.render(dto);
  }

  @Get('source')
  @ApiOperation({
    summary:
      'Stream the exact approved Shot 1 editorial source used by the live Forge tuning preview.',
  })
  async source(): Promise<StreamableFile> {
    const content = await this.auditions.getSource();
    return new StreamableFile(createReadStream(content.filePath), {
      type: 'image/png',
      disposition: `inline; filename="${content.filename.replace(/"/g, '')}"`,
    });
  }

  @Get(':id/video')
  @ApiOperation({
    summary: 'Stream one locally rendered non-canonical Shot 1 water audition.',
  })
  async video(@Param('id') id: string): Promise<StreamableFile> {
    const content = await this.auditions.getVideo(id);
    return new StreamableFile(createReadStream(content.filePath), {
      type: 'video/mp4',
      disposition: `inline; filename="${content.filename.replace(/"/g, '')}"`,
    });
  }
}
