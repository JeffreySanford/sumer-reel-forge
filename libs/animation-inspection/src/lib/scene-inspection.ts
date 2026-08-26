import { buildExactFrameViewModel } from './exact-frame';
import type {
  AssetDiagnosticViewModel,
  DiagnosticBundleViewModel,
  HierarchyGroupId,
  HierarchyGroupViewModel,
  HierarchyNodeViewModel,
  ProvenanceEvidenceViewModel,
  ProvenanceSourceViewModel,
  QaGateViewModel,
  ResolvedSceneInspectionInput,
  RuntimeDiagnosticViewModel,
  SceneInspectionViewModel,
  SeedDiagnosticViewModel,
} from './inspection-types';

interface UnknownRecord {
  readonly [key: string]: unknown;
}

interface HierarchyConfig {
  readonly id: HierarchyGroupId;
  readonly label: string;
  readonly property: string;
}

const HIERARCHY_GROUPS: readonly HierarchyConfig[] = [
  { id: 'camera', label: 'Camera', property: 'camera' },
  { id: 'environment', label: 'Environment', property: 'environments' },
  { id: 'actors', label: 'Actors', property: 'actors' },
  { id: 'props', label: 'Props', property: 'props' },
  { id: 'materials', label: 'Materials', property: 'materials' },
  { id: 'effects', label: 'Effects', property: 'effects' },
  { id: 'crowds', label: 'Crowds', property: 'crowds' },
  { id: 'herds', label: 'Herds', property: 'herds' },
  { id: 'simulations', label: 'Simulations', property: 'simulations' },
  { id: 'world-states', label: 'World states', property: 'worldStates' },
] as const;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function arrayValue(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function semanticSceneRecord(scene: ResolvedSceneInspectionInput): UnknownRecord {
  if (!isRecord(scene.semanticScene)) {
    throw new TypeError('Resolved scene semanticScene must be a canonical object.');
  }
  return scene.semanticScene;
}

function qaRecord(scene: ResolvedSceneInspectionInput): UnknownRecord | undefined {
  return isRecord(scene.qaContract) ? scene.qaContract : undefined;
}

function hierarchyNode(value: unknown): HierarchyNodeViewModel | undefined {
  if (!isRecord(value)) return undefined;
  const id = stringValue(value['id']);
  if (!id) return undefined;

  const runtime = isRecord(value['runtime']) ? value['runtime'] : undefined;
  const runtimeId = runtime ? stringValue(runtime['id']) : undefined;
  const label =
    stringValue(value['title']) ??
    stringValue(value['displayName']) ??
    stringValue(value['actorDefinitionId']) ??
    stringValue(value['definitionId']) ??
    stringValue(value['stateDefinitionId']) ??
    id;

  return Object.freeze({
    id,
    label,
    ...(runtimeId ? { runtimeId } : {}),
  });
}

function buildHierarchy(scene: ResolvedSceneInspectionInput): readonly HierarchyGroupViewModel[] {
  const semantic = semanticSceneRecord(scene);
  const groups = HIERARCHY_GROUPS.map((config) => {
    const nodes = arrayValue(semantic[config.property])
      .map(hierarchyNode)
      .filter((node): node is HierarchyNodeViewModel => node !== undefined);
    return Object.freeze({
      id: config.id,
      label: config.label,
      nodes: Object.freeze(nodes),
    });
  });

  const montage = semantic['montage'];
  const montageNode = hierarchyNode(montage);
  groups.push(
    Object.freeze({
      id: 'montage' as const,
      label: 'Montage',
      nodes: Object.freeze(montageNode ? [montageNode] : []),
    }),
  );

  return Object.freeze(groups);
}

function proofStates(
  scene: ResolvedSceneInspectionInput,
  frame: number,
): readonly {
  readonly id: string;
  readonly frame: number;
  readonly description?: string;
  readonly active: boolean;
}[] {
  const qa = qaRecord(scene);
  if (!qa) return Object.freeze([]);

  const states = arrayValue(qa['benchmarkStates'])
    .map((value) => {
      if (!isRecord(value)) return undefined;
      const id = stringValue(value['id']);
      const stateFrame = numberValue(value['frame']);
      if (!id || stateFrame === undefined || !Number.isInteger(stateFrame)) {
        return undefined;
      }
      const description = stringValue(value['description']);
      return Object.freeze({
        id,
        frame: stateFrame,
        ...(description ? { description } : {}),
        active: stateFrame === frame,
      });
    })
    .filter((state): state is NonNullable<typeof state> => state !== undefined);

  return Object.freeze(states);
}

function qaGates(scene: ResolvedSceneInspectionInput): readonly QaGateViewModel[] {
  const qa = qaRecord(scene);
  if (!qa) return Object.freeze([]);

  const gates = arrayValue(qa['requiredInvariants'])
    .map((value) => {
      if (!isRecord(value)) return undefined;
      const id = stringValue(value['id']);
      const category = stringValue(value['category']);
      const description = stringValue(value['description']);
      const blocking = booleanValue(value['blocking']);
      if (!id || !category || !description || blocking === undefined) {
        return undefined;
      }
      return Object.freeze({
        id,
        category,
        description,
        blocking,
        status: 'NOT_RUN' as const,
      });
    })
    .filter((gate): gate is NonNullable<typeof gate> => gate !== undefined);

  return Object.freeze(gates);
}

function humanReview(
  scene: ResolvedSceneInspectionInput,
): 'REQUIRED' | 'NOT_REQUIRED' | 'UNKNOWN' {
  const qa = qaRecord(scene);
  if (!qa) return 'UNKNOWN';
  const required = booleanValue(qa['humanReviewRequired']);
  if (required === undefined) return 'UNKNOWN';
  return required ? 'REQUIRED' : 'NOT_REQUIRED';
}

function sourceViewModels(
  scene: ResolvedSceneInspectionInput,
): readonly ProvenanceSourceViewModel[] {
  return Object.freeze(
    [...scene.historicalSources]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((source) =>
        Object.freeze({
          kind: 'historical-source' as const,
          id: source.id,
          recordRevision: source.recordRevision,
          recordHash: source.recordHash,
          adaptation: source.adaptation ?? null,
          confidence: source.confidence ?? null,
        }),
      ),
  );
}

function evidenceViewModels(
  scene: ResolvedSceneInspectionInput,
): readonly ProvenanceEvidenceViewModel[] {
  return Object.freeze(
    [...scene.visualEvidence]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((evidence) =>
        Object.freeze({
          kind: 'visual-evidence' as const,
          id: evidence.id,
          recordRevision: evidence.recordRevision,
          recordHash: evidence.recordHash,
          rightsMode: evidence.rightsMode ?? null,
          confidence: evidence.confidence ?? null,
        }),
      ),
  );
}

function runtimeDiagnostics(
  scene: ResolvedSceneInspectionInput,
): readonly RuntimeDiagnosticViewModel[] {
  return Object.freeze(
    [...scene.runtimes]
      .sort((a, b) => `${a.id}\u0000${a.runtime}`.localeCompare(`${b.id}\u0000${b.runtime}`))
      .map((runtime) =>
        Object.freeze({
          id: runtime.id,
          runtime: runtime.runtime,
          version: runtime.version,
          adapterVersion: runtime.adapterVersion,
          definitionId: runtime.definitionId,
          capabilities: Object.freeze([...runtime.capabilities].sort()),
        }),
      ),
  );
}

function assetDiagnostics(
  scene: ResolvedSceneInspectionInput,
): readonly AssetDiagnosticViewModel[] {
  return Object.freeze(
    [...scene.assets]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((asset) =>
        Object.freeze({
          id: asset.id,
          revision: asset.revision,
          kind: asset.kind,
          logicalPath: asset.logicalPath,
          contentHash: asset.contentHash,
          sourceAssetIds: Object.freeze([...asset.sourceAssetIds].sort()),
        }),
      ),
  );
}

function seedDiagnostics(
  scene: ResolvedSceneInspectionInput,
): readonly SeedDiagnosticViewModel[] {
  return Object.freeze(
    [...scene.semanticSeeds]
      .sort((a, b) =>
        `${a.targetId}\u0000${a.channel}\u0000${a.purpose}`.localeCompare(
          `${b.targetId}\u0000${b.channel}\u0000${b.purpose}`,
        ),
      )
      .map((seed) => Object.freeze({ ...seed })),
  );
}

function diagnostics(
  scene: ResolvedSceneInspectionInput,
  frame: number,
): DiagnosticBundleViewModel {
  return Object.freeze({
    sourceSceneId: scene.sourceSceneId,
    sourceSceneRevision: scene.sourceSceneRevision,
    sourceSceneHash: scene.sourceSceneHash,
    resolvedSceneHash: scene.resolvedSceneHash,
    canonicalFormVersion: scene.canonicalFormVersion,
    frame,
    fps: scene.frame.fps,
    runtimes: runtimeDiagnostics(scene),
    assets: assetDiagnostics(scene),
    semanticSeeds: seedDiagnostics(scene),
  });
}

export function buildSceneInspection(
  scene: ResolvedSceneInspectionInput,
  frame: number,
): SceneInspectionViewModel {
  const exactFrame = buildExactFrameViewModel({
    frame,
    fps: scene.frame.fps,
    durationFrames: scene.frame.durationFrames,
  });

  return Object.freeze({
    header: Object.freeze({
      sceneId: scene.sourceSceneId,
      revision: scene.sourceSceneRevision,
      schemaVersion: scene.schemaVersion,
      frameSize: `${scene.frame.width}×${scene.frame.height}`,
      fps: scene.frame.fps,
      durationFrames: scene.frame.durationFrames,
      sourceCount: scene.historicalSources.length,
      visualEvidenceCount: scene.visualEvidence.length,
      runtimeCount: scene.runtimes.length,
      humanReview: humanReview(scene),
    }),
    exactFrame,
    proofStates: proofStates(scene, frame),
    hierarchy: buildHierarchy(scene),
    historicalSources: sourceViewModels(scene),
    visualEvidence: evidenceViewModels(scene),
    qaGates: qaGates(scene),
    diagnostics: diagnostics(scene, frame),
  });
}

export function serializeDiagnosticBundle(
  bundle: DiagnosticBundleViewModel,
): string {
  return JSON.stringify(bundle, null, 2);
}
