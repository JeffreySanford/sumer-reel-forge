import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { PrismaReelRepository, REEL_REPOSITORY } from './reel.repository';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    {
      provide: REEL_REPOSITORY,
      useClass: PrismaReelRepository,
    },
  ],
})
export class AppModule {}
