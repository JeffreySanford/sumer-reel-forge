import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ChapterReelSummary } from '@sumer-reel-forge/reel-core';
import { ReelApiService } from './reel-api.service';
import { BLESSINGS_OF_SUMER_PROJECT } from './studio-catalog';
import { StudioNavComponent } from './studio-nav.component';

@Component({
  selector: 'app-project-overview',
  standalone: true,
  imports: [RouterLink, StudioNavComponent],
  templateUrl: './project-overview.component.html',
  styleUrl: './project-overview.component.scss',
})
export class ProjectOverviewComponent {
  private readonly api = inject(ReelApiService);

  protected readonly project = BLESSINGS_OF_SUMER_PROJECT;
  protected readonly reels = signal<ChapterReelSummary[]>([]);
  protected readonly statusCounts = computed(() => {
    const counts: Record<string, number> = {};
    for (const reel of this.reels()) {
      counts[reel.productionStatus] = (counts[reel.productionStatus] ?? 0) + 1;
    }
    return counts;
  });

  constructor() {
    this.api.getChapterOneOutline().subscribe((reels) => this.reels.set(reels));
  }
}
