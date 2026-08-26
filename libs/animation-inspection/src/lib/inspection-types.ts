export type QaGateStatus =
  | 'BLOCKING'
  | 'REVIEW_REQUIRED'
  | 'PASS'
  | 'STALE'
  | 'NOT_RUN';

export type HierarchyGroupId =
  | 'camera'
  | 'environment'
  | 'actors'
  | 'props'
  | 'materials'
  | 'effects'
  | 'crowds'
  | 'herds'
  | 'simulations'
  | 'world-states'
  | 'montage';

export interface ResolvedHistoricalSourceLike {
  readonly id: string;
  readonly recordRevision: string | number;
  readonly recordHash: string;
  readonly adaptation?: string;
  readonly confidence?: string;
}

export interface ResolvedVisualEvidenceLike {
  readonly id: string;
  readonly recordRevision: string | number;
  readonly recordHash: string;
  readonly rightsMode?: string;
  readonly confidence?: string;
}

export interface ResolvedAssetLike {
  readonly id: string;
  readonly revision: string;
  readonly kind: string;
  readonly logicalPath: string;
  readonly contentHash: string;
  readonly sourceAssetIds: readonly string[];
}

export interface ResolvedRuntimeLike {
  readonly id: string;
  readonly runtime: string;
  readonly version: string;
  readonly adapterVersion: string;
  readonly definitionId: string;
  readonly capabilities: readonly string[];
}

export interface ResolvedSemanticSeedLike {
  readonly targetId: string;
  readonly channel: string;
  readonly purpose: string;
  readonly algorithmVersion: number;
  readonly value: number;
}

export interface ResolvedSceneInspectionInput {
  readonly schemaVersion: string;
  readonly canonicalFormVersion: string;
  readonly hashAlgorithm: string;
  readonly sourceSceneId: string;
  readonly sourceSceneRevision: number;
  readonly sourceSceneHash: string;
  readonly resolvedSceneHash: string;
  readonly frame: {
    readonly fps: number;
    readonly durationFrames: number;
    readonly width: number;
    readonly height: number;
  };
  readonly historicalSources: readonly ResolvedHistoricalSourceLike[];
  readonly visualEvidence: readonly ResolvedVisualEvidenceLike[];
  readonly assets: readonly ResolvedAssetLike[];
  readonly runtimes: readonly ResolvedRuntimeLike[];
  readonly semanticSeeds: readonly ResolvedSemanticSeedLike[];
  readonly qaContract: unknown;
  readonly semanticScene: unknown;
}

export interface ExactFrameViewModel {
  readonly frame: number;
  readonly fps: number;
  readonly durationFrames: number;
  readonly timeSeconds: number;
  readonly progress: number;
  readonly label: string;
}

export interface ProofStateViewModel {
  readonly id: string;
  readonly frame: number;
  readonly description?: string;
  readonly active: boolean;
}

export interface HierarchyNodeViewModel {
  readonly id: string;
  readonly label: string;
  readonly runtimeId?: string;
}

export interface HierarchyGroupViewModel {
  readonly id: HierarchyGroupId;
  readonly label: string;
  readonly nodes: readonly HierarchyNodeViewModel[];
}

export interface ProvenanceSourceViewModel {
  readonly kind: 'historical-source';
  readonly id: string;
  readonly recordRevision: string | number;
  readonly recordHash: string;
  readonly adaptation: string | null;
  readonly confidence: string | null;
}

export interface ProvenanceEvidenceViewModel {
  readonly kind: 'visual-evidence';
  readonly id: string;
  readonly recordRevision: string | number;
  readonly recordHash: string;
  readonly rightsMode: string | null;
  readonly confidence: string | null;
}

export interface QaGateViewModel {
  readonly id: string;
  readonly category: string;
  readonly description: string;
  readonly blocking: boolean;
  readonly status: QaGateStatus;
}

export interface RuntimeDiagnosticViewModel {
  readonly id: string;
  readonly runtime: string;
  readonly version: string;
  readonly adapterVersion: string;
  readonly definitionId: string;
  readonly capabilities: readonly string[];
}

export interface AssetDiagnosticViewModel {
  readonly id: string;
  readonly revision: string;
  readonly kind: string;
  readonly logicalPath: string;
  readonly contentHash: string;
  readonly sourceAssetIds: readonly string[];
}

export interface SeedDiagnosticViewModel {
  readonly targetId: string;
  readonly channel: string;
  readonly purpose: string;
  readonly algorithmVersion: number;
  readonly value: number;
}

export interface DiagnosticBundleViewModel {
  readonly sourceSceneId: string;
  readonly sourceSceneRevision: number;
  readonly sourceSceneHash: string;
  readonly resolvedSceneHash: string;
  readonly canonicalFormVersion: string;
  readonly frame: number;
  readonly fps: number;
  readonly runtimes: readonly RuntimeDiagnosticViewModel[];
  readonly assets: readonly AssetDiagnosticViewModel[];
  readonly semanticSeeds: readonly SeedDiagnosticViewModel[];
}

export interface SceneHeaderViewModel {
  readonly sceneId: string;
  readonly revision: number;
  readonly schemaVersion: string;
  readonly frameSize: string;
  readonly fps: number;
  readonly durationFrames: number;
  readonly sourceCount: number;
  readonly visualEvidenceCount: number;
  readonly runtimeCount: number;
  readonly humanReview: 'REQUIRED' | 'NOT_REQUIRED' | 'UNKNOWN';
}

export interface SceneInspectionViewModel {
  readonly header: SceneHeaderViewModel;
  readonly exactFrame: ExactFrameViewModel;
  readonly proofStates: readonly ProofStateViewModel[];
  readonly hierarchy: readonly HierarchyGroupViewModel[];
  readonly historicalSources: readonly ProvenanceSourceViewModel[];
  readonly visualEvidence: readonly ProvenanceEvidenceViewModel[];
  readonly qaGates: readonly QaGateViewModel[];
  readonly diagnostics: DiagnosticBundleViewModel;
}
