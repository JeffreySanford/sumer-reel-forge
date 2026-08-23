import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { StudioNavComponent } from './studio-nav.component';
import type { ComfyUiInventory, ShotLayerTarget } from './layer-production.types';
import type { HostCapabilities } from './system-capabilities.types';

@Component({
  selector: 'app-layer-production',
  standalone: true,
  imports: [RouterLink, StudioNavComponent],
  templateUrl: './layer-production.component.html',
  styleUrl: './layer-production.component.scss',
})
export class LayerProductionComponent {
  private readonly http = inject(HttpClient);

  protected readonly host = signal<HostCapabilities | null>(null);
  protected readonly inventory = signal<ComfyUiInventory | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly shotThreeLayers: ShotLayerTarget[] = [
    {
      id: 'shot03-background-v1',
      label: 'Background',
      role: 'Stable scene plate behind all separated material.',
      material: 'painted environment',
      required: true,
      status: 'planned',
    },
    {
      id: 'shot03-water-v1',
      label: 'Water',
      role: 'Registered transparent water layer for current, shimmer, and parallax.',
      material: 'fluid / reflective',
      required: true,
      recommendedFirst: true,
      status: 'planned',
    },
    {
      id: 'shot03-vessel-v1',
      label: 'Vessel',
      role: 'Rigid foreground structure with controlled physical motion.',
      material: 'wood / rigid',
      required: true,
      status: 'planned',
    },
    {
      id: 'shot03-enki-body-v1',
      label: 'Enki body',
      role: 'Character silhouette preserved without damaging facial detail.',
      material: 'character / organic',
      required: true,
      status: 'planned',
    },
    {
      id: 'shot03-rigging-v1',
      label: 'Rigging / cloth',
      role: 'Optional secondary motion for rope, sail, and cloth response.',
      material: 'cloth / flexible',
      required: false,
      status: 'planned',
    },
    {
      id: 'shot03-eyes-v1',
      label: 'Eyes',
      role: 'Optional micro-expression isolation only if extraction remains painterly.',
      material: 'character detail',
      required: false,
      status: 'planned',
    },
  ];

  protected readonly gpuReady = computed(
    () => Boolean(this.host()?.runtimePlan?.ai?.nvidiaCudaAvailable),
  );
  protected readonly comfyReady = computed(
    () => Boolean(this.inventory()?.online),
  );
  protected readonly workflowReady = computed(
    () => Boolean(this.host()?.comfyui.layerWorkflowReady),
  );
  protected readonly inventoryReady = computed(
    () => (this.inventory()?.nodeCount ?? 0) > 0,
  );
  protected readonly layerPipelineReady = computed(
    () =>
      this.gpuReady() &&
      this.comfyReady() &&
      this.inventoryReady() &&
      this.workflowReady(),
  );

  protected readonly nextStep = computed(() => {
    if (!this.gpuReady()) {
      return 'Restore NVIDIA GPU detection before attempting any layer generation.';
    }
    if (!this.comfyReady()) {
      return 'Start ComfyUI on the configured local address, then refresh this inventory.';
    }
    if (!this.inventoryReady()) {
      return 'ComfyUI is reachable, but no node inventory was returned. Inspect the local ComfyUI installation.';
    }
    if (!this.workflowReady()) {
      return 'Use the detected node/model inventory to build and export the dedicated Shot 3 API-format layer workflow.';
    }
    return 'Run the zero-generation preflight for shot03-water-v1 before creating the first candidate.';
  });

  constructor() {
    this.refresh();
  }

  protected refresh(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      host: this.http.get<HostCapabilities>('/api/runtime/capabilities'),
      inventory: this.http.get<ComfyUiInventory>('/api/runtime/comfyui-inventory'),
    }).subscribe({
      next: ({ host, inventory }) => {
        this.host.set(host);
        this.inventory.set(inventory);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(
          error?.message ?? 'Layer production readiness could not be loaded.',
        );
        this.loading.set(false);
      },
    });
  }

  protected familyCount(values?: string[]): number {
    return values?.length ?? 0;
  }

  protected resourcePreview(): string[] {
    return (
      this.inventory()?.resources
        .slice(0, 8)
        .map(
          (resource) =>
            `${resource.nodeType}.${resource.inputName}: ${resource.values.slice(0, 3).join(', ')}`,
        ) ?? []
    );
  }
}
