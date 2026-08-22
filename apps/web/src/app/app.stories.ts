import { applicationConfig } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/angular';
import {
  CHAPTER_ONE_REELS,
  CHAPTER_ONE_SUMMARY,
  DEFAULT_NARRATION_SETTINGS,
  type UpdateChapterNarrationSettingsRequest,
  type GeneratedAssetManifest,
  type RenderJob,
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
  assets?: GeneratedAssetManifest[];
  jobs?: RenderJob[];
}) {
  return applicationConfig({
    providers: [
      {
        provide: ReelApiService,
        useValue: {
          getChapterNarrationSettings: () => of(DEFAULT_NARRATION_SETTINGS),
          saveChapterNarrationSettings: (
            _projectSlug: string,
            _chapterNumber: number,
            request: UpdateChapterNarrationSettingsRequest,
          ) =>
            of({
              ...DEFAULT_NARRATION_SETTINGS,
              useStoryDefault: request.useStoryDefault,
              storyDefault: {
                voiceProfile:
                  DEFAULT_NARRATION_SETTINGS.availableVoices.find(
                    (voice) => voice.id === request.storyVoiceProfileId,
                  ) ?? DEFAULT_NARRATION_SETTINGS.storyDefault.voiceProfile,
                stylePreset: request.storyStylePreset,
                styleNotes: request.storyStyleNotes,
              },
            }),
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
          getRenderJobs: () => of(options.jobs ?? []),
          getGeneratedAssets: () => of(options.assets ?? []),
          getRenderJobAttempts: () => of([]),
          getRenderJobLogs: () => of([]),
          updateEpisodeStatus: (
            _episodeId: number,
            status: ReelEpisode['productionStatus'],
          ) =>
            of({
              ...(options.episode ?? CHAPTER_ONE_REELS[0]),
              productionStatus: status,
            }),
          reviewGeneratedAsset: (
            assetId: string,
            status: GeneratedAssetManifest['reviewStatus'],
          ) =>
            of({
              ...(options.assets ?? []).find((asset) => asset.id === assetId),
              id: assetId,
              reviewStatus: status,
            }),
          regenerateGeneratedAsset: () =>
            of({
              id: 'storybook-regenerated-job',
              episodeId: 1,
              mode: 'storyboard',
              status: 'queued',
              createdAt: new Date(0).toISOString(),
              attemptCount: 0,
            }),
          retryRenderJob: () =>
            of({
              id: 'storybook-retry-job',
              episodeId: 1,
              mode: 'storyboard',
              status: 'queued',
              createdAt: new Date(0).toISOString(),
              attemptCount: 1,
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

export const AssetReview: Story = {
  decorators: [
    withMockApi({
      jobs: [
        {
          id: 'storybook-complete-job',
          episodeId: 1,
          mode: 'storyboard',
          status: 'complete',
          createdAt: new Date(0).toISOString(),
          attemptCount: 1,
        },
      ],
      assets: [
        {
          id: 'storybook-shot-1',
          renderJobId: 'storybook-complete-job',
          shotNumber: 1,
          assetType: 'image',
          uri: 'file:///storybook-shot-1.png',
          contentUrl:
            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="540" height="960"%3E%3Crect width="100%25" height="100%25" fill="%23174448"/%3E%3Ccircle cx="270" cy="380" r="140" fill="%23d3ae57"/%3E%3C/svg%3E',
          metadata: { width: 540, height: 960 },
          reviewStatus: 'pending',
          createdAt: new Date(0).toISOString(),
        },
      ],
    }),
  ],
};
