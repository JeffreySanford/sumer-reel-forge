import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

const MANIFEST_PATH =
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json';
const PRODUCTION_LANES_PATH = 'tools/animation/production-lanes-v1.json';
const STYLE_DECISIONS_PATH = 'tools/creative/style-decisions-v1.json';

interface AnimationManifestLayer {
  id: string;
  path?: string;
  role: string;
  material: string;
  state?: string;
  hasAlpha?: boolean;
  motionPresets?: string[];
  sha256?: string;
  review?: {
    status?: string;
    notes?: string[];
  };
}

interface AnimationManifestShot {
  shotId: string;
  sourceShotNumber: number;
  sourceFrame: string;
  status?: string;
  fallback?: {
    assetId?: string;
    assetPath?: string;
  };
  activationPolicy?: {
    requiredLayerIds?: string[];
    enableDeferredPerformanceWhenApproved?: boolean;
  };
  layers?: AnimationManifestLayer[];
}

interface AnimationManifest {
  schemaVersion: number;
  manifestId: string;
  projectSlug: string;
  chapterNumber: number;
  episodeNumber: number;
  assetVersion: string;
  sourceEditorialVersion?: string;
  shots?: AnimationManifestShot[];
}

interface ProductionLane {
  id: string;
  match?: Record<string, unknown>;
  generator?: {
    family?: string;
    workflowPath?: string;
    executor?: string;
    executionMode?: string;
  };
  qa?: {
    family?: string;
    humanReviewRequired?: boolean;
    alphaCoverage?: {
      minimum?: number;
      preferredMinimum?: number;
      maximum?: number;
    };
  };
  notes?: string[];
}

interface ProductionLaneRegistry {
  schemaVersion: number;
  registryId: string;
  lanes?: ProductionLane[];
}

interface StyleDecision {
  id: string;
  state: 'approved' | 'provisional' | string;
  scope?: Record<string, unknown> & { type?: string };
  path: string;
  value: unknown;
  rationale?: string;
}

interface StyleDecisionLibrary {
  schemaVersion: number;
  libraryId: string;
  principle?: string;
  decisions?: StyleDecision[];
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
  schemaVersion: 1;
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

@Injectable()
export class AnimationProductionStatusService {
  async getStatus(): Promise<AnimationProductionStatus> {
    const root = resolve(process.cwd());
    const assetRoot = resolve(root, 'assets');
    const manifestPath = resolve(root, MANIFEST_PATH);
    const manifest = await readJson<AnimationManifest>(manifestPath);
    const laneRegistry = await readJson<ProductionLaneRegistry>(
      resolve(root, PRODUCTION_LANES_PATH),
    );
    const styleLibrary = await readJson<StyleDecisionLibrary>(
      resolve(root, STYLE_DECISIONS_PATH),
    );

    const shots = await Promise.all(
      (manifest.shots ?? []).map((shot) =>
        this.resolveShot({
          root,
          assetRoot,
          manifest,
          laneRegistry,
          styleLibrary,
          shot,
        }),
      ),
    );

    const requiredLayers = shots.flatMap((shot) =>
      shot.layers.filter((layer) => layer.required),
    );

    return {
      schemaVersion: 1,
      observedAt: new Date().toISOString(),
      principle:
        styleLibrary.principle ?? 'AI proposes. Rules constrain. Human directs.',
      manifestId: manifest.manifestId,
      manifestPath: MANIFEST_PATH,
      projectSlug: manifest.projectSlug,
      chapterNumber: manifest.chapterNumber,
      episodeNumber: manifest.episodeNumber,
      assetVersion: manifest.assetVersion,
      sourceEditorialVersion: manifest.sourceEditorialVersion ?? null,
      laneRegistryId: laneRegistry.registryId,
      styleDecisionLibraryId: styleLibrary.libraryId,
      summary: {
        shotCount: shots.length,
        layeredReadyCount: shots.filter(
          (shot) => shot.activationState === 'layered-ready',
        ).length,
        approvedRequiredLayerCount: requiredLayers.filter((layer) => layer.ready)
          .length,
        requiredLayerCount: requiredLayers.length,
      },
      shots,
    };
  }

