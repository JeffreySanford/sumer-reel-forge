import type {
  ResolvedSceneInspectionInput,
  SceneInspectionViewModel,
} from '@sumer-reel-forge/animation-inspection';
import {
  assertDeterministicEvaluation,
  FakeRuntimeAdapter,
  type FakeRuntimeDefinition,
  type PreparedFakeRuntime,
  type RuntimeFrameContext,
  type RuntimeFrameState,
} from '@sumer-reel-forge/animation-runtime';

export type RuntimePreviewNodeKind = 'environment' | 'prop' | 'actor';

export interface RuntimePreviewNode {
  readonly id: string;
  readonly label: string;
  readonly kind: RuntimePreviewNodeKind;
  readonly runtimeId: string;
  readonly definitionId: string;
  readonly x: number;
  readonly y: number;
  readonly opacity: number;
  readonly proofState?: string;
}

export interface RuntimePreviewModel {
  readonly adapterId: string;
  readonly frame: number;
  readonly proofState?: string;
  readonly evaluatedRuntimeCount: number;
  readonly nodes: readonly RuntimePreviewNode[];
}

export interface RuntimePreviewInput {
  readonly fixture: ResolvedSceneInspectionInput;
  readonly inspection: SceneInspectionViewModel;
}

export interface RuntimePreviewAdapter {
  readonly id: string;
  evaluate(input: RuntimePreviewInput): RuntimePreviewModel;
}

type UnknownRecord = Record<string, unknown>;

const DEFAULT_FAKE_DEFINITIONS: Readonly<Record<string, FakeRuntimeDefinition>> = {
  'runtime-def:camera:foundation': {
    id: 'runtime-def:camera:foundation',
    origin: { x: 0, y: 0 },
    opacity: 1,
  },
  'runtime-def:gulf-water:foundation': {
    id: 'runtime-def:gulf-water:foundation',
    origin: { x: 0, y: 0 },
    opacity: 1,
  },
  'runtime-def:enki:foundation': {
    id: 'runtime-def:enki:foundation',
    origin: { x: 0, y: 0 },
    velocityPerFrame: { x: 0.01, y: 0 },
    opacity: 1,
    proofStates: { 101: 'BLINK_CLOSED' },
  },
  'runtime-def:stag:foundation': {
    id: 'runtime-def:stag:foundation',
    origin: { x: 4, y: 2 },
    velocityPerFrame: { x: 0.02, y: 0.005 },
    opacity: 1,
    proofStates: { 101: 'VESSEL_TRAVEL' },
  },
};

function asRecord(value: unknown): UnknownRecord | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as UnknownRecord;
}

