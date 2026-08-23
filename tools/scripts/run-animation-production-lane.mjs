import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  loadProductionLaneRegistry,
  resolveLayerProductionLane,
} from '../creative/style-decisions.mjs';

const DEFAULT_MANIFEST = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const GENERIC_CANDIDATE_SCRIPT = resolve(
  'tools/scripts/animation-layer-candidates.mjs',
);
const SOURCE_PRESERVATION_SCRIPT = resolve(
  'tools/scripts/source-preservation-layer.mjs',
);
const SEMANTIC_QA_SCRIPT = resolve(
  'tools/scripts/verify-semantic-overlay-candidate.mjs',
);

const action = process.argv[2] ?? 'plan';
const options = parseOptions(process.argv.slice(3).filter((arg) => arg !== '--'));
if (!['plan', 'preflight', 'generate', 'verify', 'diagnose', 'run'].includes(action)) {
  throw new Error('Use plan, preflight, generate, verify, diagnose, or run.');
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const manifestPath = resolve(options.manifest ?? DEFAULT_MANIFEST);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const shot = manifest.shots?.find(
    (item) => item.sourceShotNumber === options.shotNumber,
  );
  const layer = shot?.layers?.find((item) => item.id === options.layerId);
  if (!shot || !layer) {
    throw new Error(
      `Could not resolve Shot ${options.shotNumber} / ${options.layerId}.`,
    );
  }

  const registry = await loadProductionLaneRegistry(options.productionLanes);
  const lane = resolveLayerProductionLane(registry, layer);
  if (!lane) throw new Error(`No production lane matches ${layer.id}.`);

  printPlan(manifest, shot, layer, lane);
  if (action === 'plan') return;

  if (action === 'run') {
    await execute('preflight', { manifestPath, shot, layer, lane });
    await execute('generate', { manifestPath, shot, layer, lane });
    await execute('verify', { manifestPath, shot, layer, lane });
    console.log('');
    console.log(`Lane run complete: Shot ${shot.sourceShotNumber} / ${layer.id}`);
    console.log('Candidate remains pending human review; no animation-v1 asset or manifest was modified.');
    return;
  }

  await execute(action, { manifestPath, shot, layer, lane });
}

async function execute(requestedAction, context) {
  const { manifestPath, shot, layer, lane } = context;
  const family = lane.generator?.family;
  if (family === 'source-preservation') {
    const effectiveAction = requestedAction === 'diagnose' ? 'verify' : requestedAction;
    await runNode(SOURCE_PRESERVATION_SCRIPT, [
      effectiveAction,
      `--shot=${shot.sourceShotNumber}`,
      `--layer=${layer.id}`,
      `--manifest=${manifestPath}`,
    ]);
    return;
  }

  if (family === 'sam3-semantic-overlay' || family === 'semantic-coherence-mask') {
    if (requestedAction === 'preflight' || requestedAction === 'generate') {
      const workflowPath = lane.generator?.workflowPath;
      if (!workflowPath) {
        throw new Error(`${lane.id} does not declare generator.workflowPath.`);
      }
      await runNode(
        GENERIC_CANDIDATE_SCRIPT,
        [
          requestedAction,
          `--shot=${shot.sourceShotNumber}`,
          `--layer=${layer.id}`,
          `--manifest=${manifestPath}`,
        ],
        {
          COMFYUI_LAYER_WORKFLOW_PATH: resolve(workflowPath),
        },
      );
      return;
    }
    if (requestedAction === 'verify' || requestedAction === 'diagnose') {
      await runNode(SEMANTIC_QA_SCRIPT, [
        `--shot=${shot.sourceShotNumber}`,
        `--layer=${layer.id}`,
        `--manifest=${manifestPath}`,
      ]);
      return;
    }
  }

  const executionMode = lane.generator?.executionMode ?? 'not-declared';
  throw new Error(
    `Lane ${lane.id} is planned but not generically executable (${family ?? 'unknown'} / ${executionMode}). ` +
      'Keep this lane human-designed or add a reusable executor before automating it.',
  );
}

function printPlan(manifest, shot, layer, lane) {
  console.log(`Production lane — Shot ${shot.sourceShotNumber} / ${layer.id}`);
  console.log(`Manifest: ${manifest.manifestId}`);
  console.log(`Layer: ${layer.role} / ${layer.material} / alpha=${Boolean(layer.hasAlpha)} / ${layer.state}`);
  console.log(`[ok] lane: ${lane.id}`);
  console.log(`[ok] generator: ${lane.generator?.family ?? 'none'}`);
  console.log(`[ok] QA: ${lane.qa?.family ?? 'none'}`);
  if (lane.generator?.workflowPath) {
    console.log(`[ok] workflow: ${resolve(lane.generator.workflowPath)}`);
  }
  if (lane.generator?.executionMode) {
    console.log(`[note] execution mode: ${lane.generator.executionMode}`);
  }
  for (const note of lane.notes ?? []) console.log(`  · ${note}`);
  console.log('');
}

async function runNode(scriptPath, args, envOverrides = {}) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: process.cwd(),
      env: { ...process.env, ...envOverrides },
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', rejectPromise);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(
        new Error(
          `${scriptPath} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}.`,
        ),
      );
    });
  });
}

function parseOptions(args) {
  const result = {
    shotNumber: undefined,
    layerId: undefined,
    manifest: undefined,
    productionLanes: undefined,
  };
  for (const arg of args) {
    if (arg.startsWith('--shot=')) {
      const value = Number(arg.slice('--shot='.length));
      if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid ${arg}`);
      result.shotNumber = value;
    } else if (arg.startsWith('--layer=')) {
      result.layerId = arg.slice('--layer='.length);
    } else if (arg.startsWith('--manifest=')) {
      result.manifest = arg.slice('--manifest='.length);
    } else if (arg.startsWith('--production-lanes=')) {
      result.productionLanes = arg.slice('--production-lanes='.length);
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  if (!result.shotNumber || !result.layerId) {
    throw new Error('--shot=<number> and --layer=<id> are required.');
  }
  return result;
}
