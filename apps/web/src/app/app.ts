import { Component, computed, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CHAPTER_ONE_SUMMARY, REEL_ONE } from '@sumer-reel-forge/reel-core';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly outline = CHAPTER_ONE_SUMMARY;
  protected readonly selectedEpisode = signal(REEL_ONE);
  protected readonly selectedShotIndex = signal(0);

  protected readonly selectedShot = computed(
    () => this.selectedEpisode().shots[this.selectedShotIndex()],
  );

  protected readonly totalShotSeconds = computed(() =>
    this.selectedEpisode().shots.reduce(
      (total, shot) => total + shot.durationSeconds,
      0,
    ),
  );

  protected selectShot(index: number): void {
    this.selectedShotIndex.set(index);
  }
}
