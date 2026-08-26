import type { RuntimeReference } from './runtime-reference';
import type { SceneV3 } from './scene-v3';
import { isSemanticId } from './ids';
import type { FrameRange, TransformDefinition } from './track';
import { SCENE_V3_SCHEMA_VERSION } from './versioning';

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

const SHA256_PATTERN = /^(?:sha256:)?[a-f0-9]{64}$/i;
const VALID_QA_CATEGORIES = new Set([
  'identity',
  'historical-provenance',
  'motion',
  'material',
  'containment',
  'camera',
  'accessibility',
  'human-review',
]);

function result(issues: ValidationIssue[]): ValidationResult {
  return {
    valid: !issues.some((issue) => issue.severity === 'error'),
    issues,
  };
}

function error(issues: ValidationIssue[], code: string, message: string): void {
  issues.push({ severity: 'error', code, message });
}

function validateUniqueIds(
  issues: ValidationIssue[],
  namespace: string,
  values: readonly { id: string }[],
): void {
  const ids = new Set<string>();
  for (const value of values) {
    if (!value.id || !isSemanticId(value.id)) {
      error(
        issues,
        'scene-v3.semantic-id.invalid',
        `${namespace} id ${value.id || '<empty>'} is not a valid semantic id.`,
      );
    }
    if (ids.has(value.id)) {
      error(
        issues,
        'scene-v3.id.duplicate',
        `Duplicate ${namespace} id ${value.id}.`,
      );
    }
    ids.add(value.id);
  }
}

function validateFrameRange(
  issues: ValidationIssue[],
  label: string,
  range: FrameRange,
  durationFrames: number,
): void {
  if (!Number.isInteger(range.startFrame) || !Number.isInteger(range.endFrame)) {
    error(
      issues,
      'scene-v3.frame-range.integer-required',
      `${label} frame bounds must be integers.`,
    );
    return;
  }
  if (
    range.startFrame < 0 ||
    range.endFrame <= range.startFrame ||
    range.endFrame > durationFrames
  ) {
    error(
      issues,
      'scene-v3.frame-range.invalid',
      `${label} must use [startFrame, endFrame) inside 0..${durationFrames}.`,
    );
  }
}

function validateRuntimeReference(
  issues: ValidationIssue[],
  ownerId: string,
  runtime: RuntimeReference,
): void {
  if (!runtime.id || !isSemanticId(runtime.id)) {
    error(
      issues,
      'scene-v3.runtime.id.invalid',
      `${ownerId} has invalid runtime id ${runtime.id || '<empty>'}.`,
    );
  }
  if (!runtime.runtimeVersion.trim()) {
    error(
      issues,
      'scene-v3.runtime.version.required',
      `${ownerId} runtime ${runtime.id} must declare a runtimeVersion.`,
    );
  }
  if (!runtime.definitionId.trim()) {
    error(
      issues,
      'scene-v3.runtime.definition.required',
      `${ownerId} runtime ${runtime.id} must declare a definitionId.`,
    );
  }
}

function parentOf(
  item: { id: string; transform?: TransformDefinition },
): string | undefined {
  return item.transform?.parentId;
}

function validateParentGraph(
  issues: ValidationIssue[],
  targets: readonly { id: string; transform?: TransformDefinition }[],
): void {
  const known = new Set(targets.map((target) => target.id));
  const parents = new Map<string, string>();

  for (const target of targets) {
    const parentId = parentOf(target);
    if (!parentId) continue;
    if (!known.has(parentId)) {
      error(
        issues,
        'scene-v3.parent.missing',
        `${target.id} references missing parent ${parentId}.`,
      );
      continue;
    }
    if (parentId === target.id) {
      error(
        issues,
        'scene-v3.parent.cycle',
        `${target.id} cannot parent itself.`,
      );
      continue;
    }
    parents.set(target.id, parentId);
  }

  for (const target of targets) {
    const visited = new Set<string>();
    let current: string | undefined = target.id;
    while (current) {
      if (visited.has(current)) {
        error(
          issues,
          'scene-v3.parent.cycle',
          `Parent cycle detected from ${target.id}.`,
        );
        break;
      }
      visited.add(current);
      current = parents.get(current);
    }
  }
}

