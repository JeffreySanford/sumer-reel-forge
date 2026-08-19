import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  REEL_ONE,
  type ChapterReelSummary,
  type ReelEpisode,
  type ReelExportMetadata,
  type ReelShot,
  type TimedText,
  type UpdateReelProductionRequest,
} from '@sumer-reel-forge/reel-core';
import { ReelApiService } from './reel-api.service';

const EMPTY_SHOT: ReelShot = {
  time: '00:00',
  durationSeconds: 0,
  visual: 'No shots have been added yet.',
  motion: 'none',
  prompt: '',
};

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly reelApi = inject(ReelApiService);

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

  protected readonly selectedShot = computed(
    () => this.productionDraft().shots[this.selectedShotIndex()] ?? EMPTY_SHOT,
  );

  protected readonly totalShotSeconds = computed(() =>
    this.productionDraft().shots.reduce(
      (total, shot) => total + shot.durationSeconds,
      0,
    ),
  );

  constructor() {
    this.loadOutline();
    this.selectEpisode(REEL_ONE.episode);
  }

  protected selectEpisode(episodeId: number): void {
    this.selectedShotIndex.set(0);
    this.isLoading.set(true);
    this.reelApi.getChapterOneEpisode(episodeId).subscribe((episode) => {
      this.applyEpisode(episode);
      this.dataSource.set(episode.episode === episodeId ? 'api' : 'fallback');
      this.isLoading.set(false);
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

  protected queueRenderJob(): void {
    this.renderStatus.set('Queueing storyboard render...');
    this.reelApi
      .queueRenderJob({
        episodeId: this.selectedEpisode().episode,
        mode: 'storyboard',
        notes: `Queued from Reel Forge for ${this.selectedEpisode().title}`,
      })
      .subscribe({
        next: (job) => this.renderStatus.set(`Queued job ${job.id}`),
        error: () => this.renderStatus.set('Queue failed'),
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
          this.renderStatus.set('Production saved');
          this.isSaving.set(false);
        },
        error: () => {
          this.renderStatus.set('Save failed');
          this.isSaving.set(false);
        },
      });
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

  private loadOutline(): void {
    this.reelApi.getChapterOneOutline().subscribe((outline) => {
      this.outline.set(outline);
      this.dataSource.set(outline.length === 18 ? 'api' : 'fallback');
    });
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
    event.target instanceof HTMLTextAreaElement
    ? event.target.value
    : '';
}
