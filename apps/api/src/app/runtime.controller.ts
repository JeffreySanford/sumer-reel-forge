import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RuntimeCapabilitiesService } from './runtime-capabilities.service';

@Controller('runtime')
@ApiTags('runtime')
export class RuntimeController {
  constructor(private readonly runtimeCapabilities: RuntimeCapabilitiesService) {}

  @Get('capabilities')
  @ApiOperation({
    summary: 'Return current host hardware, software, runtime plan, and projected local capabilities.',
  })
  getCapabilities() {
    return this.runtimeCapabilities.getCapabilities();
  }
}
