import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { StudioNavComponent } from './studio-nav.component';
import type {
  HostCapabilities,
  HostCapabilityStatus,
  RuntimeGpuStatus,
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
  protected readonly gpuStatus = signal<RuntimeGpuStatus | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly readyProjectionCount = computed(
    () =>
      this.capabilities()?.projections.filter((item) => item.status === 'ready')
        .length ?? 0,
  );
  protected readonly gpu = computed(
    () => this.capabilities()?.gpu.devices?.[0],
  );
  protected readonly liveGpu = computed(
    () => this.gpuStatus()?.nvidia.devices?.[0] ?? null,
  );
  protected readonly liveComfyDevice = computed(
    () => this.gpuStatus()?.comfyui.devices?.[0] ?? null,
  );

  constructor() {
    this.refresh();
  }

  protected refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      capabilities: this.http.get<HostCapabilities>('/api/runtime/capabilities'),
      gpuStatus: this.http.get<RuntimeGpuStatus>('/api/runtime/gpu-status'),
    }).subscribe({
      next: ({ capabilities, gpuStatus }) => {
        this.capabilities.set(capabilities);
        this.gpuStatus.set(gpuStatus);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(
          error?.message ??
            'Host capabilities could not be loaded from the local API.',
        );
        this.loading.set(false);
      },
    });
  }

  protected statusLabel(
    status: HostCapabilityStatus,
    capabilityId?: string,
  ): string {
    if (
      status === 'limited' &&
      (capabilityId === 'animation-layer-generation' ||
        capabilityId === 'comfyui-layer-workflow')
    ) {
      return 'Setup required';
    }

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

  protected mbFromBytes(value?: number): string {
    return Number.isFinite(value)
      ? `${Math.round(Number(value) / 1024 / 1024)} MB`
      : 'Unknown';
  }

  protected mbLabel(value?: number): string {
    return Number.isFinite(value) ? `${Math.round(Number(value))} MB` : 'Unknown';
  }

  protected percentLabel(used?: number, total?: number): string {
    if (!Number.isFinite(used) || !Number.isFinite(total) || !total) return 'Unknown';
    return `${Math.round((Number(used) / Number(total)) * 100)}%`;
  }

  protected ollamaVramLabel(value?: number): string {
    if (!Number.isFinite(value)) return 'VRAM unknown';
    return `${Math.round(Number(value) / 1024 / 1024)} MB VRAM`;
  }

  protected formatObservedAt(value?: string | null): string {
    if (!value) return 'Unknown';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }
}
