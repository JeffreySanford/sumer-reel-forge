import {
  canonicalize,
  normalizeLogicalPath,
  sha256Canonical,
  type CanonicalValue,
} from '@sumer-reel-forge/animation-compiler';
import type {
  AssetKind,
  RuntimeReference,
  SceneV3,
  TrackValue,
  TransformDefinition,
  Vec3,
} from '@sumer-reel-forge/animation-contracts';
import {
  validateSceneV2,
  type SceneV2,
  type SceneV2Layer,
  type SceneV2Shot,
} from '@sumer-reel-forge/scene-v2';

export const SCENE_V2_COMPATIBILITY_VERSION =
  'scene-v2-compatibility:v1' as const;

export interface SceneV2CompatibilityAssetBinding {
  readonly sha256: string;
  readonly revision: string;
  readonly kind?: AssetKind;
}

export interface SceneV2CompatibilityOptions {
  readonly sceneRevision: number;
  readonly sceneSeed: number;
  readonly manuscriptRevision: string;
  readonly layeredV2RuntimeVersion: string;
  readonly historicalSourceIds?: readonly string[];
  readonly visualEvidenceIds?: readonly string[];
  readonly narrativeThreadIds?: readonly string[];
  resolveAsset(
    layer: SceneV2Layer,
    shot: SceneV2Shot,
    scene: SceneV2,
  ): SceneV2CompatibilityAssetBinding | undefined;
}

export interface SceneV2CompatibilityTiming {
  readonly shotId: string;
  readonly sourceShotNumber: number;
  readonly sourceStartFrame?: number;
  readonly startFrame: number;
  readonly durationFrames: number;
  readonly endFrame: number;
}

export interface SceneV2CompatibilityEnvelope {
  readonly compatibilityVersion: typeof SCENE_V2_COMPATIBILITY_VERSION;
  readonly sourceSchemaVersion: 2;
  readonly sourceSceneId: string;
  readonly sourceSceneHash: string;
  readonly sourceSnapshot: CanonicalValue;
  readonly timings: readonly SceneV2CompatibilityTiming[];
  readonly warnings: readonly string[];
}

export interface SceneV2CompatibilityResult {
  readonly scene: SceneV3;
  readonly compatibility: SceneV2CompatibilityEnvelope;
}

function idSegment(value: string): string {
  const segment = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[^a-z0-9]+/, '')
    .replace(/[^a-z0-9]+$/, '');
  if (!segment) throw new TypeError(`Cannot derive semantic id segment from ${value}.`);
  return segment;
}

function constantVec3(x: number, y: number, z: number): TrackValue<Vec3> {
  return { type: 'constant', value: { x, y, z } };
}

function layerTransform(layer: SceneV2Layer): TransformDefinition {
  return {
    position: constantVec3(layer.transform.x, layer.transform.y, layer.depth),
    rotation: constantVec3(0, 0, 0),
    scale: constantVec3(layer.transform.scale, layer.transform.scale, 1),
  };
}

function cameraExpression(
  expressionId: string,
  parameters: Readonly<Record<string, unknown>>,
): TrackValue<Vec3> {
  return { type: 'expression', expressionId, parameters };
}

function cameraTransform(shot: SceneV2Shot): TransformDefinition {
  const camera = shot.camera;
  const shared = {
    preset: camera.preset,
    easing: camera.easing,
    settleFromProgress: camera.settleFromProgress,
    sourceStartFrame: shot.startFrame,
    sourceDurationFrames: shot.durationFrames,
  };
  return {
    position: cameraExpression('compat:v2:camera-position', {
      ...shared,
      xFrom: camera.xFrom,
      xTo: camera.xTo,
      yFrom: camera.yFrom,
      yTo: camera.yTo,
      zFrom: 0,
      zTo: 0,
    }),
    rotation: cameraExpression('compat:v2:camera-rotation', {
      ...shared,
      rotationFrom: camera.rotationFrom,
      rotationTo: camera.rotationTo,
    }),
    scale: cameraExpression('compat:v2:camera-scale', {
      ...shared,
      scaleFrom: camera.scaleFrom,
      scaleTo: camera.scaleTo,
    }),
  };
}

