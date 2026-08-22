import { Test } from '@nestjs/testing';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { InMemoryReelRepository, REEL_REPOSITORY } from './reel.repository';

describe('AppService', () => {
  let service: AppService;
  const pipelineByJob = new Map<string, string>();

  beforeAll(async () => {
    const prismaMock = {
      renderJob: {
        update: async ({ where, data }: any) => {
          pipelineByJob.set(where.id, data.pipeline);
          return { id: where.id, pipeline: data.pipeline };
        },
        findUnique: async ({ where }: any) => ({
          pipeline: pipelineByJob.get(where.id) ?? null,
        }),
        findMany: async ({ where }: any) =>
          (where?.id?.in ?? []).map((id: string) => ({
            id,
            pipeline: pipelineByJob.get(id) ?? null,
          })),
      },
      generatedAsset: {
        findUnique: async () => null,
      },
    };

    const app = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: REEL_REPOSITORY,
          useClass: InMemoryReelRepository,
        },
        {
          provide: PrismaService,
          useValue: prismaMock,
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
    it('queues a render job for an existing episode with editorial pipeline', async () => {
      const job = await service.createRenderJob({
        episodeId: 1,
        mode: 'storyboard',
        notes: 'First local pipeline test',
      });

      expect(job.status).toBe('queued');
      expect(job.pipeline).toBe('editorial');
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
      expect(updated.pipeline).toBe('editorial');
    });
  });
});
