import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type {
  AnimationAssetManifest,
  AnimationAssetManifestLayer,
  AnimationAssetManifestShot,
} from './animation-asset-manifest';

export type AnimationLayerReadinessState =
  | 'missing'
  | 'present-planned'
  | 'ready-review-pending'
  | 'approved'
  | 'error';

export interface PngDimensions {
  width: number;
  height: number;
}

export interface AnimationLayerReadiness {
  shotId: string;
  sourceShotNumber: number;
  layerId: string;
  requiredForActivation: boolean;
  manifestState: AnimationAssetManifestLayer['state'];
  reviewStatus: AnimationAssetManifestLayer['review']['status'];
  path?: string;
  exists: boolean;
  dimensions?: PngDimensions;
  expectedDimensions?: PngDimensions;
  dimensionsMatch?: boolean;
  readiness: AnimationLayerReadinessState;
  blockers: string[];
}

export interface AnimationShotReadiness {
  shotId: string;
  sourceShotNumber: number;
  activationReady: boolean;
  requiredApproved: number;
  requiredTotal: number;
  layers: AnimationLayerReadiness[];
  blockers: string[];
}

export interface AnimationAssetReadinessReport {
  manifestId: string;
  assetVersion: string;
  inspectedAt: string;
  shots: AnimationShotReadiness[];
  activationReadyShots: number;
  totalShots: number;
}

export interface AnimationAssetPreparationPlan {
  schemaVersion: 1;
  manifestId: string;
  assetVersion: string;
  generatedAt: string;
  assetRoot: string;
  shots: Array<{
    shotId: string;
    sourceShotNumber: number;
    sourceFrame: string;
    sourceDimensions?: PngDimensions;
    activationRequiredLayerIds: string[];
    layers: Array<{
      id: string;
      path?: string;
      role: string;
      material: string;
      requiredForActivation: boolean;
      state: string;
      reviewStatus: string;
      expectedDimensions?: PngDimensions;
      instructions: string[];
    }>;
  }>;
}

export async function inspectAnimationAssetReadiness(
  manifest: AnimationAssetManifest,
  assetRoot = resolve('assets'),
): Promise<AnimationAssetReadinessReport> {
  const shots: AnimationShotReadiness[] = [];

  for (const shot of manifest.shots) {
    shots.push(await inspectShot(shot, assetRoot));
  }

  return {
    manifestId: manifest.manifestId,
    assetVersion: manifest.assetVersion,
    inspectedAt: new Date().toISOString(),
    shots,
    activationReadyShots: shots.filter((shot) => shot.activationReady).length,
    totalShots: shots.length,
  };
}

export async function prepareAnimationAssetWorkspace(
  manifest: AnimationAssetManifest,
  options: {
    assetRoot?: string;
    outputPath: string;
    shotNumber?: number;
  },
): Promise<AnimationAssetPreparationPlan> {
  const assetRoot = resolve(options.assetRoot ?? 'assets');
  const selectedShots = manifest.shots.filter(
    (shot) => options.shotNumber === undefined || shot.sourceShotNumber === options.shotNumber,
  );

  if (!selectedShots.length) {
    throw new Error(
      `No manifest shot matches source shot ${options.shotNumber ?? '(all)'}.`,
    );
  }

  const plan: AnimationAssetPreparationPlan = {
    schemaVersion: 1,
    manifestId: manifest.manifestId,
    assetVersion: manifest.assetVersion,
    generatedAt: new Date().toISOString(),
    assetRoot,
    shots: [],
  };

  for (const shot of selectedShots) {
    const sourceDimensions = await readPngDimensionsIfPresent(
      resolve(assetRoot, shot.sourceFrame),
    );
    const required = new Set(shot.activationPolicy.requiredLayerIds);
    const layers: AnimationAssetPreparationPlan['shots'][number]['layers'] = [];

    for (const layer of shot.layers) {
      if (layer.path) {
        await mkdir(dirname(resolve(assetRoot, layer.path)), { recursive: true });
      }
      layers.push({
        id: layer.id,
        path: layer.path,
        role: layer.role,
        material: layer.material,
        requiredForActivation: required.has(layer.id),
        state: layer.state,
        reviewStatus: layer.review.status,
        expectedDimensions: sourceDimensions,
        instructions: layerInstructions(layer, sourceDimensions),
      });
    }

    plan.shots.push({
      shotId: shot.shotId,
      sourceShotNumber: shot.sourceShotNumber,
      sourceFrame: shot.sourceFrame,
      sourceDimensions,
      activationRequiredLayerIds: shot.activationPolicy.requiredLayerIds,
      layers,
    });
  }

  const outputPath = resolve(options.outputPath);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
  return plan;
}

