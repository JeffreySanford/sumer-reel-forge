export type HostCapabilityStatus =
  | 'ready'
  | 'limited'
  | 'unavailable'
  | 'unknown';

export interface HostSoftwareCapability {
  id: string;
  label: string;
  status: HostCapabilityStatus;
  detail: string;
  version?: string;
}

export interface HostProjection {
  id: string;
  title: string;
  status: HostCapabilityStatus;
  summary: string;
  basis: string[];
  recommendation?: string;
}

export interface HostCapabilities {
  schemaVersion: number;
  source: 'startup-profile' | 'live-fallback';
  profileGeneratedAt: string | null;
  observedAt: string;
  host: string;
  platform: string;
  arch: string;
  cpu: {
    model?: string;
    logicalCount?: number;
    averageReportedMhz?: number;
  } | null;
  memory: { totalGb?: number; freeGb?: number } | null;
  disk: { totalGb?: number; freeGb?: number } | null;
  gpu: {
    nvidiaSmiAvailable?: boolean;
    cudaToolkit?: string;
    devices?: Array<{
      vendor?: string;
      index?: number;
      name?: string;
      memoryTotalMb?: number;
      driverVersion?: string;
    }>;
  };
  media: {
    ffmpegAvailable?: boolean;
    encoders?: {
      h264Nvenc?: boolean;
      hevcNvenc?: boolean;
      av1Nvenc?: boolean;
    };
  } | null;
  ollama: { baseUrl: string; online: boolean; models: string[] };
  comfyui: {
    baseUrl: string;
    online: boolean;
    detail: string;
    layerWorkflowPath?: string | null;
    layerWorkflowReady?: boolean;
  };
  runtimePlan: {
    tier?: string;
    remotion?: {
      parallelRenders?: number;
      concurrencyPerRender?: number;
      hardwareAcceleration?: string;
      gl?: string;
      source?: string;
    };
    ai?: {
      nvidiaCudaAvailable?: boolean;
      ollamaOnline?: boolean;
      ollamaReviewConcurrency?: number;
      comfyConcurrency?: number;
      comfyVramMode?: string;
      chatterboxDevice?: string;
    };
    encoding?: {
      ffmpegAvailable?: boolean;
      nvencAvailable?: boolean;
      preferredH264Encoder?: string;
    };
    reserves?: {
      logicalCpuReserved?: number;
      estimatedMemoryGbReserved?: number;
    };
  } | null;
  software: HostSoftwareCapability[];
  projections: HostProjection[];
}
