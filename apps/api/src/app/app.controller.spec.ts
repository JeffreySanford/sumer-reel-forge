import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
  });

  describe('getChapterOneSummary', () => {
    it('returns the full chapter one reel outline', () => {
      const appController = app.get<AppController>(AppController);
      expect(appController.getChapterOneSummary()).toHaveLength(18);
    });
  });

  describe('getEpisode', () => {
    it('returns the first storyboarded episode', () => {
      const appController = app.get<AppController>(AppController);
      expect(appController.getEpisode(1).title).toBe('The Voyage Begins');
    });
  });
});
