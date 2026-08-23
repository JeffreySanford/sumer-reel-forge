import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { StudioNavComponent } from './studio-nav.component';
import type {
  HostCapabilities,
  HostCapabilityStatus,
} from './system-capabilities.types';

@Component({
  selector: 'app-system-capabilities',
  standalone: true,
  imports: [RouterLink, StudioNavComponent],
  templateUrl: './system-capabilities.component.html',
  styleUrl: './system-capabilities.component.scss',
})
export class SystemCapabilitiesComponent {
  private readonly http = inject(HttpClient);

  protected readonly capabilities = signal<HostCapabilities | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly readyProjectionCount = computed(
    () => this.capabilities()?.projections.filter((item) => item.status === 'ready').length ?? 0,
  );
  protected readonly gpu = computed(() => this.capabilities()?.gpu.devices?.[0]);

  constructor() {
    this.refresh();
  }

  protected refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    this.http.get<HostCapabilities>('/api/runtime/capabilities').subscribe({
      next: (capabilities) => {
        this.capabilities.set(capabilities);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(
          error?.message ?? 'Host capabilities could not be loaded from the local API.',
        );
        this.loading.set(false);
      },
    });
  }

  protected statusLabel(status: HostCapabilityStatus): string {
    switch (status) {
      case 'ready':
        return 'Ready';
      case 'limited':
        return 'Limited';
      case 'unavailable':
        return 'Unavailable';
      default:
        return 'Unknown';
    }
  }

  protected gbFromMb(value?: number): string {
    return value ? `${(value / 1024).toFixed(1)} GB` : 'Unknown';
  }

  protected formatObservedAt(value?: string | null): string {
    if (!value) return 'Unknown';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }
}
