import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateShotPlanDto } from './planning.dto';
import type {
  PlanningProviderCapability,
  PlanningProviderId,
  ShotPlanProposal,
} from './planning-provider';
import { PlanningService } from './planning.service';

@Controller('planning')
@ApiTags('planning')
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @Get('capabilities')
  @ApiOperation({
    summary: 'Report deterministic and local Ollama planning capabilities.',
  })
  getCapabilities(): Promise<{
    defaultProvider: PlanningProviderId;
    providers: PlanningProviderCapability[];
  }> {
    return this.planningService.getCapabilities();
  }

  @Post('shot-plan')
  @ApiOperation({
    summary: 'Create a structured shot-plan scaffold or Ollama proposal.',
  })
  proposeShotPlan(@Body() request: CreateShotPlanDto): Promise<ShotPlanProposal> {
    return this.planningService.proposeShotPlan(request);
  }
}