  private async resolveShot({
    root,
    assetRoot,
    manifest,
    laneRegistry,
    styleLibrary,
    shot,
  }: {
    root: string;
    assetRoot: string;
    manifest: AnimationManifest;
    laneRegistry: ProductionLaneRegistry;
    styleLibrary: StyleDecisionLibrary;
    shot: AnimationManifestShot;
  }): Promise<AnimationProductionShotStatus> {
    const requiredIds = new Set(shot.activationPolicy?.requiredLayerIds ?? []);
    const sourcePath = resolve(assetRoot, shot.sourceFrame);
    assertInside(assetRoot, sourcePath, `Shot ${shot.sourceShotNumber} source`);
    const sourceDimensions = await readPngDimensionsOptional(sourcePath);
    const shotContext = {
      projectSlug: manifest.projectSlug,
      chapterNumber: manifest.chapterNumber,
      episodeNumber: manifest.episodeNumber,
      shotId: shot.shotId,
    };

    const layers = await Promise.all(
      (shot.layers ?? []).map(async (layer) => {
        const required = requiredIds.has(layer.id);
        const targetPath = layer.path ? resolve(assetRoot, layer.path) : null;
        if (targetPath) {
          assertInside(assetRoot, targetPath, `${layer.id} production asset`);
        }
        const bytes = targetPath ? await readFileOptional(targetPath) : null;
        const dimensions = bytes ? readPngDimensions(bytes, layer.id) : null;
        const fileExists = Boolean(bytes);
        const actualChecksum = bytes ? sha256(bytes) : null;
        const expectedChecksum = normalizeSha256(layer.sha256);
        const checksumMatches = Boolean(
          expectedChecksum && actualChecksum && expectedChecksum === actualChecksum,
        );
        const dimensionsMatchSource = Boolean(
          dimensions &&
            sourceDimensions &&
            dimensions.width === sourceDimensions.width &&
            dimensions.height === sourceDimensions.height,
        );
        const reviewStatus = layer.review?.status ?? 'pending';
        const state = layer.state ?? 'planned';
        const ready =
          fileExists &&
          state === 'approved' &&
          reviewStatus === 'approved' &&
          checksumMatches &&
          dimensionsMatchSource;
        const lane = resolveLane(laneRegistry.lanes ?? [], layer);
        const reviewNotes = layer.review?.notes ?? [];
        const coverageAdvisory = reviewNotes.some((note) =>
          note.includes('SPARSE_REVIEW_REQUIRED'),
        )
          ? 'SPARSE_REVIEW_REQUIRED'
          : null;
        const qaEvidenceRecorded = reviewNotes.some((note) => note.includes('QA PASS'));
        const layerDecisions = resolveDecisions(styleLibrary.decisions ?? [], {
          ...shotContext,
          layerId: layer.id,
          role: layer.role,
          material: layer.material,
          character: layer.role === 'character' ? characterFromLayerId(layer.id) : null,
        }, new Set(['project', 'reel', 'role', 'material', 'material-role', 'layer', 'character']));

        return {
          id: layer.id,
          path: layer.path ?? null,
          role: layer.role,
          material: layer.material,
          required,
          hasAlpha: Boolean(layer.hasAlpha),
          motionPresets: layer.motionPresets ?? [],
          state,
          reviewStatus,
          reviewNotes,
          qaEvidenceRecorded,
          coverageAdvisory,
          fileExists,
          dimensions,
          sourceDimensions,
          dimensionsMatchSource,
          sha256: layer.sha256 ?? null,
          checksumMatches,
          ready,
          lane: lane
            ? {
                id: lane.id,
                generatorFamily: lane.generator?.family ?? null,
                qaFamily: lane.qa?.family ?? null,
                notes: lane.notes ?? [],
              }
            : null,
          decisions: layerDecisions,
        } satisfies AnimationProductionLayerStatus;
      }),
    );

    const requiredLayers = layers.filter((layer) => layer.required);
    const readyRequiredLayerCount = requiredLayers.filter((layer) => layer.ready).length;
    const layeredReady =
      requiredLayers.length > 0 && readyRequiredLayerCount === requiredLayers.length;

    return {
      shotId: shot.shotId,
      sourceShotNumber: shot.sourceShotNumber,
      status: shot.status ?? 'draft',
      sourceFrame: shot.sourceFrame,
      activationState: layeredReady ? 'layered-ready' : 'editorial-fallback',
      requiredLayerCount: requiredLayers.length,
      readyRequiredLayerCount,
      optionalLayerCount: layers.length - requiredLayers.length,
      deferredPerformanceEnabled: Boolean(
        shot.activationPolicy?.enableDeferredPerformanceWhenApproved,
      ),
      fallbackAssetPath: shot.fallback?.assetPath ?? null,
      sourceDimensions,
      layers,
      decisions: resolveDecisions(
        styleLibrary.decisions ?? [],
        shotContext,
        new Set(['project', 'reel', 'shot']),
      ),
    };
  }
}

function resolveLane(
  lanes: ProductionLane[],
  layer: AnimationManifestLayer,
): ProductionLane | null {
  const context: Record<string, unknown> = {
    role: layer.role,
    material: layer.material,
    hasAlpha: Boolean(layer.hasAlpha),
  };
  return (
    lanes.find((lane) =>
      Object.entries(lane.match ?? {}).every(([key, value]) => context[key] === value),
    ) ?? null
  );
}

function resolveDecisions(
  decisions: StyleDecision[],
  context: Record<string, unknown>,
  allowedScopeTypes: Set<string>,
): AnimationProductionDecisionStatus[] {
  return decisions
    .filter((decision) => {
      const scope = decision.scope ?? {};
      const scopeType = typeof scope.type === 'string' ? scope.type : '';
      if (!allowedScopeTypes.has(scopeType)) return false;
      return Object.entries(scope)
        .filter(([key]) => key !== 'type')
        .every(([key, value]) => context[key] === value);
    })
    .map((decision) => ({
      id: decision.id,
      state: decision.state,
      scopeType:
        typeof decision.scope?.type === 'string' ? decision.scope.type : null,
      path: decision.path,
      value: decision.value,
      rationale: decision.rationale ?? null,
    }));
}

function characterFromLayerId(layerId: string): string | null {
  const match = layerId.match(/(?:shot\d+-)?([a-z]+)-(?:body|character|face|eyes)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

async function readFileOptional(path: string): Promise<Buffer | null> {
  try {
    await access(path);
    return await readFile(path);
  } catch {
    return null;
  }
}

async function readPngDimensionsOptional(
  path: string,
): Promise<{ width: number; height: number } | null> {
  const bytes = await readFileOptional(path);
  return bytes ? readPngDimensions(bytes, path) : null;
}

function readPngDimensions(
  buffer: Buffer,
  label: string,
): { width: number; height: number } | null {
  if (
    buffer.length < 24 ||
    buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
    buffer.subarray(12, 16).toString('ascii') !== 'IHDR'
  ) {
    return null;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function normalizeSha256(value?: string): string | null {
  if (!value) return null;
  const normalized = value.startsWith('sha256:') ? value.slice('sha256:'.length) : value;
  return /^[0-9a-f]{64}$/i.test(normalized) ? normalized.toLowerCase() : null;
}

function sha256(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function assertInside(parent: string, child: string, label: string): void {
  const path = relative(resolve(parent), resolve(child));
  if (path.startsWith('..') || isAbsolute(path)) {
    throw new Error(`${label} must remain under ${parent}: ${child}`);
  }
}
