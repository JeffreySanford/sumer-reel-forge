import { Test } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = app.get<AppService>(AppService);
  });

  describe('getHealth', () => {
    it('returns health status', () => {
      expect(service.getHealth()).toEqual({
        status: 'ok',
        service: 'sumer-reel-forge-api',
      });
    });
  });

  describe('createRenderJob', () => {
    it('queues a render job for an existing episode', () => {
      const job = service.createRenderJob({
        episodeId: 1,
        mode: 'storyboard',
        notes: 'First local pipeline test',
      });

      expect(job.status).toBe('queued');
      expect(service.getRenderJobs()[0]).toEqual(job);
    });
  });
});
