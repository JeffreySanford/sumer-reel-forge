import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateShotPlanDto } from './planning.dto';
import {
  CreatePlanningRunDto,
  LatestPlanningRunQueryDto,
  ReviewPlanningRunDto,
  UpdatePlanningRunProposalDto,
} from './planning-run.dto';
import type { PlanningRunView } from './planning-run';
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
    summary: 'Create a stateless structured shot-plan scaffold or Ollama proposal.',
  })
  proposeShotPlan(@Body() request: CreateShotPlanDto): Promise<ShotPlanProposal> {
    return this.planningService.proposeShotPlan(request);
  }

  @Post('runs')
  @ApiOperation({
    summary: 'Generate and persist a planning proposal for human review.',
  })
  createPlanningRun(@Body() request: CreatePlanningRunDto): Promise<PlanningRunView> {
    return this.planningService.createPlanningRun(request);
  }

  @Get('runs/latest')
  @ApiOperation({
    summary: 'Load the latest planning run for one reel shot.',
  })
  getLatestPlanningRun(
    @Query() query: LatestPlanningRunQueryDto,
  ): Promise<PlanningRunView | null> {
    return this.planningService.getLatestPlanningRun(query);
  }

  @Patch('runs/:runId/proposal')
  @ApiOperation({
    summary: 'Persist human edits to the working planning proposal.',
  })
  updatePlanningRunProposal(
    @Param('runId') runId: string,
    @Body() request: UpdatePlanningRunProposalDto,
  ): Promise<PlanningRunView> {
    return this.planningService.updatePlanningRunProposal(runId, request);
  }

  @Patch('runs/:runId/review')
  @ApiOperation({
    summary: 'Approve or reject a persisted planning proposal.',
  })
  reviewPlanningRun(
    @Param('runId') runId: string,
    @Body() request: ReviewPlanningRunDto,
  ): Promise<PlanningRunView> {
    return this.planningService.reviewPlanningRun(runId, request);
  }
}
