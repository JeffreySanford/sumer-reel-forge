import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  inspectAnimationAssetReadiness,
  prepareAnimationAssetWorkspace,
  type AnimationAssetReadinessReport,
} from '../animation/src/animation-asset-readiness';
import {
  validateAnimationAssetManifest,
  type AnimationAssetManifest,
} from '../animation/src/animation-asset-manifest';

const DEFAULT_MANIFEST =
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json';

async function main(): Promise<void> {
  const command = process.argv[2] ?? 'status';
  const options = parseOptions(process.argv.slice(3).filter((arg) => arg !== '--'));
  const manifestPath = resolve(options.manifest ?? DEFAULT_MANIFEST);
  const assetRoot = resolve(options.assetRoot ?? 'assets');
  const manifest = JSON.parse(
    await readFile(manifestPath, 'utf8'),
  ) as AnimationAssetManifest;
  const validation = validateAnimationAssetManifest(manifest);
  if (!validation.valid) {
    throw new Error(
      `Invalid animation asset manifest:\n- ${validation.errors.join('\n- ')}`,
    );
  }

  if (command === 'status') {
    const report = await inspectAnimationAssetReadiness(manifest, assetRoot);
    printReport(report, options.shot);
    process.exitCode = report.shots.some(
      (shot) =>
        (options.shot === undefined || shot.sourceShotNumber === options.shot) &&
        shot.layers.some((layer) => layer.readiness === 'error'),
    )
      ? 2
      : 0;
    return;
  }

  if (command === 'prepare') {
    const shotSuffix = options.shot ? `-shot-${String(options.shot).padStart(2, '0')}` : '';
    const outputPath = resolve(
      options.output ??
        `tmp/animation-assets/${manifest.manifestId}${shotSuffix}-prep-plan.json`,
    );
    const plan = await prepareAnimationAssetWorkspace(manifest, {
      assetRoot,
      outputPath,
      shotNumber: options.shot,
    });
    console.log(`Prepared ${plan.shots.length} shot workspace(s).`);
    console.log('No image assets were created and no manifest states were changed.');
    console.log(`Prep plan: ${outputPath}`);
    for (const shot of plan.shots) {
      console.log(
        `  Shot ${shot.sourceShotNumber} ${shot.shotId}: ${shot.layers.length} planned layer path(s)`,
      );
    }
    return;
  }

  throw new Error(`Unknown animation asset command "${command}". Use status or prepare.`);
}

interface CliOptions {
  manifest?: string;
  assetRoot?: string;
  output?: string;
  shot?: number;
}

function parseOptions(args: string[]): CliOptions {
  const result: CliOptions = {};
  for (const arg of args) {
    if (arg.startsWith('--manifest=')) result.manifest = arg.slice('--manifest='.length);
    else if (arg.startsWith('--asset-root=')) result.assetRoot = arg.slice('--asset-root='.length);
    else if (arg.startsWith('--output=')) result.output = arg.slice('--output='.length);
    else if (arg.startsWith('--shot=')) {
      const shot = Number(arg.slice('--shot='.length));
      if (!Number.isInteger(shot) || shot <= 0) {
        throw new Error(`Invalid --shot value: ${arg}`);
      }
      result.shot = shot;
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  return result;
}

function printReport(
  report: AnimationAssetReadinessReport,
  shotFilter?: number,
): void {
  console.log(`Animation assets: ${report.manifestId} (${report.assetVersion})`);
  console.log('Activation requires file + approved manifest state + approved human review.');
  console.log('');

  const shots = report.shots.filter(
    (shot) => shotFilter === undefined || shot.sourceShotNumber === shotFilter,
  );
  if (!shots.length) {
    throw new Error(`No manifest shot matches source shot ${shotFilter}.`);
  }

  for (const shot of shots) {
    const state = shot.activationReady ? 'LAYERED READY' : 'EDITORIAL FALLBACK';
    console.log(
      `Shot ${shot.sourceShotNumber} — ${shot.shotId} — ${state} (${shot.requiredApproved}/${shot.requiredTotal} required approved)`,
    );
    for (const layer of shot.layers) {
      const marker = layer.requiredForActivation ? '*' : ' ';
      const dimensions = layer.dimensions
        ? `${layer.dimensions.width}x${layer.dimensions.height}`
        : '-';
      console.log(
        ` ${marker} ${layer.layerId.padEnd(34)} ${labelFor(layer.readiness).padEnd(22)} ${dimensions}`,
      );
      if (layer.blockers.length && layer.requiredForActivation) {
        for (const blocker of layer.blockers) console.log(`     ↳ ${blocker}`);
      }
    }
    console.log('');
  }

  console.log('* required for layered activation');
  console.log(
    `Ready shots: ${shots.filter((shot) => shot.activationReady).length}/${shots.length}`,
  );
}

function labelFor(state: string): string {
  switch (state) {
    case 'missing':
      return 'MISSING';
    case 'present-planned':
      return 'PRESENT / PLANNED';
    case 'ready-review-pending':
      return 'READY / REVIEW';
    case 'approved':
      return 'APPROVED';
    case 'error':
      return 'ERROR';
    default:
      return state.toUpperCase();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