function markerFrame(progress: number, durationFrames: number): number {
  if (progress <= 0) return 0;
  if (progress >= 1) return durationFrames - 1;
  return Math.min(
    durationFrames - 1,
    Math.max(0, Math.round(progress * (durationFrames - 1))),
  );
}

function runtimeReference(
  shot: SceneV2Shot,
  sourceSceneHash: string,
  runtimeVersion: string,
): RuntimeReference {
  const hash = sourceSceneHash.replace(/^sha256:/, '');
  return {
    id: `runtime:layered-v2:${idSegment(shot.id)}`,
    runtime: 'layered-v2',
    runtimeVersion,
    definitionId: `compat:v2-scene:${hash}`,
  };
}

function assetId(layer: SceneV2Layer): string {
  return `asset:v2:${idSegment(layer.assetId)}`;
}

function propId(shot: SceneV2Shot, layer: SceneV2Layer): string {
  return `prop:v2:${idSegment(shot.id)}:${idSegment(layer.id)}`;
}

export function adaptSceneV2ToV3(
  source: SceneV2,
  options: SceneV2CompatibilityOptions,
): SceneV2CompatibilityResult {
  const validation = validateSceneV2(source);
  if (!validation.valid) {
    throw new Error(`Invalid Scene V2 compatibility input:\n- ${validation.errors.join('\n- ')}`);
  }
  if (!Number.isInteger(options.sceneRevision) || options.sceneRevision < 1) {
    throw new TypeError('sceneRevision must be a positive integer.');
  }
  if (!Number.isInteger(options.sceneSeed)) {
    throw new TypeError('sceneSeed must be an integer.');
  }
  if (!options.manuscriptRevision.trim()) {
    throw new TypeError('manuscriptRevision is required.');
  }
  if (!options.layeredV2RuntimeVersion.trim()) {
    throw new TypeError('layeredV2RuntimeVersion is required.');
  }

  const sourceSnapshot = canonicalize(source);
  const sourceSceneHash = sha256Canonical(sourceSnapshot);
  const assets = new Map<
    string,
    SceneV3['assets'][number] & { readonly sourceV2AssetId: string }
  >();
  const props: SceneV3['props'][number][] = [];
  const cameras: SceneV3['camera'][number][] = [];
  const worldStates: SceneV3['worldStates'][number][] = [];

  for (const shot of source.shots) {
    const runtime = runtimeReference(
      shot,
      sourceSceneHash,
      options.layeredV2RuntimeVersion,
    );
    cameras.push({
      id: `camera:v2:${idSegment(shot.id)}`,
      runtime,
      startFrame: shot.startFrame,
      endFrame: shot.startFrame + shot.durationFrames,
      transform: cameraTransform(shot),
      projection: 'orthographic',
    });

    for (const layer of shot.layers) {
      const binding = options.resolveAsset(layer, shot, source);
      if (!binding) {
        throw new Error(
          `Scene V2 layer ${shot.id}/${layer.id} has no immutable compatibility asset binding.`,
        );
      }
      const mappedAssetId = assetId(layer);
      const mappedPath = normalizeLogicalPath(layer.assetPath);
      const nextAsset = {
        id: mappedAssetId,
        kind: binding.kind ?? ('image' as const),
        logicalPath: mappedPath,
        sha256: binding.sha256,
        revision: binding.revision,
        sourceV2AssetId: layer.assetId,
      };
      const existing = assets.get(mappedAssetId);
      if (existing) {
        if (
          existing.sourceV2AssetId !== layer.assetId ||
          existing.logicalPath !== nextAsset.logicalPath ||
          existing.sha256 !== nextAsset.sha256 ||
          existing.revision !== nextAsset.revision ||
          existing.kind !== nextAsset.kind
        ) {
          throw new Error(
            `Scene V2 asset ${layer.assetId} resolves inconsistently across compatibility layers.`,
          );
        }
      } else {
        assets.set(mappedAssetId, nextAsset);
      }

      const mappedPropId = propId(shot, layer);
      props.push({
        id: mappedPropId,
        definitionId: `compat:v2-layer:${idSegment(layer.role)}:${idSegment(layer.material)}`,
        runtime,
        assetId: mappedAssetId,
        transform: layerTransform(layer),
      });
      worldStates.push({
        id: `world-state:v2:${idSegment(shot.id)}:${idSegment(layer.id)}`,
        targetId: mappedPropId,
        stateDefinitionId: 'compat:v2:shot-activation',
        startFrame: shot.startFrame,
        endFrame: shot.startFrame + shot.durationFrames,
        parameters: {
          active: { type: 'constant', value: true },
          sourceShotNumber: {
            type: 'constant',
            value: shot.sourceShotNumber,
          },
        },
      });
    }
  }

  const sceneAssets: SceneV3['assets'][number][] = [...assets.values()].map(
    (asset) => ({
      id: asset.id,
      kind: asset.kind,
      logicalPath: asset.logicalPath,
      sha256: asset.sha256,
      revision: asset.revision,
      ...(asset.sourceAssetIds
        ? { sourceAssetIds: [...asset.sourceAssetIds] }
        : {}),
    }),
  );

  const scene: SceneV3 = {
    schemaVersion: '3',
    id: `scene:v2-compat:${idSegment(source.sceneId)}`,
    revision: options.sceneRevision,
    title: `Scene V2 compatibility — ${source.sceneId}`,
    story: {
      projectId: `project:${idSegment(source.projectSlug)}`,
      chapterId: `chapter:${source.chapterNumber}`,
      reelId: `reel:${idSegment(source.reelId)}`,
      ...(source.shots.length === 1
        ? { shotId: `shot:${source.shots[0].sourceShotNumber}` }
        : {}),
      manuscriptRevision: options.manuscriptRevision,
      ...(options.narrativeThreadIds
        ? { narrativeThreadIds: [...options.narrativeThreadIds] }
        : {}),
    },
    historicalSourceIds: [...(options.historicalSourceIds ?? [])],
    visualEvidenceIds: [...(options.visualEvidenceIds ?? [])],
    assets: sceneAssets,
    fps: source.fps,
    durationFrames: source.durationFrames,
    width: source.width,
    height: source.height,
    seed: options.sceneSeed,
    camera: cameras,
    actors: [],
    props,
    environments: [],
    performances: [],
    materials: [],
    effects: [],
    simulations: [],
    crowds: [],
    herds: [],
    worldStates,
    qa: {
      requiredInvariants: [
        {
          id: 'qa:v2:timing-preserved',
          category: 'motion',
          description: 'Scene/shot frame timing must remain identical to Scene V2.',
          blocking: true,
        },
        {
          id: 'qa:v2:source-policy-preserved',
          category: 'identity',
          description: 'Scene V2 source policy remains immutable and story mutation stays forbidden.',
          blocking: true,
        },
        {
          id: 'qa:v2:human-review-preserved',
          category: 'human-review',
          description: 'Scene V2 human approval requirement remains in force.',
          blocking: true,
        },
      ],
      benchmarkStates: source.reviewMarkers.map((marker) => ({
        id: `v2:${marker.id}`,
        frame: markerFrame(marker.progress, source.durationFrames),
        description: `Scene V2 review marker ${marker.id} at progress ${marker.progress}.`,
      })),
      semanticActionIds: [],
      renderProofIds: [],
      humanReviewRequired: source.reviewPolicy.humanApprovalRequired,
    },
  };

  return {
    scene,
    compatibility: {
      compatibilityVersion: SCENE_V2_COMPATIBILITY_VERSION,
      sourceSchemaVersion: 2,
      sourceSceneId: source.sceneId,
      sourceSceneHash,
      sourceSnapshot,
      timings: source.shots.map((shot) => ({
        shotId: shot.id,
        sourceShotNumber: shot.sourceShotNumber,
        ...(shot.sourceStartFrame === undefined
          ? {}
          : { sourceStartFrame: shot.sourceStartFrame }),
        startFrame: shot.startFrame,
        durationFrames: shot.durationFrames,
        endFrame: shot.startFrame + shot.durationFrames,
      })),
      warnings: [...validation.warnings],
    },
  };
}
