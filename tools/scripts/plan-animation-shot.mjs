import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import {
  buildDecisionContext,
  loadProductionLaneRegistry,
  loadStyleDecisionLibrary,
  resolveLayerProductionLane,
  resolveStyleDecisions,
  serializeResolvedDecisions,
} from '../creative/style-decisions.mjs';

const DEFAULT_MANIFEST = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const DEFAULT_OUTPUT_ROOT = resolve('tmp/animation-plans');
const SCENE_ROOT = resolve('tools/animation/scenes');
const SHOT_CONTRACT_ROOT = resolve('tools/animation/shot-contracts');

const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const manifestPath = resolve(options.manifest ?? DEFAULT_MANIFEST);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const resolvedShot = await resolveShotForPlanning(manifest, options.shotNumber);
  const shot = resolvedShot.shot;

  const library = await loadStyleDecisionLibrary(options.styleDecisions);
  const laneRegistry = await loadProductionLaneRegistry(options.productionLanes);
  const benchmark = await findBenchmarkScene(shot);
  const required = new Set(shot.activationPolicy?.requiredLayerIds ?? []);
  const requiredLayers = (shot.layers ?? []).filter((layer) => required.has(layer.id));
  if (!requiredLayers.length) throw new Error(`Shot ${shot.shotId} has no required activation layers.`);

  const planningManifest = {
    ...manifest,
    shots:
      resolvedShot.source === 'manifest'
        ? manifest.shots
        : [...(manifest.shots ?? []), shot],
  };
  const shotContext = buildDecisionContext({
    manifest: planningManifest,
    shot,
    layer: undefined,
  });
  const shotDecisions = resolveStyleDecisions(library, shotContext, {
    includeProvisional: options.includeProvisional,
  });

  const layerPlans = requiredLayers.map((layer) => {
    const context = buildDecisionContext({ manifest: planningManifest, shot, layer });
    const decisions = resolveStyleDecisions(library, context, {
      includeProvisional: options.includeProvisional,
    });
    const lane = resolveLayerProductionLane(laneRegistry, layer);
    return {
      layerId: layer.id,
      role: layer.role,
      material: layer.material,
      hasAlpha: layer.hasAlpha ?? false,
      intendedPath: layer.path ?? null,
      manifestState: layer.state,
      reviewStatus: layer.review?.status ?? 'pending',
      motionPresets: layer.motionPresets ?? [],
      productionLane: lane
        ? {
            id: lane.id,
            state: lane.state ?? 'approved',
            generator: lane.generator,
            qa: lane.qa,
            notes: lane.notes ?? [],
          }
        : {
            id: 'UNRESOLVED',
            state: 'unresolved',
            generator: null,
            qa: null,
            notes: ['No production-lane recipe matches this layer yet. Human pipeline design is required.'],
          },
      inheritedDecisions: serializeResolvedDecisions(decisions),
    };
  });

  const unresolved = layerPlans.filter((layer) => layer.productionLane.id === 'UNRESOLVED');
  const provisional = layerPlans.filter(
    (layer) => layer.productionLane.state === 'provisional',
  );
  const plan = {
    schemaVersion: 1,
    type: 'animation-shot-production-plan',
    generatedAt: new Date().toISOString(),
    manifestId: manifest.manifestId,
    manifestPath,
    shotContractSource: resolvedShot.source,
    shotContractPath: resolvedShot.contractPath ?? null,
    styleDecisionLibraryId: library.libraryId,
    productionLaneRegistryId: laneRegistry.registryId,
    inheritanceMode: options.includeProvisional ? 'approved-plus-provisional' : 'approved-only',
    shot: {
      shotId: shot.shotId,
      sourceShotNumber: shot.sourceShotNumber,
      sourceFrame: shot.sourceFrame,
      status: shot.status,
      requiredLayerIds: [...required],
      enableDeferredPerformanceWhenApproved:
        shot.activationPolicy?.enableDeferredPerformanceWhenApproved ?? false,
    },
    benchmark: benchmark
      ? {
          scenePath: benchmark.path,
          sceneId: benchmark.scene.sceneId,
          durationFrames: benchmark.scene.durationFrames,
          width: benchmark.scene.width,
          height: benchmark.scene.height,
          fps: benchmark.scene.fps,
          reviewMarkers: benchmark.scene.reviewMarkers ?? [],
          camera: benchmark.scene.shots?.[0]?.camera ?? null,
          stillnessAnchor: benchmark.scene.shots?.[0]?.stillnessAnchor ?? null,
          emotionalPurpose: benchmark.scene.shots?.[0]?.emotionalPurpose ?? null,
        }
      : null,
    inheritedShotDecisions: serializeResolvedDecisions(shotDecisions),
    layers: layerPlans,
    deterministicGates: [
      'editorial-v1 source remains immutable',
      'candidate generation never mutates animation-v1',
      'candidate dimensions remain registered to editorial source dimensions',
      'lane-specific deterministic QA must pass',
      'human review remains required',
      'promotion requires explicit human action and checksum provenance',
      'production Scene V2 render verifies layered resolver activation after promotion',
    ],
    readiness: {
      requiredLayers: layerPlans.length,
      resolvedProductionLanes: layerPlans.length - unresolved.length,
      unresolvedLayerIds: unresolved.map((layer) => layer.layerId),
      provisionalLaneIds: provisional.map((layer) => layer.productionLane.id),
      provisionalLayerIds: provisional.map((layer) => layer.layerId),
      deterministicPlanReady: unresolved.length === 0,
      benchmarkValidationRequired: provisional.length > 0,
    },
  };

  const outputPath = resolve(
    options.output ??
      join(
        DEFAULT_OUTPUT_ROOT,
        `shot-${String(options.shotNumber).padStart(2, '0')}-production-plan.json`,
      ),
  );
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');

  printPlan(plan, outputPath);
  if (unresolved.length) process.exitCode = 2;
}

