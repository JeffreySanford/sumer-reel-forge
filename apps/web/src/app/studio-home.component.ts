import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ChapterReelSummary } from '@sumer-reel-forge/reel-core';
import { ReelApiService } from './reel-api.service';
import { BLESSINGS_OF_SUMER_PROJECT } from './studio-catalog';
import { StudioNavComponent } from './studio-nav.component';
import type { HostCapabilities } from './system-capabilities.types';

@Component({
  selector: 'app-studio-home',
  standalone: true,
  imports: [RouterLink, StudioNavComponent],
  templateUrl: './studio-home.component.html',
  styleUrl: './studio-home.component.scss',
})
export class StudioHomeComponent {
  private readonly api = inject(ReelApiService);
  private readonly http = inject(HttpClient);

  protected readonly project = BLESSINGS_OF_SUMER_PROJECT;
  protected readonly reels = signal<ChapterReelSummary[]>([]);
  protected readonly host = signal<HostCapabilities | null>(null);
  protected readonly hostUnavailable = signal(false);

  protected readonly activeReels = computed(
    () => this.reels().filter((reel) => reel.productionStatus !== 'published').length,
  );
  protected readonly approvedReels = computed(
    () => this.reels().filter((reel) => reel.productionStatus === 'approved').length,
  );
  protected readonly hostReadyCount = computed(
    () => this.host()?.projections.filter((item) => item.status === 'ready').length ?? 0,
  );
  protected readonly gpuName = computed(
    () => this.host()?.gpu.devices?.[0]?.name ?? 'GPU profile pending',
  );
  protected readonly hostTier = computed(
    () => this.host()?.runtimePlan?.tier ?? 'profiling',
  );

  constructor() {
    this.api.getChapterOneOutline().subscribe((reels) => this.reels.set(reels));
    this.http.get<HostCapabilities>('/api/runtime/capabilities').subscribe({
      next: (host) => this.host.set(host),
      error: () => this.hostUnavailable.set(true),
    });
  }
}
