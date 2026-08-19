import { Test } from '@nestjs/testing';
import { AppService } from './app.service';
import { InMemoryReelRepository, REEL_REPOSITORY } from './reel.repository';

describe('AppService', () => {
  let service: AppService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: REEL_REPOSITORY,
          useClass: InMemoryReelRepository,
        },
      ],
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
    it('queues a render job for an existing episode', async () => {
      const job = await service.createRenderJob({
        episodeId: 1,
        mode: 'storyboard',
        notes: 'First local pipeline test',
      });

      expect(job.status).toBe('queued');
      await expect(service.getRenderJobs()).resolves.toEqual([job]);
    });

    it('updates render job status', async () => {
      const job = await service.createRenderJob({
        episodeId: 1,
        mode: 'storyboard',
      });

      const updated = await service.updateRenderJobStatus(job.id, {
        status: 'running',
        heartbeat: true,
      });

      expect(updated.status).toBe('running');
    });
  });
});
