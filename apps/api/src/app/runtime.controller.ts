import { Controller, Get, Param, ParseIntPipe, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { createReadStream } from 'node:fs';
import {
  AnimationProductionEvidenceService,
  type AnimationEvidenceKind,
} from './animation-production-evidence.service';
import { AnimationProductionStatusService } from './animation-production-status.service';
import { ComfyUiInventoryService } from './comfyui-inventory.service';
import { RuntimeCapabilitiesService } from './runtime-capabilities.service';

@Controller('runtime')
@ApiTags('runtime')
export class RuntimeController {
  constructor(
    private readonly runtimeCapabilities: RuntimeCapabilitiesService,
    private readonly comfyUiInventory: ComfyUiInventoryService,
    private readonly animationProductionStatus: AnimationProductionStatusService,
    private readonly animationProductionEvidence: AnimationProductionEvidenceService,
  ) {}

  @Get('capabilities')
  @ApiOperation({
    summary: 'Return current host hardware, software, runtime plan, and projected local capabilities.',
  })
  getCapabilities() {
    return this.runtimeCapabilities.getCapabilities();
  }

  @Get('comfyui-inventory')
  @ApiOperation({
    summary: 'Inspect the connected ComfyUI node and resource inventory without queueing a GPU workflow.',
  })
  getComfyUiInventory() {
    return this.comfyUiInventory.getInventory();
  }

  @Get('animation-production')
  @ApiOperation({
    summary:
      'Return manifest-backed animation production readiness, checksum verification, lane selection, and inherited style decisions.',
  })
  getAnimationProductionStatus() {
    return this.animationProductionStatus.getStatus();
  }

  @Get('animation-production-evidence')
  @ApiOperation({
    summary:
      'Return locally rendered Scene V2 benchmark video and contact-sheet availability for the production cockpit.',
  })
  getAnimationProductionEvidence() {
    return this.animationProductionEvidence.getStatus();
  }

  @Get('animation-production/evidence/:shotNumber/:kind')
  @ApiOperation({
    summary:
      'Stream one local Scene V2 benchmark video or contact sheet for production review.',
  })
  async getAnimationProductionEvidenceContent(
    @Param('shotNumber', ParseIntPipe) shotNumber: number,
    @Param('kind') rawKind: string,
  ): Promise<StreamableFile> {
    const kind = parseEvidenceKind(rawKind);
    const content = await this.animationProductionEvidence.getContent(
      shotNumber,
      kind,
    );
    return new StreamableFile(createReadStream(content.filePath), {
      type: content.contentType,
      disposition: `inline; filename="${content.filename.replace(/"/g, '')}"`,
    });
  }
}

function parseEvidenceKind(value: string): AnimationEvidenceKind {
  if (value === 'video' || value === 'contact-sheet') return value;
  throw new Error(`Unsupported animation evidence kind: ${value}`);
}
