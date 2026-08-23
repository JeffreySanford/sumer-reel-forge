import type {
  SceneV2,
  SceneV2Layer,
  SceneV2MotionPreset,
} from './scene-v2';

export type AnimationAssetState =
  | 'planned'
  | 'ready'
  | 'approved'
  | 'rejected'
  | 'superseded';

export type AnimationAssetSourceType =
  | 'derived'
  | 'regenerated'
  | 'painted-repair'
  | 'procedural'
  | 'reference-state';

export interface AnimationAssetManifestLayer {
  id: string;
  path?: string;
  role: SceneV2Layer['role'];
  material: string;
  depthDefault: number;
  anchor?: string;
  transform?: { x: number; y: number; scale: number };
  motionPresets: SceneV2MotionPreset[];
  state: AnimationAssetState;
  hasAlpha?: boolean;
  source: {
    type: AnimationAssetSourceType;
    from?: string;
  };
  sha256?: string;
  review: {
    status: 'pending' | 'approved' | 'rejected';
    notes: string[];
  };
}

export interface AnimationAssetManifestShot {
  shotId: string;
  sourceShotNumber: number;
  sourceFrame: string;
  sourceFrameSha256?: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'superseded';
  fallback: {
    assetId: string;
    assetPath: string;
  };
  overscan: {
    leftPercent: number;
    rightPercent: number;
    topPercent: number;
    bottomPercent: number;
  };
  activationPolicy: {
    requiredLayerIds: string[];
    enableDeferredPerformanceWhenApproved: boolean;
  };
  layers: AnimationAssetManifestLayer[];
}

export interface AnimationAssetManifest {
  schemaVersion: 1;
  manifestId: string;
  projectSlug: string;
  chapterNumber: number;
  reelId: string;
  episodeNumber: number;
  visualBible: string;
  assetVersion: string;
  sourceEditorialVersion: string;
  shots: AnimationAssetManifestShot[];
}

export interface AnimationAssetManifestValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SceneV2AssetResolution {
  scene: SceneV2;
  manifestId?: string;
  mode: 'scene-only' | 'fallback' | 'layered' | 'mixed';
  layeredShotIds: string[];
  fallbackShotIds: string[];
  unresolvedRequiredLayerIds: string[];
  warnings: string[];
}

