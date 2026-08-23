import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { ChapterReelSummary, ReelProductionStatus } from '@sumer-reel-forge/reel-core';
import { ReelApiService } from './reel-api.service';
import { BLESSINGS_OF_SUMER_PROJECT } from './studio-catalog';
import { StudioNavComponent } from './studio-nav.component';

@Component({
  selector: 'app-chapter-overview',
  standalone: true,
  imports: [RouterLink, StudioNavComponent],
  templateUrl: './chapter-overview.component.html',
  styleUrl: './chapter-overview.component.scss',
})
export class ChapterOverviewComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ReelApiService);

  protected readonly project = BLESSINGS_OF_SUMER_PROJECT;
  protected readonly chapterNumber = signal(1);
  protected readonly reels = signal<ChapterReelSummary[]>([]);
  protected readonly chapter = computed(
    () => this.project.chapters.find((item) => item.number === this.chapterNumber()) ?? this.project.chapters[0],
  );
  protected readonly statusCounts = computed(() => {
    const counts: Partial<Record<ReelProductionStatus, number>> = {};
    for (const reel of this.reels()) {
      counts[reel.productionStatus] = (counts[reel.productionStatus] ?? 0) + 1;
    }
    return counts;
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const parsed = Number(params.get('chapterNumber'));
      const chapterNumber = Number.isInteger(parsed) && parsed >= 1 && parsed <= 3 ? parsed : 1;
      this.chapterNumber.set(chapterNumber);
      if (chapterNumber === 1 && this.reels().length === 0) {
        this.api.getChapterOneOutline().subscribe((reels) => this.reels.set(reels));
      }
    });
  }

  protected statusLabel(status: ReelProductionStatus): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }
}
