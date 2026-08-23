import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
}
