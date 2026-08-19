import { applicationConfig } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import {
  CHAPTER_ONE_REELS,
  CHAPTER_ONE_SUMMARY,
  type ReelEpisode,
  type UpdateReelProductionRequest,
} from '@sumer-reel-forge/reel-core';
import { throwError, of } from 'rxjs';
import { App } from './app';
import { ReelApiService } from './reel-api.service';

const meta: Meta<App> = {
  title: 'Studio/Reel Dashboard',
  component: App,
  args: {},
  argTypes: {},
};

function withMockApi(options: {
  outline?: typeof CHAPTER_ONE_SUMMARY;
  episode?: ReelEpisode;
  saveFails?: boolean;
  renderJobId?: string;
}) {
  return applicationConfig({
    providers: [
      {
        provide: ReelApiService,
        useValue: {
          getChapterOneOutline: () =>
            of(options.outline ?? CHAPTER_ONE_SUMMARY),
          getChapterOneEpisode: (episodeId: number) =>
            of(
              options.episode ??
                CHAPTER_ONE_REELS.find(
                  (episode) => episode.episode === episodeId,
                ) ??
                CHAPTER_ONE_REELS[0],
            ),
          saveEpisodeProduction: (
            _episodeId: number,
            request: UpdateReelProductionRequest,
          ) =>
            options.saveFails
              ? throwError(() => new Error('Storybook save failure'))
              : of({
                  ...CHAPTER_ONE_REELS[0],
                  ...request,
                }),
          queueRenderJob: () =>
            of({
              id: options.renderJobId ?? 'storybook-render-job',
              episodeId: 1,
              mode: 'storyboard',
              status: 'queued',
              createdAt: new Date(0).toISOString(),
              attemptCount: 0,
            }),
        },
      },
    ],
  });
}

const defaultDecorators = [withMockApi({})];

const delayedEpisode = {
  ...CHAPTER_ONE_REELS[0],
  title: 'Loading State Fixture',
};

const emptyEpisode = {
  ...CHAPTER_ONE_REELS[0],
  shots: [],
  onScreenText: [],
};

export default meta;
type Story = StoryObj<App>;

export const ChapterOnePrototype: Story = {
  decorators: [...defaultDecorators],
};

export const EmptyEpisode: Story = {
  decorators: [withMockApi({ episode: emptyEpisode })],
};

export const SaveError: Story = {
  decorators: [withMockApi({ saveFails: true })],
};

export const RenderQueued: Story = {
  decorators: [withMockApi({ renderJobId: 'storybook-render-queued' })],
};

export const LoadingFixture: Story = {
  decorators: [withMockApi({ episode: delayedEpisode })],
};