export function validateAnimationAssetManifest(
  manifest: AnimationAssetManifest,
): AnimationAssetManifestValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();

  if (manifest.schemaVersion !== 1) {
    errors.push('Animation asset manifest schemaVersion must be 1.');
  }
  if (!manifest.manifestId.trim()) errors.push('manifestId is required.');
  if (!manifest.assetVersion.trim()) errors.push('assetVersion is required.');
  if (!manifest.shots.length) errors.push('Manifest requires at least one shot.');

  for (const shot of manifest.shots) {
    if (!isSafeAssetPath(shot.sourceFrame)) {
      errors.push(`Shot ${shot.shotId} sourceFrame must be relative to the asset root.`);
    }
    if (!isSafeAssetPath(shot.fallback.assetPath)) {
      errors.push(`Shot ${shot.shotId} fallback assetPath must be relative to the asset root.`);
    }
    if (!shot.activationPolicy.requiredLayerIds.length) {
      errors.push(`Shot ${shot.shotId} requires at least one activation layer.`);
    }

    const shotLayerIds = new Set(shot.layers.map((layer) => layer.id));
    for (const requiredId of shot.activationPolicy.requiredLayerIds) {
      if (!shotLayerIds.has(requiredId)) {
        errors.push(
          `Shot ${shot.shotId} activation requires missing layer ${requiredId}.`,
        );
      }
    }

    for (const layer of shot.layers) {
      if (ids.has(layer.id)) {
        errors.push(`Duplicate animation asset layer id ${layer.id}.`);
      }
      ids.add(layer.id);

      if (layer.path && !isSafeAssetPath(layer.path)) {
        errors.push(`Layer ${layer.id} path must be relative to the asset root.`);
      }
      if (layer.source.from && !isSafeAssetPath(layer.source.from)) {
        errors.push(`Layer ${layer.id} source.from must be relative to the asset root.`);
      }
      if (layer.depthDefault < 0 || layer.depthDefault > 1) {
        errors.push(`Layer ${layer.id} depthDefault must be within 0..1.`);
      }
      if (layer.state === 'approved') {
        if (!layer.path) errors.push(`Approved layer ${layer.id} requires a path.`);
        if (layer.review.status !== 'approved') {
          errors.push(`Approved layer ${layer.id} requires approved human review.`);
        }
      }
      if (layer.state === 'ready' && layer.review.status === 'approved') {
        warnings.push(
          `Layer ${layer.id} is human-approved but still marked ready; promote it to approved before activation.`,
        );
      }
      if (layer.state !== 'approved' && layer.sha256) {
        warnings.push(
          `Layer ${layer.id} has a checksum but is not approved; checksum alone does not activate it.`,
        );
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function resolveSceneV2Assets(
  scene: SceneV2,
  manifest?: AnimationAssetManifest,
): SceneV2AssetResolution {
  if (!manifest || scene.assetStrategy !== 'prefer-animation-manifest') {
    return {
      scene: cloneScene(scene),
      manifestId: manifest?.manifestId,
      mode: 'scene-only',
      layeredShotIds: [],
      fallbackShotIds: [],
      unresolvedRequiredLayerIds: [],
      warnings: [],
    };
  }

  const validation = validateAnimationAssetManifest(manifest);
  if (!validation.valid) {
    throw new Error(
      `Invalid animation asset manifest:\n- ${validation.errors.join('\n- ')}`,
    );
  }
  if (manifest.projectSlug !== scene.projectSlug) {
    throw new Error(
      `Manifest ${manifest.manifestId} projectSlug does not match Scene V2 ${scene.projectSlug}.`,
    );
  }
  if (manifest.chapterNumber !== scene.chapterNumber) {
    throw new Error(
      `Manifest ${manifest.manifestId} chapterNumber does not match Scene V2 chapter ${scene.chapterNumber}.`,
    );
  }
  if (manifest.episodeNumber !== scene.episodeNumber) {
    throw new Error(
      `Manifest ${manifest.manifestId} episodeNumber does not match Scene V2 episode ${scene.episodeNumber}.`,
    );
  }

  const resolved = cloneScene(scene);
  const layeredShotIds: string[] = [];
  const fallbackShotIds: string[] = [];
  const unresolvedRequiredLayerIds: string[] = [];
  const warnings = [...validation.warnings];

  resolved.shots = resolved.shots.map((shot) => {
    const manifestShot = manifest.shots.find((candidate) => candidate.shotId === shot.id);
    if (!manifestShot) {
      fallbackShotIds.push(shot.id);
      warnings.push(
        `Scene shot ${shot.id} has no animation-v1 manifest entry; using Scene V2 fallback layers.`,
      );
      return shot;
    }

    const layerById = new Map(manifestShot.layers.map((layer) => [layer.id, layer]));
    const missingRequired = manifestShot.activationPolicy.requiredLayerIds.filter((id) => {
      const layer = layerById.get(id);
      return !layer || layer.state !== 'approved' || !layer.path;
    });

    if (missingRequired.length) {
      fallbackShotIds.push(shot.id);
      unresolvedRequiredLayerIds.push(...missingRequired);
      warnings.push(
        `Shot ${shot.id} remains on editorial fallback; ${missingRequired.length} required animation layer(s) are not approved.`,
      );
      return shot;
    }

    const approvedLayers = manifestShot.layers
      .filter((layer) => layer.state === 'approved' && layer.path)
      .map(toSceneLayer);

    if (!approvedLayers.length) {
      fallbackShotIds.push(shot.id);
      warnings.push(
        `Shot ${shot.id} has no approved animation layers; using Scene V2 fallback layers.`,
      );
      return shot;
    }

    const editorialReference: SceneV2Layer = {
      id: `${shot.id}-editorial-reference`,
      assetId: manifestShot.fallback.assetId,
      assetPath: manifestShot.fallback.assetPath,
      role: 'environment',
      material: 'editorial-reference',
      depth: 0.5,
      anchor: 'center',
      transform: { x: 0, y: 0, scale: 1 },
      motionPresets: [],
      required: true,
    };
    const approvedIds = new Set(approvedLayers.map((layer) => layer.assetId));
    layeredShotIds.push(shot.id);
    return {
      ...shot,
      layers: [...approvedLayers, editorialReference],
      performance: shot.performance.map((item) => {
        if (
          manifestShot.activationPolicy.enableDeferredPerformanceWhenApproved &&
          item.enabled === false &&
          item.deferredUntilAssetId &&
          approvedIds.has(item.deferredUntilAssetId)
        ) {
          return { ...item, enabled: true };
        }
        return item;
      }),
    };
  });

  if (layeredShotIds.length === resolved.shots.length) {
    resolved.assetVersion = manifest.assetVersion;
  }

  const mode =
    layeredShotIds.length === 0
      ? 'fallback'
      : fallbackShotIds.length === 0
        ? 'layered'
        : 'mixed';

  return {
    scene: resolved,
    manifestId: manifest.manifestId,
    mode,
    layeredShotIds,
    fallbackShotIds,
    unresolvedRequiredLayerIds: [...new Set(unresolvedRequiredLayerIds)],
    warnings,
  };
}

export function isSafeAssetPath(path: string): boolean {
  return Boolean(path) && !path.startsWith('/') && !path.startsWith('\\') && !path.includes('..');
}

function toSceneLayer(layer: AnimationAssetManifestLayer): SceneV2Layer {
  if (!layer.path) throw new Error(`Approved layer ${layer.id} has no path.`);
  return {
    id: layer.id,
    assetId: layer.id,
    assetPath: layer.path,
    role: layer.role,
    material: layer.material,
    depth: layer.depthDefault,
    anchor: layer.anchor ?? 'center',
    transform: layer.transform ?? { x: 0, y: 0, scale: 1 },
    motionPresets: layer.motionPresets,
    required: true,
  };
}

function cloneScene(scene: SceneV2): SceneV2 {
  return structuredClone(scene);
}
