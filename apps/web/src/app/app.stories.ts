import { applicationConfig } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import {
  CHAPTER_ONE_REELS,
  CHAPTER_ONE_SUMMARY,
} from '@sumer-reel-forge/reel-core';
import { of } from 'rxjs';
import { App } from './app';
import { ReelApiService } from './reel-api.service';

const meta: Meta<App> = {
  title: 'Studio/Reel Dashboard',
  component: App,
  decorators: [
    applicationConfig({
      providers: [
        {
          provide: ReelApiService,
          useValue: {
            getChapterOneOutline: () => of(CHAPTER_ONE_SUMMARY),
            getChapterOneEpisode: (episodeId: number) =>
              of(
                CHAPTER_ONE_REELS.find(
                  (episode) => episode.episode === episodeId,
                ) ?? CHAPTER_ONE_REELS[0],
              ),
            queueRenderJob: () =>
              of({
                id: 'storybook-render-job',
                episodeId: 1,
                mode: 'storyboard',
                status: 'queued',
                createdAt: new Date(0).toISOString(),
              }),
          },
        },
      ],
    }),
  ],
};

export default meta;
type Story = StoryObj<App>;

export const ChapterOnePrototype: Story = {};
