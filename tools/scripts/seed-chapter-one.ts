import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { CHAPTER_ONE_REELS } from '../../libs/reel-core/src/lib/reel-core';

const databaseUrl =
  process.env['DATABASE_URL'] ??
  'postgresql://sumer_reel_forge:sumer_reel_forge@localhost:5432/sumer_reel_forge';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main(): Promise<void> {
  const project = await prisma.studioProject.upsert({
    where: { slug: 'blessings-of-sumer' },
    update: {
      title: 'Blessings of Sumer',
      description:
        'Shared studio project for adapting Blessings of Sumer into short-form reels.',
    },
    create: {
      slug: 'blessings-of-sumer',
      title: 'Blessings of Sumer',
      description:
        'Shared studio project for adapting Blessings of Sumer into short-form reels.',
    },
  });

  const document = await prisma.sourceDocument.upsert({
    where: { id: await findDocumentId(project.id) },
    update: {
      title: 'Sumer Blessing',
      sourceRef: 'docs/projects/blessings-of-sumer',
    },
    create: {
      projectId: project.id,
      title: 'Sumer Blessing',
      sourceRef: 'docs/projects/blessings-of-sumer',
    },
  });

  const chapter = await prisma.chapter.upsert({
    where: {
      sourceDocumentId_chapterNumber: {
        sourceDocumentId: document.id,
        chapterNumber: 1,
      },
    },
    update: {
      title: 'Chapter 1',
      synopsis:
        'Enki receives Nammu direction, reaches Dilmun, establishes water and hospitality, and expands civilization through canals, shrines, and sacred order.',
    },
    create: {
      sourceDocumentId: document.id,
      chapterNumber: 1,
      title: 'Chapter 1',
      synopsis:
        'Enki receives Nammu direction, reaches Dilmun, establishes water and hospitality, and expands civilization through canals, shrines, and sacred order.',
    },
  });

  for (const reel of CHAPTER_ONE_REELS) {
    const persisted = await prisma.reel.upsert({
      where: {
        chapterId_episodeNumber: {
          chapterId: chapter.id,
          episodeNumber: reel.episode,
        },
      },
      update: {
        title: reel.title,
        sourceSection: reel.sourceSection,
        hook: reel.hook,
        visualCore: reel.visualCore,
        logline: reel.logline,
        narration: reel.narration,
        targetDurationSeconds: reel.targetDurationSeconds,
        musicDirection: reel.musicDirection,
        voiceDirection: reel.voiceDirection,
        platformNotes: reel.platformNotes,
        onScreenText: toPrismaJson(reel.onScreenText),
      },
      create: {
        chapterId: chapter.id,
        episodeNumber: reel.episode,
        title: reel.title,
        sourceSection: reel.sourceSection,
        hook: reel.hook,
        visualCore: reel.visualCore,
        logline: reel.logline,
        narration: reel.narration,
        targetDurationSeconds: reel.targetDurationSeconds,
        musicDirection: reel.musicDirection,
        voiceDirection: reel.voiceDirection,
        platformNotes: reel.platformNotes,
        onScreenText: toPrismaJson(reel.onScreenText),
      },
    });

    await prisma.reelShot.deleteMany({
      where: { reelId: persisted.id },
    });

    await prisma.reelShot.createMany({
      data: reel.shots.map((shot, index) => ({
        reelId: persisted.id,
        shotNumber: index + 1,
        timecode: shot.time,
        durationSeconds: shot.durationSeconds,
        visual: shot.visual,
        motion: shot.motion,
        prompt: shot.prompt,
      })),
    });
  }

  await prisma.auditLog.create({
    data: {
      actor: 'local-seed',
      action: 'seed.chapter-one',
      entityType: 'chapter',
      entityId: chapter.id,
      summary: {
        reels: CHAPTER_ONE_REELS.length,
      },
    },
  });

  console.log(`Seeded ${CHAPTER_ONE_REELS.length} Chapter 1 reels.`);
}

async function findDocumentId(projectId: string): Promise<string> {
  const existing = await prisma.sourceDocument.findFirst({
    where: {
      projectId,
      title: 'Sumer Blessing',
    },
    select: { id: true },
  });

  return existing?.id ?? crypto.randomUUID();
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
