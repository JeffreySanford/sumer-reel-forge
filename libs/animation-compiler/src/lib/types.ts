export const RESOLVED_SCENE_SCHEMA_VERSION = 'resolved-scene-v3:1' as const;
export const SCENE_CANONICAL_FORM_VERSION = 'scene-canonical-form:v1' as const;
export const SCENE_HASH_ALGORITHM = 'sha256' as const;

export type CompilerSeverity = 'error' | 'warning';
export type CompilerStatus = 'PASS' | 'FAIL';
export type CompilerStageStatus = CompilerStatus | 'SKIP';
export type CompilerStageId =
  | 'schema'
  | 'sources'
  | 'evidence'
  | 'assets'
  | 'runtimes'
  | 'capabilities'
  | 'seeds'
  | 'canonicalize';

export interface CompilerIssue {
  readonly severity: CompilerSeverity;
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

export interface CompilerValidationResult {
  readonly valid: boolean;
  readonly issues: readonly CompilerIssue[];
}

export interface CompilerStageResult {
  readonly id: CompilerStageId;
  readonly status: CompilerStageStatus;
  readonly issueCodes: readonly string[];
}

export interface CompilerReport {
  readonly sceneId: string;
  readonly status: CompilerStatus;
  readonly stages: readonly CompilerStageResult[];
  readonly issues: readonly CompilerIssue[];
}

export interface CompilerAssetReference {
  readonly id: string;
  readonly kind: string;
  readonly logicalPath: string;
  readonly sha256: string;
  readonly revision: string;
  readonly sourceAssetIds?: readonly string[];
}

export interface RuntimeReferenceLike {
  readonly id: string;
  readonly runtime: string;
  readonly runtimeVersion: string;
  readonly definitionId: string;
}

export interface SceneCompilerInput {
  readonly schemaVersion: string;
  readonly id: string;
  readonly revision: number;
  readonly fps: number;
  readonly durationFrames: number;
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  readonly historicalSourceIds: readonly string[];
  readonly visualEvidenceIds: readonly string[];
  readonly assets: readonly CompilerAssetReference[];
  readonly qa: unknown;
}

export interface ResolvedHistoricalSource {
  readonly id: string;
  readonly recordRevision: string | number;
  readonly recordHash: string;
  readonly adaptation?: string;
  readonly confidence?: string;
}

export interface ResolvedVisualEvidence {
  readonly id: string;
  readonly recordRevision: string | number;
  readonly recordHash: string;
  readonly rightsMode?: string;
  readonly confidence?: string;
}

export interface ResolvedAssetBinding {
  readonly id: string;
  readonly revision: string;
  readonly kind: string;
  readonly logicalPath: string;
  readonly contentHash: string;
  readonly sourceAssetIds: readonly string[];
}

export interface ResolvedRuntimeBinding {
  readonly id: string;
  readonly runtime: string;
  readonly version: string;
  readonly adapterVersion: string;
  readonly definitionId: string;
  readonly capabilities: readonly string[];
}

export interface ResolvedSemanticSeed {
  readonly targetId: string;
  readonly channel: string;
  readonly purpose: string;
  readonly algorithmVersion: number;
  readonly value: number;
}

export interface ResolvedSceneFrame {
  readonly fps: number;
  readonly durationFrames: number;
  readonly width: number;
  readonly height: number;
}

export interface ResolvedSceneV3Payload {
  readonly schemaVersion: typeof RESOLVED_SCENE_SCHEMA_VERSION;
  readonly canonicalFormVersion: typeof SCENE_CANONICAL_FORM_VERSION;
  readonly hashAlgorithm: typeof SCENE_HASH_ALGORITHM;
  readonly sourceSceneId: string;
  readonly sourceSceneRevision: number;
  readonly sourceSceneHash: string;
  readonly frame: ResolvedSceneFrame;
  readonly historicalSources: readonly ResolvedHistoricalSource[];
  readonly visualEvidence: readonly ResolvedVisualEvidence[];
  readonly assets: readonly ResolvedAssetBinding[];
  readonly runtimes: readonly ResolvedRuntimeBinding[];
  readonly semanticSeeds: readonly ResolvedSemanticSeed[];
  readonly qaContract: unknown;
  readonly semanticScene: unknown;
}

export interface ResolvedSceneV3 extends ResolvedSceneV3Payload {
  readonly resolvedSceneHash: string;
}

export interface CompileResult {
  readonly ok: boolean;
  readonly report: CompilerReport;
  readonly resolvedScene?: ResolvedSceneV3;
}

export interface SceneCompilerDependencies<
  TScene extends SceneCompilerInput = SceneCompilerInput,
> {
  validateScene(scene: TScene): CompilerValidationResult;
  resolveHistoricalSource(id: string): ResolvedHistoricalSource | undefined;
  resolveVisualEvidence(id: string): ResolvedVisualEvidence | undefined;
  collectRuntimeReferences(scene: TScene): readonly RuntimeReferenceLike[];
  resolveRuntime(reference: RuntimeReferenceLike): ResolvedRuntimeBinding | undefined;
  validateCapabilities?(
    scene: TScene,
    runtimes: readonly ResolvedRuntimeBinding[],
  ): CompilerValidationResult;
  deriveSemanticSeeds(scene: TScene): readonly ResolvedSemanticSeed[];
}
