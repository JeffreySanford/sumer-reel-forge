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
const refreshExisting = process.argv.includes('--refresh');

async function main(): Promise<void> {
  const projectData = {
    slug: 'blessings-of-sumer',
    title: 'Blessings of Sumer',
    description:
      'Shared studio project for adapting Blessings of Sumer into short-form reels.',
  };
  const existingProject = await prisma.studioProject.findUnique({
    where: { slug: projectData.slug },
  });
  const project = existingProject
    ? refreshExisting
      ? await prisma.studioProject.update({
          where: { id: existingProject.id },
          data: {
            title: projectData.title,
            description: projectData.description,
          },
        })
      : existingProject
    : await prisma.studioProject.create({ data: projectData });

  const documentData = {
    title: 'Sumer Blessing',
    sourceRef: 'docs/projects/blessings-of-sumer',
  };
  const existingDocument = await prisma.sourceDocument.findFirst({
    where: {
      projectId: project.id,
      title: documentData.title,
    },
  });
  const document = existingDocument
    ? refreshExisting
      ? await prisma.sourceDocument.update({
          where: { id: existingDocument.id },
          data: documentData,
        })
      : existingDocument
    : await prisma.sourceDocument.create({
        data: {
          projectId: project.id,
          ...documentData,
        },
      });

  const chapterData = {
    title: 'Chapter 1',
    synopsis:
      'Enki receives Nammu direction, reaches Dilmun, establishes water and hospitality, and expands civilization through canals, shrines, and sacred order.',
  };
  const existingChapter = await prisma.chapter.findUnique({
    where: {
      sourceDocumentId_chapterNumber: {
        sourceDocumentId: document.id,
        chapterNumber: 1,
      },
    },
  });
  const chapter = existingChapter
    ? refreshExisting
      ? await prisma.chapter.update({
          where: { id: existingChapter.id },
          data: chapterData,
        })
      : existingChapter
    : await prisma.chapter.create({
        data: {
          sourceDocumentId: document.id,
          chapterNumber: 1,
          ...chapterData,
        },
      });

  let createdReels = 0;
  let refreshedReels = 0;
  let preservedReels = 0;

  for (const reel of CHAPTER_ONE_REELS) {
    const existing = await prisma.reel.findUnique({
      where: {
        chapterId_episodeNumber: {
          chapterId: chapter.id,
          episodeNumber: reel.episode,
        },
      },
    });

    if (existing && !refreshExisting) {
      preservedReels += 1;
      continue;
    }

    await prisma.$transaction(async (transaction) => {
      const persisted = existing
        ? await transaction.reel.update({
            where: { id: existing.id },
            data: toReelData(reel),
          })
        : await transaction.reel.create({
            data: {
              chapterId: chapter.id,
              episodeNumber: reel.episode,
              ...toReelData(reel),
            },
          });

      if (existing) {
        await transaction.reelShot.deleteMany({
          where: { reelId: persisted.id },
        });
      }

      await transaction.reelShot.createMany({
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
    });

    if (existing) {
      refreshedReels += 1;
    } else {
      createdReels += 1;
    }
  }

  if (createdReels > 0 || refreshedReels > 0) {
    await prisma.auditLog.create({
      data: {
        actor: 'local-seed',
        action: refreshExisting
          ? 'seed.chapter-one.refresh'
          : 'seed.chapter-one.create-missing',
        entityType: 'chapter',
        entityId: chapter.id,
        summary: {
          createdReels,
          refreshedReels,
          preservedReels,
        },
      },
    });
  }

  console.log(
    `Chapter 1 seed complete: ${createdReels} created, ${refreshedReels} refreshed, ${preservedReels} preserved.`,
  );
}

function toReelData(reel: (typeof CHAPTER_ONE_REELS)[number]) {
  return {
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
    exportMetadata: toPrismaJson(reel.exportMetadata),
  };
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
