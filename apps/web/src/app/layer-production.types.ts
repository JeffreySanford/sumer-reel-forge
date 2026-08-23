export interface ComfyUiResourceChoice {
  nodeType: string;
  inputName: string;
  values: Array<string | number | boolean>;
}

export interface ComfyUiLayerFamilies {
  segmentation: string[];
  matting: string[];
  backgroundRemoval: string[];
  depth: string[];
  inpaint: string[];
}

export interface ComfyUiInventory {
  schemaVersion: number;
  baseUrl: string;
  observedAt: string;
  online: boolean;
  error: string | null;
  nodeCount: number;
  nodeTypes: string[];
  layerNodeTypes: string[];
  resources: ComfyUiResourceChoice[];
  families: ComfyUiLayerFamilies;
}

export interface AnimationProductionDecisionStatus {
  id: string;
  state: string;
  scopeType: string | null;
  path: string;
  value: unknown;
  rationale: string | null;
}

export interface AnimationProductionLayerStatus {
  id: string;
  path: string | null;
  role: string;
  material: string;
  required: boolean;
  hasAlpha: boolean;
  motionPresets: string[];
  state: string;
  reviewStatus: string;
  reviewNotes: string[];
  qaEvidenceRecorded: boolean;
  coverageAdvisory: string | null;
  fileExists: boolean;
  dimensions: { width: number; height: number } | null;
  sourceDimensions: { width: number; height: number } | null;
  dimensionsMatchSource: boolean;
  sha256: string | null;
  checksumMatches: boolean;
  ready: boolean;
  lane: {
    id: string;
    generatorFamily: string | null;
    qaFamily: string | null;
    notes: string[];
  } | null;
  decisions: AnimationProductionDecisionStatus[];
}

export interface AnimationProductionShotStatus {
  shotId: string;
  sourceShotNumber: number;
  status: string;
  sourceFrame: string;
  activationState: 'layered-ready' | 'editorial-fallback';
  requiredLayerCount: number;
  readyRequiredLayerCount: number;
  optionalLayerCount: number;
  deferredPerformanceEnabled: boolean;
  fallbackAssetPath: string | null;
  sourceDimensions: { width: number; height: number } | null;
  layers: AnimationProductionLayerStatus[];
  decisions: AnimationProductionDecisionStatus[];
}

export interface AnimationProductionStatus {
  schemaVersion: number;
  observedAt: string;
  principle: string;
  manifestId: string;
  manifestPath: string;
  projectSlug: string;
  chapterNumber: number;
  episodeNumber: number;
  assetVersion: string;
  sourceEditorialVersion: string | null;
  laneRegistryId: string;
  styleDecisionLibraryId: string;
  summary: {
    shotCount: number;
    layeredReadyCount: number;
    approvedRequiredLayerCount: number;
    requiredLayerCount: number;
  };
  shots: AnimationProductionShotStatus[];
}

export interface AnimationBenchmarkEvidence {
  sourceShotNumber: number;
  available: boolean;
  videoUrl: string | null;
  contactSheetUrl: string | null;
  videoPath: string | null;
  contactSheetPath: string | null;
  renderedAt: string | null;
}

export interface AnimationBenchmarkEvidenceStatus {
  schemaVersion: number;
  observedAt: string;
  shots: AnimationBenchmarkEvidence[];
}
