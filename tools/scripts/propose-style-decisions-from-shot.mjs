import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import {
  loadProductionLaneRegistry,
  loadStyleDecisionLibrary,
  resolveLayerProductionLane,
} from '../creative/style-decisions.mjs';

const DEFAULT_MANIFEST = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const SCENE_ROOT = resolve('tools/animation/scenes');
const OUTPUT_ROOT = resolve('tmp/style-decision-proposals');

const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const manifestPath = resolve(options.manifest ?? DEFAULT_MANIFEST);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const shot = manifest.shots?.find((item) => item.sourceShotNumber === options.shotNumber);
  if (!shot) throw new Error(`No manifest shot matches source shot ${options.shotNumber}.`);
  if (shot.status !== 'approved') {
    throw new Error(
      `Shot ${shot.shotId} is ${shot.status}; reusable decision proposals require an approved benchmark.`,
    );
  }

  const requiredIds = new Set(shot.activationPolicy?.requiredLayerIds ?? []);
  const requiredLayers = (shot.layers ?? []).filter((layer) => requiredIds.has(layer.id));
  for (const layer of requiredLayers) {
    if (layer.state !== 'approved' || layer.review?.status !== 'approved' || !layer.sha256) {
      throw new Error(
        `${layer.id} is not fully approved with checksum provenance; refusing to infer reusable rules.`,
      );
    }
  }

  const library = await loadStyleDecisionLibrary(options.styleDecisions);
  const laneRegistry = await loadProductionLaneRegistry(options.productionLanes);
  const benchmark = await findBenchmarkScene(shot);
  const proposals = [];

  if (benchmark?.shot?.camera) {
    const scaleFrom = benchmark.shot.camera.scaleFrom;
    const scaleTo = benchmark.shot.camera.scaleTo;
    if (Number.isFinite(scaleFrom) && Number.isFinite(scaleTo)) {
      proposals.push({
        kind: 'observed-benchmark-rule',
        path: 'camera.observedScaleDelta',
        value: Number(Math.abs(scaleTo - scaleFrom).toFixed(6)),
        suggestedScope: { type: 'shot', shotId: shot.shotId },
        rationale:
          'Observed camera scale delta from the approved Scene V2 benchmark. Generalize to a broader shot type only after another successful example.',
        source: { shotId: shot.shotId, sceneId: benchmark.scene.sceneId },
      });
    }
    if (benchmark.shot.stillnessAnchor) {
      proposals.push({
        kind: 'observed-benchmark-rule',
        path: 'composition.stillnessAnchor',
        value: benchmark.shot.stillnessAnchor,
        suggestedScope: { type: 'shot', shotId: shot.shotId },
        rationale: 'Preserve the approved benchmark stillness anchor unless a later human decision supersedes it.',
        source: { shotId: shot.shotId, sceneId: benchmark.scene.sceneId },
      });
    }
  }

  for (const layer of requiredLayers) {
    const lane = resolveLayerProductionLane(laneRegistry, layer);
    if (lane) {
      proposals.push({
        kind: 'production-lane-rule',
        path: 'production.lane',
        value: lane.id,
        suggestedScope: {
          type: 'material-role',
          material: layer.material,
          role: layer.role,
          hasAlpha: layer.hasAlpha ?? false,
        },
        rationale:
          'This production lane successfully produced an approved required benchmark layer. Reuse when role/material/alpha semantics match.',
        source: { shotId: shot.shotId, layerId: layer.id, sha256: layer.sha256 },
      });
    }

    if (Array.isArray(layer.motionPresets) && layer.motionPresets.length) {
      proposals.push({
        kind: 'material-motion-rule',
        path: 'motion.presets',
        value: layer.motionPresets,
        suggestedScope: { type: 'material', material: layer.material },
        rationale:
          'Approved benchmark motion preset association. Human review should decide whether this is material-wide or shot-specific.',
        source: { shotId: shot.shotId, layerId: layer.id, sha256: layer.sha256 },
      });
    }
  }

  const annotated = proposals.map((proposal) => ({
    ...proposal,
    alreadyCaptured: findEquivalentDecision(library, proposal) ?? null,
    approvalRequired: true,
  }));
  const uncaptured = annotated.filter((proposal) => !proposal.alreadyCaptured);

  const outputPath = resolve(
    options.output ??
      join(OUTPUT_ROOT, `shot-${String(options.shotNumber).padStart(2, '0')}-style-decision-proposals.json`),
  );
  await mkdir(dirname(outputPath), { recursive: true });
  const result = {
    schemaVersion: 1,
    type: 'style-decision-proposals',
    generatedAt: new Date().toISOString(),
    sourceManifestPath: manifestPath,
    styleDecisionLibraryId: library.libraryId,
    benchmark: {
      shotId: shot.shotId,
      sourceShotNumber: shot.sourceShotNumber,
      sceneId: benchmark?.scene?.sceneId ?? null,
      scenePath: benchmark?.path ?? null,
    },
    policy: {
      libraryMutated: false,
      automaticApprovalAllowed: false,
      humanReviewRequired: true,
      broaderScopeGeneralizationRequiresHumanJudgment: true,
    },
    proposals: annotated,
    uncapturedProposalCount: uncaptured.length,
  };
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  console.log(`Style decision proposals — Shot ${shot.sourceShotNumber} / ${shot.shotId}`);
  console.log(`[ok] approved required layers: ${requiredLayers.length}/${requiredLayers.length}`);
  console.log(`[ok] generated proposals: ${annotated.length}`);
  console.log(`[ok] already represented in library: ${annotated.length - uncaptured.length}`);
  console.log(`[review] uncaptured proposals: ${uncaptured.length}`);
  for (const proposal of uncaptured) {
    console.log(`  - ${proposal.path} = ${JSON.stringify(proposal.value)} (${formatScope(proposal.suggestedScope)})`);
  }
  console.log(`Proposal file: ${outputPath}`);
  console.log('The approved style library was NOT modified.');
}

function findEquivalentDecision(library, proposal) {
  const candidates = (library.decisions ?? []).filter(
    (decision) => decision.state === 'approved' && decision.path === proposal.path,
  );
  const exact = candidates.find(
    (decision) => JSON.stringify(decision.value) === JSON.stringify(proposal.value),
  );
  return exact?.id;
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
        (item) => item.id === shot.shotId || item.sourceShotNumber === shot.sourceShotNumber,
      );
      if (sceneShot) return { path, scene, shot: sceneShot };
    } catch {
      // Scene validation belongs to the scene validator; ignore unrelated files here.
    }
  }
  return undefined;
}

function formatScope(scope) {
  return Object.entries(scope)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(', ');
}

function parseOptions(args) {
  const result = {
    shotNumber: undefined,
    manifest: undefined,
    styleDecisions: undefined,
    productionLanes: undefined,
    output: undefined,
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
    else throw new Error(`Unknown option ${arg}`);
  }
  if (!result.shotNumber) throw new Error('A positive --shot=<number> is required.');
  return result;
}
