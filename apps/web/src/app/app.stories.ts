import { provideRouter, withDisabledInitialNavigation } from '@angular/router';
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
import { appRoutes } from './app.routes';
import { ReelApiService } from './reel-api.service';

const meta: Meta<App> = {
  title: 'Studio/Reel Dashboard',
  component: App,
  args: {},
  argTypes: {},
};

const STORYBOOK_PLANNING_CAPABILITIES = {
  defaultProvider: 'deterministic' as const,
  providers: [
    {
      id: 'deterministic' as const,
      available: true,
      text: true,
      vision: false,
      structuredOutput: true,
      detail: 'Storybook deterministic planning fixture.',
    },
  ],
};

function directionProposal(request: {
  shotId: string;
  eyeTarget?: string;
  stillnessAnchor?: string;
  styleRules?: string[];
  availableAssets?: string[];
}) {
  return {
    eyeTarget: request.eyeTarget ?? 'primary-subject',
    stillnessAnchor:
      request.stillnessAnchor ?? 'primary-subject-composition',
    camera: {
      preset: 'human-review-required',
      scaleFrom: 1,
      scaleTo: 1,
      easing: 'cinematicSlow',
    },
    motionBudget: {
      primary: 'human-review-required',
      subject: 'human-review-required',
      environment: [],
      lighting: 'human-review-required',
    },
    requiredAssets: request.availableAssets ?? [],
    inheritedStyleRules: request.styleRules ?? [],
    unresolvedQuestions: ['Choose authored motion before rendering.'],
    rationale: 'Storybook deterministic direction fixture.',
    provider: 'deterministic' as const,
    shotId: request.shotId,
    status: 'scaffold' as const,
  };
}

function planningRun(request: {
  shotId: string;
  shotNumber?: number;
  eyeTarget?: string;
  stillnessAnchor?: string;
  styleRules?: string[];
  availableAssets?: string[];
}) {
  const proposal = directionProposal(request);
  return {
    id: 'storybook-planning-run',
    reelId: 'storybook-reel',
    shotNumber: request.shotNumber ?? 1,
    shotKey: request.shotId,
    provider: 'deterministic',
    promptVersion: 'shot-plan-v1',
    status: 'proposal-ready' as const,
    inputHash: 'a'.repeat(64),
    outputHash: 'b'.repeat(64),
    workingHash: 'b'.repeat(64),
    input: request,
    proposal,
    workingProposal: proposal,
    durationMs: 8,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

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
      provideRouter(appRoutes, withDisabledInitialNavigation()),
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
          getPlanningCapabilities: () => of(STORYBOOK_PLANNING_CAPABILITIES),
          proposeShotPlan: directionProposal,
          getLatestPlanningRun: () => of(null),
          createPlanningRun: (request: Parameters<typeof planningRun>[0]) =>
            of(planningRun(request)),
          updatePlanningRunProposal: (
            _runId: string,
            proposal: ReturnType<typeof directionProposal>,
          ) =>
            of({
              ...planningRun({
                shotId: proposal.shotId,
                styleRules: proposal.inheritedStyleRules,
                availableAssets: proposal.requiredAssets,
              }),
              workingHash: 'c'.repeat(64),
              workingProposal: proposal,
            }),
          reviewPlanningRun: (
            _runId: string,
            decision: 'approved' | 'rejected',
          ) =>
            of({
              ...planningRun({ shotId: 'storybook-shot' }),
              status: decision,
              reviewedAt: new Date(0).toISOString(),
              reviewedBy: 'storybook-director',
            }),
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