export async function readPngDimensions(path: string): Promise<PngDimensions> {
  const buffer = await readFile(path);
  if (buffer.length < 24) throw new Error(`PNG ${path} is too small to contain an IHDR header.`);
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    throw new Error(`Asset ${path} is not a PNG file.`);
  }
  const chunkType = buffer.subarray(12, 16).toString('ascii');
  if (chunkType !== 'IHDR') {
    throw new Error(`PNG ${path} does not contain IHDR as its first chunk.`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function inspectShot(
  shot: AnimationAssetManifestShot,
  assetRoot: string,
): Promise<AnimationShotReadiness> {
  const expectedDimensions = await readPngDimensionsIfPresent(
    resolve(assetRoot, shot.sourceFrame),
  );
  const required = new Set(shot.activationPolicy.requiredLayerIds);
  const layers: AnimationLayerReadiness[] = [];

  for (const layer of shot.layers) {
    layers.push(
      await inspectLayer(
        shot,
        layer,
        required.has(layer.id),
        expectedDimensions,
        assetRoot,
      ),
    );
  }

  const requiredLayers = layers.filter((layer) => layer.requiredForActivation);
  const blockers = requiredLayers.flatMap((layer) =>
    layer.blockers.map((blocker) => `${layer.layerId}: ${blocker}`),
  );

  return {
    shotId: shot.shotId,
    sourceShotNumber: shot.sourceShotNumber,
    activationReady:
      requiredLayers.length > 0 &&
      requiredLayers.every((layer) => layer.readiness === 'approved'),
    requiredApproved: requiredLayers.filter((layer) => layer.readiness === 'approved').length,
    requiredTotal: requiredLayers.length,
    layers,
    blockers,
  };
}

async function inspectLayer(
  shot: AnimationAssetManifestShot,
  layer: AnimationAssetManifestLayer,
  requiredForActivation: boolean,
  expectedDimensions: PngDimensions | undefined,
  assetRoot: string,
): Promise<AnimationLayerReadiness> {
  const blockers: string[] = [];
  const absolutePath = layer.path ? resolve(assetRoot, layer.path) : undefined;
  const exists = absolutePath ? await fileExists(absolutePath) : false;
  let dimensions: PngDimensions | undefined;
  let dimensionError: string | undefined;

  if (exists && absolutePath) {
    try {
      dimensions = await readPngDimensions(absolutePath);
    } catch (error) {
      dimensionError = error instanceof Error ? error.message : String(error);
    }
  }

  const dimensionsMatch =
    dimensions && expectedDimensions
      ? dimensions.width === expectedDimensions.width &&
        dimensions.height === expectedDimensions.height
      : undefined;

  if (!exists) blockers.push('asset file is missing');
  if (dimensionError) blockers.push(dimensionError);
  if (dimensionsMatch === false) {
    blockers.push(
      `dimensions ${dimensions?.width}x${dimensions?.height} do not match source ${expectedDimensions?.width}x${expectedDimensions?.height}`,
    );
  }
  if (layer.state !== 'approved') blockers.push(`manifest state is ${layer.state}`);
  if (layer.review.status !== 'approved') {
    blockers.push(`human review is ${layer.review.status}`);
  }

  let readiness: AnimationLayerReadinessState;
  if (
    layer.state === 'approved' &&
    (!exists || Boolean(dimensionError) || dimensionsMatch === false || layer.review.status !== 'approved')
  ) {
    readiness = 'error';
  } else if (!exists) {
    readiness = 'missing';
  } else if (layer.state === 'approved' && layer.review.status === 'approved') {
    readiness = dimensionsMatch === false ? 'error' : 'approved';
  } else if (layer.state === 'ready') {
    readiness = 'ready-review-pending';
  } else {
    readiness = 'present-planned';
  }

  return {
    shotId: shot.shotId,
    sourceShotNumber: shot.sourceShotNumber,
    layerId: layer.id,
    requiredForActivation,
    manifestState: layer.state,
    reviewStatus: layer.review.status,
    path: layer.path,
    exists,
    dimensions,
    expectedDimensions,
    dimensionsMatch,
    readiness,
    blockers,
  };
}

function layerInstructions(
  layer: AnimationAssetManifestLayer,
  expectedDimensions?: PngDimensions,
): string[] {
  const instructions = [
    'Do not overwrite the approved editorial-v1 source.',
    'Keep this layer registration-aligned to the source frame.',
  ];
  if (expectedDimensions) {
    instructions.push(
      `Export full-canvas PNG at exactly ${expectedDimensions.width}x${expectedDimensions.height}.`,
    );
  } else {
    instructions.push('Export full-canvas PNG at exactly the source editorial dimensions.');
  }
  if (layer.hasAlpha) {
    instructions.push('Preserve transparent background and inspect edges for halos at 200%.');
  }
  if (layer.role === 'foreground-occluder') {
    instructions.push('Verify motion never obscures protected face or caption regions.');
  }
  if (layer.role === 'character' || layer.role === 'character-state') {
    instructions.push('Require identity, lighting, silhouette, and material continuity review.');
  }
  if (layer.role === 'mask') {
    instructions.push('Mask must describe environmental coherence, not introduce a hard character cutout.');
  }
  return instructions;
}

async function readPngDimensionsIfPresent(
  path: string,
): Promise<PngDimensions | undefined> {
  if (!(await fileExists(path))) return undefined;
  return readPngDimensions(path);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
