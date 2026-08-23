import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { InMemoryReelRepository, REEL_REPOSITORY } from './reel.repository';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: REEL_REPOSITORY,
          useClass: InMemoryReelRepository,
        },
        {
          provide: PrismaService,
          useValue: {
            renderJob: {},
            generatedAsset: {},
          },
        },
      ],
    }).compile();
  });

  describe('getChapterOneSummary', () => {
    it('returns the full chapter one reel outline', async () => {
      const appController = app.get<AppController>(AppController);
      await expect(appController.getChapterOneSummary()).resolves.toHaveLength(
        18,
      );
    });
  });

  describe('getEpisode', () => {
    it('returns the first storyboarded episode', async () => {
      const appController = app.get<AppController>(AppController);
      await expect(appController.getEpisode(1)).resolves.toMatchObject({
        title: 'The Voyage Begins',
      });
    });
  });

  describe('getStaleRenderJobs', () => {
    it('returns stale render jobs', async () => {
      const appController = app.get<AppController>(AppController);
      await expect(appController.getStaleRenderJobs(0)).resolves.toEqual([]);
    });
  });
});
