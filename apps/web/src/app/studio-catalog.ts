export type StudioChapterState = 'active' | 'upcoming';

export interface StudioChapterCatalogItem {
  number: number;
  title: string;
  shortTitle: string;
  description: string;
  state: StudioChapterState;
}

export interface StudioProjectCatalogItem {
  slug: string;
  title: string;
  kicker: string;
  description: string;
  chapters: StudioChapterCatalogItem[];
}

export const BLESSINGS_OF_SUMER_PROJECT: StudioProjectCatalogItem = {
  slug: 'blessings-of-sumer',
  title: 'Blessings of Sumer',
  kicker: 'Illustrated mythic-history production',
  description:
    'A local-first cinematic adaptation workflow for turning the Sumer manuscript into deliberate, publication-quality short-form reels.',
  chapters: [
    {
      number: 1,
      title: 'Enki and the World Order',
      shortTitle: 'Enki',
      description:
        'Enki voyages toward Dilmun and begins the long arc through water, order, cities, gardens, and the E-Absu.',
      state: 'active',
    },
    {
      number: 2,
      title: 'Chapter 2',
      shortTitle: 'Chapter 2',
      description:
        'Reserved in the Studio roadmap. Reel ingestion and production planning have not started yet.',
      state: 'upcoming',
    },
    {
      number: 3,
      title: 'Chapter 3',
      shortTitle: 'Chapter 3',
      description:
        'Reserved in the Studio roadmap. Reel ingestion and production planning have not started yet.',
      state: 'upcoming',
    },
  ],
};