function asRecordArray(value: unknown): readonly UnknownRecord[] {
  if (!Array.isArray(value)) return [];
  return value.map(asRecord).filter((item): item is UnknownRecord => Boolean(item));
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readSceneSeed(fixture: ResolvedSceneInspectionInput): number {
  const seed = asRecord(fixture.semanticScene)?.['seed'];
  if (typeof seed !== 'number' || !Number.isInteger(seed)) {
    throw new Error('Resolved semanticScene is missing its integer scene seed.');
  }
  return seed;
}

function readShotId(fixture: ResolvedSceneInspectionInput): string | undefined {
  const story = asRecord(asRecord(fixture.semanticScene)?.['story']);
  const shotId = story?.['shotId'];
  return typeof shotId === 'string' ? shotId : undefined;
}

function readParentIds(fixture: ResolvedSceneInspectionInput): ReadonlyMap<string, string> {
  const semanticScene = asRecord(fixture.semanticScene);
  const parentIds = new Map<string, string>();
  for (const collection of ['actors', 'props'] as const) {
    for (const item of asRecordArray(semanticScene?.[collection])) {
      const id = item['id'];
      const parentId = asRecord(item['transform'])?.['parentId'];
      if (typeof id === 'string' && typeof parentId === 'string') {
        parentIds.set(id, parentId);
      }
    }
  }
  return parentIds;
}

function frameContext(input: RuntimePreviewInput): RuntimeFrameContext {
  const shotId = readShotId(input.fixture);
  return {
    frame: input.inspection.exactFrame.frame,
    fps: input.inspection.exactFrame.fps,
    durationFrames: input.inspection.exactFrame.durationFrames,
    timeSeconds: input.inspection.exactFrame.timeSeconds,
    progress: input.inspection.exactFrame.progress,
    sceneId: input.inspection.header.sceneId,
    ...(shotId ? { shotId } : {}),
    sceneSeed: readSceneSeed(input.fixture),
    mode: 'preview',
  };
}

function statePosition(state: RuntimeFrameState): {
  readonly x: number;
  readonly y: number;
  readonly opacity: number;
} {
  return {
    x: finiteNumber(state.values['x'], 0),
    y: finiteNumber(state.values['y'], 0),
    opacity: finiteNumber(state.values['opacity'], 1),
  };
}

export class FakeRuntimePreviewAdapter implements RuntimePreviewAdapter {
  readonly id = 'fake-runtime-preview@1';
  private readonly runtime = new FakeRuntimeAdapter();

  constructor(
    private readonly definitions: Readonly<Record<string, FakeRuntimeDefinition>> =
      DEFAULT_FAKE_DEFINITIONS,
  ) {}

  evaluate(input: RuntimePreviewInput): RuntimePreviewModel {
    const context = frameContext(input);
    const statesByRuntimeId = new Map<string, RuntimeFrameState>();
    const definitionsByRuntimeId = new Map<string, string>();

    for (const binding of input.fixture.runtimes) {
      if (binding.runtime !== this.runtime.type || binding.version !== this.runtime.version) {
        throw new Error(
          `Preview adapter ${this.id} cannot evaluate ${binding.runtime}@${binding.version}.`,
        );
      }
      const definition = this.definitions[binding.definitionId];
      if (!definition) {
        throw new Error(`Preview definition ${binding.definitionId} is not registered.`);
      }
      const validation = this.runtime.validate(definition);
      if (!validation.valid) {
        throw new Error(validation.issues.map((issue) => issue.message).join('; '));
      }
      const prepared: PreparedFakeRuntime = Object.freeze({
        definition: Object.freeze({ ...definition }),
        sceneId: input.inspection.header.sceneId,
      });
      statesByRuntimeId.set(
        binding.id,
        assertDeterministicEvaluation(this.runtime, prepared, context),
      );
      definitionsByRuntimeId.set(binding.id, binding.definitionId);
    }

    const parentIds = readParentIds(input.fixture);
    const nodeState = new Map<
      string,
      { readonly state: RuntimeFrameState; readonly runtimeId: string }
    >();

    for (const group of input.inspection.hierarchy) {
      for (const node of group.nodes) {
        if (!node.runtimeId) continue;
        const state = statesByRuntimeId.get(node.runtimeId);
        if (state) nodeState.set(node.id, { state, runtimeId: node.runtimeId });
      }
    }

    const drawableGroups = new Map<RuntimePreviewNodeKind, string>([
      ['environment', 'environment'],
      ['prop', 'props'],
      ['actor', 'actors'],
    ]);
    const nodes: RuntimePreviewNode[] = [];

    for (const [kind, groupId] of drawableGroups) {
      const group = input.inspection.hierarchy.find((item) => item.id === groupId);
      if (!group) continue;
      for (const node of group.nodes) {
        if (!node.runtimeId) continue;
        const entry = nodeState.get(node.id);
        if (!entry) continue;
        const local = statePosition(entry.state);
        const parentId = parentIds.get(node.id);
        const parentEntry = parentId ? nodeState.get(parentId) : undefined;
        const parent = parentEntry
          ? statePosition(parentEntry.state)
          : { x: 0, y: 0, opacity: 1 };
        nodes.push({
          id: node.id,
          label: node.label,
          kind,
          runtimeId: entry.runtimeId,
          definitionId: definitionsByRuntimeId.get(entry.runtimeId) ?? entry.state.definitionId,
          x: local.x + parent.x,
          y: local.y + parent.y,
          opacity: Math.min(1, Math.max(0, local.opacity * parent.opacity)),
          ...(entry.state.proofState ? { proofState: entry.state.proofState } : {}),
        });
      }
    }

    const activeProofId = input.inspection.proofStates.find((state) => state.active)?.id;
    return Object.freeze({
      adapterId: this.id,
      frame: context.frame,
      ...(activeProofId ? { proofState: activeProofId } : {}),
      evaluatedRuntimeCount: statesByRuntimeId.size,
      nodes: Object.freeze(nodes),
    });
  }
}

export const GOLDEN_FAKE_RUNTIME_PREVIEW_ADAPTER = new FakeRuntimePreviewAdapter();