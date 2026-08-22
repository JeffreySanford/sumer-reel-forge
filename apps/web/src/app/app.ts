import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  REEL_ONE,
  type AssetReviewStatus,
  type ChapterNarrationSettings,
  type NarrationRoleType,
  type NarrationStylePreset,
  type ChapterReelSummary,
  type GeneratedAssetManifest,
  type ReelEpisode,
  type ReelExportMetadata,
  type ReelShot,
  type ReelProductionStatus,
  type RenderJob,
  type RenderJobAttempt,
  type RenderJobLog,
  type TimedText,
  type UpdateReelProductionRequest,
  type UpdateChapterNarrationSettingsRequest,
  DEFAULT_NARRATION_SETTINGS,
} from '@sumer-reel-forge/reel-core';
import { DirectionPanelComponent } from './direction-panel.component';
import { ReelApiService } from './reel-api.service';

const EMPTY_SHOT: ReelShot = {
  time: '00:00',
  durationSeconds: 0,
  visual: 'No shots have been added yet.',
  motion: 'none',
  prompt: '',
};

@Component({
  imports: [RouterModule, DirectionPanelComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnDestroy {
  private readonly reelApi = inject(ReelApiService);
  private operationalRefreshTimer?: ReturnType<typeof setTimeout>;

  protected readonly outline = signal<ChapterReelSummary[]>([]);
  protected readonly selectedEpisode = signal(REEL_ONE);
  protected readonly productionDraft = signal<UpdateReelProductionRequest>(
    toProductionDraft(REEL_ONE),
  );
  protected readonly selectedShotIndex = signal(0);
  protected readonly renderStatus = signal('Ready');
  protected readonly dataSource = signal<'api' | 'fallback'>('fallback');
  protected readonly isSaving = signal(false);
  protected readonly isLoading = signal(true);
  protected readonly isWorkflowBusy = signal(false);
  protected readonly renderJobs = signal<RenderJob[]>([]);
  protected readonly generatedAssets = signal<GeneratedAssetManifest[]>([]);
  protected readonly selectedJobId = signal<string | null>(null);
  protected readonly renderJobAttempts = signal<RenderJobAttempt[]>([]);
  protected readonly renderJobLogs = signal<RenderJobLog[]>([]);
  protected readonly assetReviewNotes = signal<Record<string, string>>({});
  protected readonly narrationSettings = signal<ChapterNarrationSettings>(
    DEFAULT_NARRATION_SETTINGS,
  );
  protected readonly narrationDraft =
    signal<UpdateChapterNarrationSettingsRequest>(
      toNarrationDraft(DEFAULT_NARRATION_SETTINGS),
    );
  protected readonly isSavingNarration = signal(false);
  protected readonly narrationStylePresets: NarrationStylePreset[] = [
    'documentary',
    'intimate',
    'mythic',
    'dramatic',
    'archival',
  ];
  protected readonly narrationRoleTypes: NarrationRoleType[] = [
    'narrator',
    'character',
    'archival',
    'chorus',
  ];

  protected readonly selectedShot = computed(
    () => this.productionDraft().shots[this.selectedShotIndex()] ?? EMPTY_SHOT,
  );

  protected readonly totalShotSeconds = computed(() =>
    this.productionDraft().shots.reduce(
      (total, shot) => total + shot.durationSeconds,
      0,
    ),
  );

  protected readonly availableStatusTransitions = computed(
    () => STATUS_TRANSITIONS[this.selectedEpisode().productionStatus],
  );

  protected readonly selectedRenderJob = computed(() =>
    this.renderJobs().find((job) => job.id === this.selectedJobId()),
  );

  protected readonly selectedJobAssets = computed(() =>
    this.generatedAssets().filter(
      (asset) => asset.renderJobId === this.selectedJobId(),
    ),
  );

  protected readonly reviewableAssets = computed(() =>
    this.selectedJobAssets().filter((asset) =>
      ['image', 'audio', 'video'].includes(asset.assetType),
    ),
  );

  protected readonly effectiveNarrationVoice = computed(() => {
    const draft = this.narrationDraft();
    const voiceId = draft.useStoryDefault
      ? draft.storyVoiceProfileId
      : draft.chapterVoiceProfileId;
    return (
      this.narrationSettings().availableVoices.find(
        (voice) => voice.id === voiceId,
      ) ?? this.narrationSettings().effective.voiceProfile
    );
  });

  protected readonly effectiveNarrationStyle = computed(() => {
    const draft = this.narrationDraft();
    return draft.useStoryDefault
      ? draft.storyStylePreset
      : (draft.chapterStylePreset ?? draft.storyStylePreset);
  });

  constructor() {
    this.loadNarrationSettings();
    this.loadOutline();
    this.selectEpisode(REEL_ONE.episode);
  }

  ngOnDestroy(): void {
    this.clearOperationalRefresh();
  }

  protected selectEpisode(episodeId: number): void {
    this.clearOperationalRefresh();
    this.selectedShotIndex.set(0);
    this.isLoading.set(true);
    this.reelApi.getChapterOneEpisode(episodeId).subscribe((episode) => {
      this.applyEpisode(episode);
      this.dataSource.set(episode.episode === episodeId ? 'api' : 'fallback');
      this.isLoading.set(false);
      this.loadOperationalState(episodeId);
    });
  }

  protected selectShot(index: number): void {
    this.selectedShotIndex.set(index);
  }

  protected copyPrompt(): void {
    const prompt = this.selectedShot().prompt;
    if (!globalThis.navigator?.clipboard) {
      this.renderStatus.set('Clipboard unavailable');
      return;
    }

    void globalThis.navigator.clipboard.writeText(prompt).then(
      () => this.renderStatus.set('Prompt copied'),
      () => this.renderStatus.set('Prompt copy failed'),
    );
  }

  protected copyAllPrompts(): void {
    const prompts = this.productionDraft()
      .shots.map((shot, index) => `Shot ${index + 1}: ${shot.prompt}`)
      .join('\n\n');

    if (!globalThis.navigator?.clipboard) {
      this.renderStatus.set('Clipboard unavailable');
      return;
    }

    void globalThis.navigator.clipboard.writeText(prompts).then(
      () => this.renderStatus.set('All prompts copied'),
      () => this.renderStatus.set('Prompt copy failed'),
    );
  }

  protected exportEpisode(): void {
    const payload = JSON.stringify(this.currentEpisodeDraft(), null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chapter-1-episode-${this.selectedEpisode().episode}.json`;
    link.click();
    URL.revokeObjectURL(url);
    this.renderStatus.set('Episode exported');
  }

  protected queueRenderJob(
    mode: 'storyboard' | 'draft-video' | 'final-video' = 'storyboard',
  ): void {
    this.renderStatus.set(`Queueing ${mode} render...`);
    this.reelApi
      .queueRenderJob({
        episodeId: this.selectedEpisode().episode,
        mode,
        voice: this.narrationSettings().effective.voiceProfile.slug,
        notes: `Queued from Reel Forge for ${this.selectedEpisode().title}`,
      })
      .subscribe({
        next: (job) => {
          this.renderStatus.set(`Queued job ${job.id}`);
          this.renderJobs.update((jobs) => [job, ...jobs]);
          this.selectRenderJob(job.id);
          this.scheduleOperationalRefresh();
          if (mode === 'final-video') {
            this.selectedEpisode.update((episode) => ({
              ...episode,
              productionStatus: 'rendering',
            }));
          }
        },
        error: () => this.renderStatus.set('Queue failed'),
      });
  }

  protected transitionProductionStatus(status: ReelProductionStatus): void {
    this.isWorkflowBusy.set(true);
    this.renderStatus.set(`Moving reel to ${status}...`);
    this.reelApi
      .updateEpisodeStatus(this.selectedEpisode().episode, status)
      .subscribe({
        next: (episode) => {
          this.applyEpisode(episode);
          this.updateOutlineStatus(episode.episode, episode.productionStatus);
          this.renderStatus.set(`Reel is ${episode.productionStatus}`);
          this.isWorkflowBusy.set(false);
        },
        error: () => {
          this.renderStatus.set('Status update failed');
          this.isWorkflowBusy.set(false);
        },
      });
  }

  protected selectRenderJob(jobId: string): void {
    this.selectedJobId.set(jobId);
    this.renderJobAttempts.set([]);
    this.renderJobLogs.set([]);
    this.reelApi.getRenderJobAttempts(jobId).subscribe({
      next: (attempts) => this.renderJobAttempts.set(attempts),
      error: () => this.renderJobAttempts.set([]),
    });
    this.reelApi.getRenderJobLogs(jobId).subscribe({
      next: (logs) => this.renderJobLogs.set(logs),
      error: () => this.renderJobLogs.set([]),
    });
  }

  protected updateAssetReviewNote(assetId: string, event: Event): void {
    const value = eventValue(event);
    this.assetReviewNotes.update((notes) => ({ ...notes, [assetId]: value }));
  }

  protected reviewAsset(
    asset: GeneratedAssetManifest,
    status: AssetReviewStatus,
  ): void {
    this.renderStatus.set(
      `${status === 'approved' ? 'Approving' : 'Rejecting'} asset...`,
    );
    this.reelApi
      .reviewGeneratedAsset(
        asset.id,
        status,
        this.assetReviewNotes()[asset.id] ?? asset.reviewNotes,
      )
      .subscribe({
        next: (updated) => {
          this.generatedAssets.update((assets) =>
            assets.map((item) => (item.id === updated.id ? updated : item)),
          );
          this.renderStatus.set(`Asset ${updated.reviewStatus}`);
        },
        error: () => this.renderStatus.set('Asset review failed'),
      });
  }

  protected regenerateAsset(asset: GeneratedAssetManifest): void {
    this.renderStatus.set('Queueing replacement asset...');
    this.reelApi
      .regenerateGeneratedAsset(
        asset.id,
        this.assetReviewNotes()[asset.id] ?? asset.reviewNotes,
      )
      .subscribe({
        next: (job) => {
          this.renderJobs.update((jobs) => [job, ...jobs]);
          this.selectRenderJob(job.id);
          this.renderStatus.set(`Replacement queued as ${job.id}`);
          this.scheduleOperationalRefresh();
        },
        error: () => this.renderStatus.set('Regeneration queue failed'),
      });
  }

  protected retrySelectedRenderJob(): void {
    const job = this.selectedRenderJob();
    if (!job || job.status !== 'failed') {
      return;
    }
    this.renderStatus.set('Requeueing failed render...');
    this.reelApi
      .retryRenderJob(job.id, 'Retry requested from Reel Forge.')
      .subscribe({
        next: (updated) => {
          this.renderJobs.update((jobs) =>
            jobs.map((item) => (item.id === updated.id ? updated : item)),
          );
          this.renderStatus.set(`Job ${updated.id} requeued`);
          this.scheduleOperationalRefresh();
        },
        error: () => this.renderStatus.set('Retry failed'),
      });
  }

  protected saveProduction(): void {
    this.isSaving.set(true);
    this.renderStatus.set('Saving production edits...');
    this.reelApi
      .saveEpisodeProduction(
        this.selectedEpisode().episode,
        this.productionDraft(),
      )
      .subscribe({
        next: (episode) => {
          this.applyEpisode(episode);
          this.updateOutlineStatus(episode.episode, episode.productionStatus);
          this.renderStatus.set('Production saved');
          this.isSaving.set(false);
        },
        error: () => {
          this.renderStatus.set('Save failed');
          this.isSaving.set(false);
        },
      });
  }

  protected saveNarrationSettings(): void {
    this.isSavingNarration.set(true);
    this.renderStatus.set('Saving narration identity...');
    this.reelApi
      .saveChapterNarrationSettings(
        this.narrationSettings().projectSlug,
        this.narrationSettings().chapterNumber,
        this.narrationDraft(),
      )
      .subscribe({
        next: (settings) => {
          this.applyNarrationSettings(settings);
          this.selectedEpisode.update((episode) => ({
            ...episode,
            productionStatus: 'draft',
            narrationIdentity: settings.effective,
          }));
          this.outline.update((outline) =>
            outline.map((episode) => ({
              ...episode,
              productionStatus: 'draft',
            })),
          );
          this.renderStatus.set('Narration identity saved');
          this.isSavingNarration.set(false);
        },
        error: () => {
          this.renderStatus.set('Narration save failed');
          this.isSavingNarration.set(false);
        },
      });
  }

  protected setUseStoryDefault(event: Event): void {
    const useStoryDefault = eventChecked(event);
    this.narrationDraft.update((draft) => ({
      ...draft,
      useStoryDefault,
      chapterVoiceProfileId:
        draft.chapterVoiceProfileId ?? draft.storyVoiceProfileId,
      chapterStylePreset:
        draft.chapterStylePreset ?? draft.storyStylePreset,
      chapterStyleNotes:
        draft.chapterStyleNotes ?? draft.storyStyleNotes,
    }));
  }

  protected updateNarrationVoice(
    scope: 'story' | 'chapter',
    event: Event,
  ): void {
    const value = eventValue(event);
    this.narrationDraft.update((draft) =>
      scope === 'story'
        ? { ...draft, storyVoiceProfileId: value }
        : { ...draft, chapterVoiceProfileId: value },
    );
  }

  protected updateNarrationStyle(
    scope: 'story' | 'chapter',
    event: Event,
  ): void {
    const value = eventValue(event) as NarrationStylePreset;
    this.narrationDraft.update((draft) =>
      scope === 'story'
        ? { ...draft, storyStylePreset: value }
        : { ...draft, chapterStylePreset: value },
    );
  }

  protected updateNarrationNotes(
    scope: 'story' | 'chapter',
    event: Event,
  ): void {
    const value = eventValue(event);
    this.narrationDraft.update((draft) =>
      scope === 'story'
        ? { ...draft, storyStyleNotes: value }
        : { ...draft, chapterStyleNotes: value },
    );
  }

  protected addNarrationRole(): void {
    this.narrationDraft.update((draft) => ({
      ...draft,
      roles: [
        ...draft.roles,
        {
          roleKey: `role-${draft.roles.length + 1}`,
          displayName: 'New role',
          roleType: 'character',
          voiceProfileId: draft.storyVoiceProfileId,
          stylePreset: draft.storyStylePreset,
          styleNotes: '',
        },
      ],
    }));
  }

  protected removeNarrationRole(index: number): void {
    this.narrationDraft.update((draft) => ({
      ...draft,
      roles: draft.roles.filter((_, roleIndex) => roleIndex !== index),
    }));
  }

  protected updateNarrationRole(
    index: number,
    field:
      | 'displayName'
      | 'roleType'
      | 'voiceProfileId'
      | 'stylePreset'
      | 'styleNotes',
    event: Event,
  ): void {
    const value = eventValue(event);
    this.narrationDraft.update((draft) => ({
      ...draft,
      roles: draft.roles.map((role, roleIndex) => {
        if (roleIndex !== index) {
          return role;
        }
        const updated = { ...role, [field]: value };
        return field === 'displayName'
          ? { ...updated, roleKey: toRoleKey(value, index) }
          : updated;
      }),
    }));
  }

  protected updateDraftText(
    field: keyof Pick<
      UpdateReelProductionRequest,
      'logline' | 'narration' | 'musicDirection' | 'voiceDirection'
    >,
    event: Event,
  ): void {
    const value = eventValue(event);
    this.productionDraft.update((draft) => ({
      ...draft,
      [field]: value,
    }));
  }

  protected updateCaption(
    index: number,
    field: keyof TimedText,
    event: Event,
  ): void {
    const value = eventValue(event);
    this.productionDraft.update((draft) => ({
      ...draft,
      onScreenText: draft.onScreenText.map((caption, captionIndex) =>
        captionIndex === index ? { ...caption, [field]: value } : caption,
      ),
    }));
  }

  protected updateShot(
    index: number,
    field: keyof ReelShot,
    event: Event,
  ): void {
    const value =
      field === 'durationSeconds'
        ? Number(eventValue(event))
        : eventValue(event);
    this.productionDraft.update((draft) => ({
      ...draft,
      shots: draft.shots.map((shot, shotIndex) =>
        shotIndex === index ? { ...shot, [field]: value } : shot,
      ),
    }));
  }

  protected updatePlatformNote(index: number, event: Event): void {
    const value = eventValue(event);
    this.productionDraft.update((draft) => ({
      ...draft,
      platformNotes: draft.platformNotes.map((note, noteIndex) =>
        noteIndex === index ? value : note,
      ),
    }));
  }

  protected updateExportMetadata(
    field: keyof Omit<ReelExportMetadata, 'tags'>,
    event: Event,
  ): void {
    const value = eventValue(event);
    this.productionDraft.update((draft) => ({
      ...draft,
      exportMetadata: {
        ...draft.exportMetadata,
        [field]: value,
      },
    }));
  }

  protected updateExportTags(event: Event): void {
    const tags = eventValue(event)
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    this.productionDraft.update((draft) => ({
      ...draft,
      exportMetadata: {
        ...draft.exportMetadata,
        tags,
      },
    }));
  }

  private loadNarrationSettings(): void {
    this.reelApi
      .getChapterNarrationSettings('blessings-of-sumer', 1)
      .subscribe((settings) => this.applyNarrationSettings(settings));
  }

  private applyNarrationSettings(settings: ChapterNarrationSettings): void {
    this.narrationSettings.set(settings);
    this.narrationDraft.set(toNarrationDraft(settings));
  }

  private loadOutline(): void {
    this.reelApi.getChapterOneOutline().subscribe((outline) => {
      this.outline.set(outline);
      this.dataSource.set(outline.length === 18 ? 'api' : 'fallback');
    });
  }

  private loadOperationalState(episodeId: number): void {
    this.reelApi.getRenderJobs(episodeId).subscribe({
      next: (jobs) => {
        this.renderJobs.set(jobs);
        const currentSelection = this.selectedJobId();
        const selectedId =
          (currentSelection && jobs.some((job) => job.id === currentSelection)
            ? currentSelection
            : null) ??
          jobs.find((job) => ['queued', 'running'].includes(job.status))?.id ??
          jobs.find((job) => job.status === 'complete')?.id ??
          jobs[0]?.id ??
          null;
        const selectionChanged = selectedId !== this.selectedJobId();
        this.selectedJobId.set(selectedId);
        if (selectedId && selectionChanged) {
          this.selectRenderJob(selectedId);
        } else if (selectedId) {
          this.reelApi.getRenderJobAttempts(selectedId).subscribe({
            next: (attempts) => this.renderJobAttempts.set(attempts),
            error: () => this.renderJobAttempts.set([]),
          });
          this.reelApi.getRenderJobLogs(selectedId).subscribe({
            next: (logs) => this.renderJobLogs.set(logs),
            error: () => this.renderJobLogs.set([]),
          });
        } else {
          this.renderJobAttempts.set([]);
          this.renderJobLogs.set([]);
        }
        this.scheduleOperationalRefresh(jobs);
      },
      error: () => {
        this.renderJobs.set([]);
        this.clearOperationalRefresh();
      },
    });
    this.reelApi.getGeneratedAssets(episodeId).subscribe({
      next: (assets) => {
        this.generatedAssets.set(assets);
        this.assetReviewNotes.set(
          Object.fromEntries(
            assets.map((asset) => [asset.id, asset.reviewNotes ?? '']),
          ),
        );
      },
      error: () => this.generatedAssets.set([]),
    });
  }

  private scheduleOperationalRefresh(jobs = this.renderJobs()): void {
    this.clearOperationalRefresh();
    if (!jobs.some((job) => ['queued', 'running'].includes(job.status))) {
      return;
    }

    const episodeId = this.selectedEpisode().episode;
    this.operationalRefreshTimer = setTimeout(() => {
      if (this.selectedEpisode().episode === episodeId) {
        this.loadOperationalState(episodeId);
      }
    }, 2000);
  }

  private clearOperationalRefresh(): void {
    if (this.operationalRefreshTimer) {
      clearTimeout(this.operationalRefreshTimer);
      this.operationalRefreshTimer = undefined;
    }
  }

  private updateOutlineStatus(
    episodeId: number,
    productionStatus: ReelProductionStatus,
  ): void {
    this.outline.update((outline) =>
      outline.map((episode) =>
        episode.episode === episodeId
          ? { ...episode, productionStatus }
          : episode,
      ),
    );
  }

  private applyEpisode(episode: ReelEpisode): void {
    this.selectedEpisode.set(episode);
    this.productionDraft.set(toProductionDraft(episode));
  }

  private currentEpisodeDraft(): ReelEpisode {
    return {
      ...this.selectedEpisode(),
      ...this.productionDraft(),
    };
  }
}

const STATUS_TRANSITIONS: Record<ReelProductionStatus, ReelProductionStatus[]> =
  {
    draft: ['review'],
    review: ['draft', 'approved'],
    approved: ['draft'],
    rendering: ['approved', 'published'],
    published: ['draft'],
  };

function toProductionDraft(episode: ReelEpisode): UpdateReelProductionRequest {
  return {
    logline: episode.logline,
    narration: episode.narration,
    onScreenText: episode.onScreenText.map((caption) => ({ ...caption })),
    shots: episode.shots.map((shot) => ({ ...shot })),
    musicDirection: episode.musicDirection,
    voiceDirection: episode.voiceDirection,
    platformNotes: [...episode.platformNotes],
    exportMetadata: {
      ...episode.exportMetadata,
      tags: [...episode.exportMetadata.tags],
    },
  };
}

function eventValue(event: Event): string {
  return event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement ||
    event.target instanceof HTMLSelectElement
    ? event.target.value
    : '';
}

function eventChecked(event: Event): boolean {
  return event.target instanceof HTMLInputElement
    ? event.target.checked
    : false;
}

function toNarrationDraft(
  settings: ChapterNarrationSettings,
): UpdateChapterNarrationSettingsRequest {
  return {
    storyVoiceProfileId: settings.storyDefault.voiceProfile.id,
    storyStylePreset: settings.storyDefault.stylePreset,
    storyStyleNotes: settings.storyDefault.styleNotes,
    useStoryDefault: settings.useStoryDefault,
    chapterVoiceProfileId:
      settings.chapterOverride?.voiceProfile.id ??
      settings.storyDefault.voiceProfile.id,
    chapterStylePreset:
      settings.chapterOverride?.stylePreset ?? settings.storyDefault.stylePreset,
    chapterStyleNotes:
      settings.chapterOverride?.styleNotes ?? settings.storyDefault.styleNotes,
    roles: settings.roles.map((role) => ({
      roleKey: role.roleKey,
      displayName: role.displayName,
      roleType: role.roleType,
      voiceProfileId: role.voiceProfile?.id,
      stylePreset: role.stylePreset,
      styleNotes: role.styleNotes,
    })),
  };
}

function toRoleKey(value: string, index: number): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `role-${index + 1}`
  );
}