export function validateSceneV3(scene: SceneV3): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (scene.schemaVersion !== SCENE_V3_SCHEMA_VERSION) {
    error(
      issues,
      'scene-v3.schema-version.unsupported',
      `Scene V3 requires schemaVersion ${SCENE_V3_SCHEMA_VERSION}.`,
    );
  }
  if (!scene.id || !isSemanticId(scene.id)) {
    error(issues, 'scene-v3.scene-id.invalid', `Invalid scene id ${scene.id || '<empty>'}.`);
  }
  if (!Number.isInteger(scene.revision) || scene.revision < 1) {
    error(issues, 'scene-v3.revision.invalid', 'Scene revision must be a positive integer.');
  }
  if (!Number.isFinite(scene.fps) || scene.fps <= 0) {
    error(issues, 'scene-v3.fps.invalid', 'Scene fps must be positive and finite.');
  }
  if (!Number.isInteger(scene.durationFrames) || scene.durationFrames < 1) {
    error(
      issues,
      'scene-v3.duration.invalid',
      'Scene durationFrames must be a positive integer.',
    );
  }
  if (!Number.isInteger(scene.width) || scene.width < 1 || !Number.isInteger(scene.height) || scene.height < 1) {
    error(
      issues,
      'scene-v3.dimensions.invalid',
      'Scene width and height must be positive integers.',
    );
  }
  if (!Number.isInteger(scene.seed)) {
    error(issues, 'scene-v3.seed.invalid', 'Scene seed must be an integer.');
  }

  validateUniqueIds(issues, 'asset', scene.assets);
  validateUniqueIds(issues, 'actor', scene.actors);
  validateUniqueIds(issues, 'prop', scene.props);
  validateUniqueIds(issues, 'environment', scene.environments);
  validateUniqueIds(issues, 'camera', scene.camera);
  validateUniqueIds(issues, 'performance', scene.performances);
  validateUniqueIds(issues, 'material', scene.materials);
  validateUniqueIds(issues, 'effect', scene.effects);
  validateUniqueIds(issues, 'simulation', scene.simulations);
  validateUniqueIds(issues, 'crowd', scene.crowds);
  validateUniqueIds(issues, 'herd', scene.herds);
  validateUniqueIds(issues, 'world-state', scene.worldStates);

  const sceneTargets = [
    ...scene.actors,
    ...scene.props,
    ...scene.environments,
    ...scene.crowds,
    ...scene.herds,
  ];
  const targetIds = new Set<string>();
  for (const target of sceneTargets) {
    if (targetIds.has(target.id)) {
      error(
        issues,
        'scene-v3.target-id.duplicate',
        `Target id ${target.id} is ambiguous across scene instance namespaces.`,
      );
    }
    targetIds.add(target.id);
  }

  const assetIds = new Set(scene.assets.map((asset) => asset.id));
  for (const asset of scene.assets) {
    if (!asset.logicalPath.trim() || /^[A-Za-z]:[\\/]/.test(asset.logicalPath) || asset.logicalPath.startsWith('/')) {
      error(
        issues,
        'scene-v3.asset.logical-path.invalid',
        `Asset ${asset.id} must use a non-absolute logical path.`,
      );
    }
    if (!SHA256_PATTERN.test(asset.sha256)) {
      error(
        issues,
        'scene-v3.asset.sha256.invalid',
        `Asset ${asset.id} requires a SHA-256 checksum.`,
      );
    }
    for (const sourceAssetId of asset.sourceAssetIds ?? []) {
      if (!assetIds.has(sourceAssetId)) {
        error(
          issues,
          'scene-v3.asset.source.missing',
          `Asset ${asset.id} references missing source asset ${sourceAssetId}.`,
        );
      }
    }
  }

  for (const actor of scene.actors) {
    validateRuntimeReference(issues, actor.id, actor.runtime);
    for (const assetId of [actor.rigAssetId, ...actor.sourceAssetIds]) {
      if (!assetIds.has(assetId)) {
        error(
          issues,
          'scene-v3.asset-reference.missing',
          `Actor ${actor.id} references missing asset ${assetId}.`,
        );
      }
    }
  }
  for (const prop of scene.props) {
    validateRuntimeReference(issues, prop.id, prop.runtime);
    if (!assetIds.has(prop.assetId)) {
      error(
        issues,
        'scene-v3.asset-reference.missing',
        `Prop ${prop.id} references missing asset ${prop.assetId}.`,
      );
    }
  }
  for (const environment of scene.environments) {
    validateRuntimeReference(issues, environment.id, environment.runtime);
  }
  for (const camera of scene.camera) {
    validateRuntimeReference(issues, camera.id, camera.runtime);
    validateFrameRange(issues, camera.id, camera, scene.durationFrames);
  }

  const actorIds = new Set(scene.actors.map((actor) => actor.id));
  for (const performance of scene.performances) {
    validateFrameRange(issues, performance.id, performance, scene.durationFrames);
    if (!actorIds.has(performance.actorId)) {
      error(
        issues,
        'scene-v3.performance.actor.missing',
        `Performance ${performance.id} references missing actor ${performance.actorId}.`,
      );
    }
  }
  for (const material of scene.materials) {
    validateRuntimeReference(issues, material.id, material.runtime);
    validateFrameRange(issues, material.id, material, scene.durationFrames);
    if (!targetIds.has(material.targetId)) {
      error(
        issues,
        'scene-v3.material.target.missing',
        `Material ${material.id} references missing target ${material.targetId}.`,
      );
    }
  }
  for (const effect of scene.effects) {
    validateRuntimeReference(issues, effect.id, effect.runtime);
    validateFrameRange(issues, effect.id, effect, scene.durationFrames);
    if (effect.targetId && !targetIds.has(effect.targetId)) {
      error(
        issues,
        'scene-v3.effect.target.missing',
        `Effect ${effect.id} references missing target ${effect.targetId}.`,
      );
    }
  }
  for (const worldState of scene.worldStates) {
    validateFrameRange(issues, worldState.id, worldState, scene.durationFrames);
  }

  for (const simulation of scene.simulations) {
    for (const assetId of [simulation.definitionAssetId, simulation.bakeAssetId]) {
      if (!assetIds.has(assetId)) {
        error(
          issues,
          'scene-v3.simulation.asset.missing',
          `Simulation ${simulation.id} references missing asset ${assetId}.`,
        );
      }
    }
    if (!Number.isFinite(simulation.timestep) || simulation.timestep <= 0) {
      error(
        issues,
        'scene-v3.simulation.timestep.invalid',
        `Simulation ${simulation.id} requires a positive fixed timestep.`,
      );
    }
    if (!Number.isInteger(simulation.frameCount) || simulation.frameCount < 1) {
      error(
        issues,
        'scene-v3.simulation.frame-count.invalid',
        `Simulation ${simulation.id} requires a positive integer frameCount.`,
      );
    }
  }

  validateParentGraph(issues, [
    ...scene.actors,
    ...scene.props,
    ...scene.environments,
  ]);

  const qaIds = new Set<string>();
  for (const invariant of scene.qa.requiredInvariants) {
    if (qaIds.has(invariant.id)) {
      error(
        issues,
        'scene-v3.qa.duplicate',
        `Duplicate QA invariant id ${invariant.id}.`,
      );
    }
    qaIds.add(invariant.id);
    if (!VALID_QA_CATEGORIES.has(String(invariant.category))) {
      error(
        issues,
        'scene-v3.qa.category.unknown',
        `Unknown QA category ${String(invariant.category)}.`,
      );
    }
  }
  for (const state of scene.qa.benchmarkStates) {
    if (!Number.isInteger(state.frame) || state.frame < 0 || state.frame >= scene.durationFrames) {
      error(
        issues,
        'scene-v3.qa.frame.invalid',
        `QA benchmark ${state.id} frame ${state.frame} is outside the scene.`,
      );
    }
  }

  if (scene.montage) {
    const segmentIds = new Set<string>();
    let previousEnd = -1;
    for (const segment of scene.montage.segments) {
      if (segmentIds.has(segment.id)) {
        error(
          issues,
          'scene-v3.montage.segment.duplicate',
          `Duplicate montage segment ${segment.id}.`,
        );
      }
      segmentIds.add(segment.id);
      validateFrameRange(issues, segment.id, segment, scene.durationFrames);
      if (segment.startFrame < previousEnd) {
        error(
          issues,
          'scene-v3.montage.overlap',
          `Montage segment ${segment.id} overlaps the previous segment.`,
        );
      }
      previousEnd = segment.endFrame;
    }
  }

  return result(issues);
}
