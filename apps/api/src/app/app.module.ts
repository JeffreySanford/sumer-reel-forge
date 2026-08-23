import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AnimationProductionEvidenceService } from './animation-production-evidence.service';
import { AnimationProductionStatusService } from './animation-production-status.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ComfyUiInventoryService } from './comfyui-inventory.service';
import { DeterministicPlanningProvider } from './planning/deterministic-planning.provider';
import { OllamaPlanningProvider } from './planning/ollama-planning.provider';
import { PlanningController } from './planning/planning.controller';
import { PlanningService } from './planning/planning.service';
import { PrismaService } from './prisma.service';
import { PrismaReelRepository, REEL_REPOSITORY } from './reel.repository';
import { RequestLoggingMiddleware } from './request-logging.middleware';
import { RuntimeCapabilitiesService } from './runtime-capabilities.service';
import { RuntimeController } from './runtime.controller';

@Module({
  imports: [],
  controllers: [AppController, PlanningController, RuntimeController],
  providers: [
    AppService,
    PlanningService,
    DeterministicPlanningProvider,
    OllamaPlanningProvider,
    RuntimeCapabilitiesService,
    ComfyUiInventoryService,
    AnimationProductionStatusService,
    AnimationProductionEvidenceService,
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
      .forRoutes(AppController, PlanningController, RuntimeController);
  }
}
