import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { StudioNavComponent } from './studio-nav.component';
import type {
  AnimationBenchmarkEvidence,
  AnimationBenchmarkEvidenceStatus,
  AnimationProductionLayerStatus,
  AnimationProductionShotStatus,
  AnimationProductionStatus,
  ComfyUiInventory,
} from './layer-production.types';
import type { HostCapabilities } from './system-capabilities.types';

const SEMANTIC_LAYER_NODE_TYPES = [
  'LoadImage',
  'CheckpointLoaderSimple',
  'CLIPTextEncode',
  'SAM3_Detect',
  'JoinImageWithAlpha',
  'SaveImage',
] as const;
const SAM3_MODEL = 'sam3.1_multiplex_fp16.safetensors';

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
  protected readonly production = signal<AnimationProductionStatus | null>(null);
  protected readonly benchmarkEvidence =
    signal<AnimationBenchmarkEvidenceStatus | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedShotNumber = signal(3);
  protected readonly selectedLayerId = signal<string | null>(null);

  protected readonly primaryGpu = computed(
    () => this.host()?.gpu.devices?.[0] ?? null,
  );
  protected readonly gpuName = computed(
    () => this.primaryGpu()?.name ?? 'No NVIDIA device reported',
  );
  protected readonly gpuVramLabel = computed(() => {
    const memoryTotalMb = this.primaryGpu()?.memoryTotalMb;
    return memoryTotalMb
      ? `${(memoryTotalMb / 1024).toFixed(1)} GB VRAM`
      : 'VRAM unknown';
  });
  protected readonly gpuReady = computed(
    () => Boolean(this.host()?.runtimePlan?.ai?.nvidiaCudaAvailable),
  );
  protected readonly comfyReady = computed(
    () => Boolean(this.inventory()?.online),
  );
  protected readonly builtInSemanticWorkflowReady = computed(() => {
    const inventory = this.inventory();
    if (!inventory?.online) return false;

    const nodesReady = SEMANTIC_LAYER_NODE_TYPES.every((nodeType) =>
      inventory.nodeTypes.includes(nodeType),
    );
    const modelReady = inventory.resources.some(
      (resource) =>
        resource.nodeType === 'CheckpointLoaderSimple' &&
        resource.inputName === 'ckpt_name' &&
        resource.values.includes(SAM3_MODEL),
    );

    return nodesReady && modelReady;
  });
  protected readonly workflowReady = computed(
    () =>
      Boolean(this.host()?.comfyui.layerWorkflowReady) ||
      this.builtInSemanticWorkflowReady(),
  );
  protected readonly inventoryReady = computed(
    () => (this.inventory()?.nodeCount ?? 0) > 0,
  );
  protected readonly shots = computed(() => this.production()?.shots ?? []);
  protected readonly selectedShot = computed<AnimationProductionShotStatus | null>(
    () =>
      this.shots().find(
        (shot) => shot.sourceShotNumber === this.selectedShotNumber(),
      ) ??
      this.shots()[0] ??
      null,
  );
  protected readonly selectedLayer = computed<AnimationProductionLayerStatus | null>(
    () => {
      const shot = this.selectedShot();
      if (!shot) return null;
      return (
        shot.layers.find((layer) => layer.id === this.selectedLayerId()) ??
        shot.layers.find((layer) => layer.required) ??
        shot.layers[0] ??
        null
      );
    },
  );
  protected readonly selectedEvidence = computed<AnimationBenchmarkEvidence | null>(
    () => {
      const shot = this.selectedShot();
      if (!shot) return null;
      return (
        this.benchmarkEvidence()?.shots.find(
          (evidence) => evidence.sourceShotNumber === shot.sourceShotNumber,
        ) ?? null
      );
    },
  );
  protected readonly allKnownShotsReady = computed(() => {
    const production = this.production();
    return Boolean(
      production &&
        production.summary.shotCount > 0 &&
        production.summary.layeredReadyCount === production.summary.shotCount,
    );
  });

  protected readonly nextStep = computed(() => {
    if (!this.production()) {
      return 'Load the animation production manifest before making production decisions.';
    }
    if (this.allKnownShotsReady()) {
      return 'The current production benchmarks are layered-ready. Use the automated planner and lane registry for the next shot, while keeping human review as the final promotion gate.';
    }
    if (!this.gpuReady()) {
      return 'Restore NVIDIA GPU detection before attempting new candidate generation.';
    }
    if (!this.comfyReady()) {
      return 'Start ComfyUI on the configured local address before generating unresolved layers.';
    }
    if (!this.inventoryReady()) {
      return 'ComfyUI is reachable, but no node inventory was returned. Inspect the local installation.';
    }
    if (!this.workflowReady()) {
      return 'Restore the semantic layer workflow before generating unresolved production lanes.';
    }
    return 'Select the next unresolved shot and let the manifest-driven planner choose production lanes before generation.';
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
      production: this.http.get<AnimationProductionStatus>(
        '/api/runtime/animation-production',
      ),
      benchmarkEvidence: this.http.get<AnimationBenchmarkEvidenceStatus>(
        '/api/runtime/animation-production-evidence',
      ),
    }).subscribe({
      next: ({ host, inventory, production, benchmarkEvidence }) => {
        this.host.set(host);
        this.inventory.set(inventory);
        this.production.set(production);
        this.benchmarkEvidence.set(benchmarkEvidence);
        if (
          !production.shots.some(
            (shot) => shot.sourceShotNumber === this.selectedShotNumber(),
          )
        ) {
          this.selectedShotNumber.set(
            production.shots[0]?.sourceShotNumber ?? this.selectedShotNumber(),
          );
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(
          error?.message ?? 'Production cockpit status could not be loaded.',
        );
        this.loading.set(false);
      },
    });
  }

  protected selectShot(shot: AnimationProductionShotStatus): void {
    this.selectedShotNumber.set(shot.sourceShotNumber);
    this.selectedLayerId.set(
      shot.layers.find((layer) => layer.required)?.id ?? shot.layers[0]?.id ?? null,
    );
  }

  protected selectLayer(layer: AnimationProductionLayerStatus): void {
    this.selectedLayerId.set(layer.id);
  }

  protected familyCount(values?: string[]): number {
    return values?.length ?? 0;
  }

  protected resourcePreview(): string[] {
    return (
      this.inventory()?.resources
        .slice(0, 6)
        .map(
          (resource) =>
            `${resource.nodeType}.${resource.inputName}: ${resource.values.slice(0, 3).join(', ')}`,
        ) ?? []
    );
  }

  protected shotTitle(shot: AnimationProductionShotStatus): string {
    return shot.shotId
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  protected layerLabel(layer: AnimationProductionLayerStatus): string {
    return layer.id
      .replace(/^shot\d+-/, '')
      .replace(/-v\d+$/, '')
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  protected shortChecksum(value: string | null): string {
    if (!value) return 'not recorded';
    const normalized = value.replace(/^sha256:/, '');
    return `sha256:${normalized.slice(0, 12)}…`;
  }

  protected decisionValue(value: unknown): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'boolean' || typeof value === 'number') {
      return String(value);
    }
    return JSON.stringify(value) ?? String(value);
  }
}