function printPlan(plan, outputPath) {
  console.log(
    `Animation production plan — Shot ${plan.shot.sourceShotNumber} / ${plan.shot.shotId}`,
  );
  console.log(`Inheritance: ${plan.inheritanceMode}`);
  if (plan.shotContractSource === 'draft-contract') {
    console.log(`[note] draft shot contract: ${plan.shotContractPath}`);
    console.log('[ok] canonical animation-v1 manifest remains unchanged by planning');
  }
  if (plan.benchmark) {
    console.log(`[ok] benchmark scene: ${plan.benchmark.sceneId}`);
    console.log(`[ok] stillness anchor: ${plan.benchmark.stillnessAnchor ?? 'none'}`);
  } else {
    console.log('[note] no dedicated Scene V2 benchmark found; manifest-only planning');
  }
  console.log(`[ok] inherited shot decisions: ${plan.inheritedShotDecisions.length}`);
  console.log('');
  for (const layer of plan.layers) {
    const ok = layer.productionLane.id !== 'UNRESOLVED';
    const maturity =
      layer.productionLane.state === 'provisional' ? ' · PROVISIONAL' : '';
    console.log(`${ok ? '[ok]' : '[blocked]'} ${layer.layerId}`);
    console.log(`     ${layer.role} / ${layer.material} / alpha=${layer.hasAlpha}`);
    console.log(`     lane: ${layer.productionLane.id}${maturity}`);
    if (layer.productionLane.generator) {
      console.log(`     generator: ${layer.productionLane.generator.family}`);
      console.log(`     QA: ${layer.productionLane.qa.family}`);
    }
    console.log(`     inherited decisions: ${layer.inheritedDecisions.length}`);
  }
  console.log('');
  console.log(
    `Plan readiness: ${plan.readiness.resolvedProductionLanes}/${plan.readiness.requiredLayers} required lanes resolved`,
  );
  if (plan.readiness.unresolvedLayerIds.length) {
    console.log(
      `[review] genuinely new production problems: ${plan.readiness.unresolvedLayerIds.join(', ')}`,
    );
  }
  if (plan.readiness.provisionalLayerIds.length) {
    console.log(
      `[review] newly designed provisional lanes require benchmark validation: ${plan.readiness.provisionalLayerIds.join(', ')}`,
    );
  }
  console.log(`Plan: ${outputPath}`);
  console.log('No source asset, candidate, animation-v1 asset, or manifest was modified.');
}

async function resolveShotForPlanning(manifest, shotNumber) {
  const manifestShot = manifest.shots?.find(
    (item) => item.sourceShotNumber === shotNumber,
  );
  if (manifestShot) {
    return { shot: manifestShot, source: 'manifest', contractPath: null };
  }

  const contractPath = join(
    SHOT_CONTRACT_ROOT,
    `reel-01-shot-${String(shotNumber).padStart(2, '0')}.json`,
  );
  if (!(await exists(contractPath))) {
    throw new Error(
      `No animation manifest shot or draft shot contract matches source shot ${shotNumber}.`,
    );
  }
  const contract = JSON.parse(await readFile(contractPath, 'utf8'));
  const shot = contract.shot;
  if (!shot || shot.sourceShotNumber !== shotNumber) {
    throw new Error(`Draft shot contract ${contractPath} does not define Shot ${shotNumber}.`);
  }
  if (
    contract.projectSlug !== manifest.projectSlug ||
    contract.chapterNumber !== manifest.chapterNumber ||
    contract.episodeNumber !== manifest.episodeNumber
  ) {
    throw new Error(
      `Draft shot contract ${contractPath} does not match manifest project/chapter/episode identity.`,
    );
  }
  return { shot, source: 'draft-contract', contractPath };
}

async function findBenchmarkScene(shot) {
  let entries;
  try {
    entries = await readdir(SCENE_ROOT, { withFileTypes: true });
  } catch {
    return undefined;
  }
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.scene-v2.json')) continue;
    const path = join(SCENE_ROOT, entry.name);
    try {
      const scene = JSON.parse(await readFile(path, 'utf8'));
      const sceneShot = scene.shots?.find(
        (item) =>
          item.id === shot.shotId || item.sourceShotNumber === shot.sourceShotNumber,
      );
      if (sceneShot) return { path, scene };
    } catch {
      // Ignore malformed/unrelated scene files here; their own validators own those failures.
    }
  }
  return undefined;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function parseOptions(args) {
  const result = {
    shotNumber: undefined,
    manifest: undefined,
    styleDecisions: undefined,
    productionLanes: undefined,
    output: undefined,
    includeProvisional: true,
  };
  for (const arg of args) {
    if (arg.startsWith('--shot=')) {
      const value = Number(arg.slice('--shot='.length));
      if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid ${arg}`);
      result.shotNumber = value;
    } else if (arg.startsWith('--manifest=')) result.manifest = arg.slice('--manifest='.length);
    else if (arg.startsWith('--style-decisions=')) result.styleDecisions = arg.slice('--style-decisions='.length);
    else if (arg.startsWith('--production-lanes=')) result.productionLanes = arg.slice('--production-lanes='.length);
    else if (arg.startsWith('--output=')) result.output = arg.slice('--output='.length);
    else if (arg === '--approved-only') result.includeProvisional = false;
    else throw new Error(`Unknown option ${arg}`);
  }
  if (!result.shotNumber) throw new Error('A positive --shot=<number> is required.');
  return result;
}
