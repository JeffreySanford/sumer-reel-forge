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
const LANE_RUNNER = resolve('tools/scripts/run-animation-production-lane.mjs');

const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));
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
  if (!shot) {
    throw new Error(
      `Shot ${options.shotNumber} is not admitted into animation-v1. Plan and admit the shot contract first.`,
    );
  }

  const requiredIds = [...(shot.activationPolicy?.requiredLayerIds ?? [])];
  if (!requiredIds.length) {
    throw new Error(`Shot ${options.shotNumber} has no required activation layers.`);
  }
  const registry = await loadProductionLaneRegistry(options.productionLanes);
  const jobs = requiredIds.map((layerId) => {
    const layer = shot.layers?.find((item) => item.id === layerId);
    if (!layer) {
      throw new Error(`Shot ${options.shotNumber} required layer ${layerId} is undefined.`);
    }
    const lane = resolveLayerProductionLane(registry, layer);
    if (!lane) {
      throw new Error(
        `Shot ${options.shotNumber} / ${layerId} has no production lane. Candidate batch will not start.`,
      );
    }
    return {
      layer,
      lane,
      maturity: lane.state ?? 'approved',
    };
  });

  console.log(
    `Required candidate run — Shot ${options.shotNumber} / ${shot.shotId}`,
  );
  console.log(`Manifest: ${manifest.manifestId}`);
  console.log(`Required layers: ${jobs.length}`);
  for (const job of jobs) {
    console.log(
      `  · ${job.layer.id} → ${job.lane.id}${job.maturity === 'provisional' ? ' · PROVISIONAL' : ''}`,
    );
  }
  console.log('');
  console.log('Safety: candidates only; no animation-v1 promotion or manifest mutation.');
  console.log('The batch stops immediately if any lane preflight, generation, or QA fails.');
  console.log('');

  for (let index = 0; index < jobs.length; index += 1) {
    const job = jobs[index];
    console.log(
      `=== ${index + 1}/${jobs.length} · ${job.layer.id} · ${job.lane.id}${job.maturity === 'provisional' ? ' · PROVISIONAL BENCHMARK' : ''} ===`,
    );
    await runNode(LANE_RUNNER, [
      'run',
      `--shot=${options.shotNumber}`,
      `--layer=${job.layer.id}`,
      `--manifest=${manifestPath}`,
      ...(options.productionLanes
        ? [`--production-lanes=${resolve(options.productionLanes)}`]
        : []),
    ]);
    console.log('');
  }

  console.log(
    `Shot ${options.shotNumber} required candidate batch complete: ${jobs.length}/${jobs.length} lane QA runs passed.`,
  );
  const provisional = jobs.filter((job) => job.maturity === 'provisional');
  if (provisional.length) {
    console.log(
      `[review] provisional lane(s) still require assembled benchmark validation: ${provisional.map((job) => `${job.layer.id} (${job.lane.id})`).join(', ')}`,
    );
  }
  console.log('Next gate: generic layered Scene V2 candidate audition + human review.');
  console.log('No candidate was promoted automatically.');
}

function runNode(scriptPath, args) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: process.cwd(),
      env: process.env,
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
          `${scriptPath} failed with ${signal ? `signal ${signal}` : `exit code ${code ?? 'unknown'}`}. Shot candidate batch stopped before later layers.`,
        ),
      );
    });
  });
}

function parseOptions(args) {
  const result = {
    shotNumber: 0,
    manifest: undefined,
    productionLanes: undefined,
  };
  for (const arg of args) {
    if (arg.startsWith('--shot=')) {
      const value = Number(arg.slice('--shot='.length));
      if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid ${arg}`);
      result.shotNumber = value;
    } else if (arg.startsWith('--manifest=')) {
      result.manifest = arg.slice('--manifest='.length);
    } else if (arg.startsWith('--production-lanes=')) {
      result.productionLanes = arg.slice('--production-lanes='.length);
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  if (!result.shotNumber) throw new Error('--shot=<number> is required.');
  return result;
}
