import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { REEL_ONE, type ChapterReelSummary } from '@sumer-reel-forge/reel-core';
import { ReelApiService } from './reel-api.service';

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
  protected readonly selectedShotIndex = signal(0);
  protected readonly renderStatus = signal('Ready');
  protected readonly dataSource = signal<'api' | 'fallback'>('fallback');

  protected readonly selectedShot = computed(
    () => this.selectedEpisode().shots[this.selectedShotIndex()],
  );

  protected readonly totalShotSeconds = computed(() =>
    this.selectedEpisode().shots.reduce(
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
    this.reelApi.getChapterOneEpisode(episodeId).subscribe((episode) => {
      this.selectedEpisode.set(episode);
      this.dataSource.set(episode.episode === episodeId ? 'api' : 'fallback');
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

  protected exportEpisode(): void {
    const payload = JSON.stringify(this.selectedEpisode(), null, 2);
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

  private loadOutline(): void {
    this.reelApi.getChapterOneOutline().subscribe((outline) => {
      this.outline.set(outline);
      this.dataSource.set(outline.length === 18 ? 'api' : 'fallback');
    });
  }
}
