import { Controller, Get, Query } from '@nestjs/common';
import type { LocalAiProviderId } from './local-ai.provider';
import { LocalAiService } from './local-ai.service';

@Controller('local-ai')
export class LocalAiController {
  constructor(private readonly localAi: LocalAiService) {}

  @Get('providers')
  async providers() {
    return await this.localAi.listProviders();
  }

  @Get('models')
  async models(@Query('provider') provider?: LocalAiProviderId) {
    return await this.localAi.listModels(provider);
  }
}
