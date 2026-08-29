import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AnimationJobsController } from './animation-jobs.controller';
import { AnimationJobsService } from './animation-jobs.service';
import { AnimationProductionEvidenceService } from './animation-production-evidence.service';
import { AnimationProductionStatusService } from './animation-production-status.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ComfyUiInventoryService } from './comfyui-inventory.service';
import { ForgeMotionProposalController } from './forge/forge-motion-proposal.controller';
import { ForgeMotionProposalService } from './forge/forge-motion-proposal.service';
import { ForgeShot01WaterAuditionController } from './forge/forge-shot01-water-audition.controller';
import { ForgeShot01WaterAuditionService } from './forge/forge-shot01-water-audition.service';
import { LocalAiController } from './local-ai/local-ai.controller';
import { LocalAiService } from './local-ai/local-ai.service';
import { OllamaLocalAiProvider } from './local-ai/ollama-local-ai.provider';
import { DeterministicPlanningProvider } from './planning/deterministic-planning.provider';
import { OllamaPlanningProvider } from './planning/ollama-planning.provider';
import { PlanningController } from './planning/planning.controller';
import { PlanningService } from './planning/planning.service';
import { PrismaService } from './prisma.service';
import { PrismaReelRepository, REEL_REPOSITORY } from './reel.repository';
import { RequestLoggingMiddleware } from './request-logging.middleware';
import { RuntimeCapabilitiesService } from './runtime-capabilities.service';
import { RuntimeController } from './runtime.controller';
import { RuntimeGpuStatusService } from './runtime-gpu-status.service';

@Module({
  imports: [],
  controllers: [
    AppController,
    PlanningController,
    RuntimeController,
    AnimationJobsController,
    LocalAiController,
    ForgeMotionProposalController,
    ForgeShot01WaterAuditionController,
  ],
  providers: [
    AppService,
    PlanningService,
    DeterministicPlanningProvider,
    OllamaLocalAiProvider,
    OllamaPlanningProvider,
    LocalAiService,
    ForgeMotionProposalService,
    ForgeShot01WaterAuditionService,
    RuntimeCapabilitiesService,
    RuntimeGpuStatusService,
    ComfyUiInventoryService,
    AnimationProductionStatusService,
    AnimationProductionEvidenceService,
    AnimationJobsService,
    PrismaService,
    {
      provide: REEL_REPOSITORY,
      useClass: PrismaReelRepository,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestLoggingMiddleware)
      .forRoutes(
        AppController,
        PlanningController,
        RuntimeController,
        AnimationJobsController,
        LocalAiController,
        ForgeMotionProposalController,
        ForgeShot01WaterAuditionController,
      );
  }
}
