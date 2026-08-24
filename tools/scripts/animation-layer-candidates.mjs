import {
  generateLayerCandidates,
  preflightLayerCandidates,
} from '../renderer/comfyui-layer-candidates.mjs';
import { checkWorkflowHostCompatibility } from '../renderer/comfyui-workflow-doctor.mjs';

const command = process.argv[2] ?? 'preflight';
const options = parseOptions(process.argv.slice(3));

async function main() {
  const preflight = await preflightLayerCandidates(options);
  const compatibility = await checkWorkflowHostCompatibility({
    workflowPath: preflight.workflowPath,
    baseUrl: preflight.baseUrl,
  });
  printPreflight(preflight, compatibility);
  const ready = preflight.ok && compatibility.ok;

  if (command === 'preflight') {
    if (!ready) process.exitCode = 2;
    return;
  }
  if (command !== 'generate') {
    throw new Error('Use preflight or generate.');
  }
  if (!ready) {
    throw new Error(
      'Layer candidate generation blocked by failed preflight or host-workflow compatibility checks.',
    );
  }

  console.log('');
  console.log(
    `Generating ${preflight.selected.length} candidate layer(s) with ComfyUI concurrency ${preflight.concurrency}...`,
  );
  const run = await generateLayerCandidates({ ...options, preflight });
  console.log('');
  console.log(`Generated ${run.candidates.length} candidate(s).`);
  console.log(`Candidate workspace: ${run.outputRoot}`);
  console.log('The animation-v1 manifest was NOT modified.');
  console.log('Every candidate remains pending human review.');
}

function parseOptions(args) {
  const options = {};
  for (const arg of args) {
    if (arg.startsWith('--shot=')) {
      const shot = Number(arg.slice('--shot='.length));
      if (!Number.isInteger(shot) || shot < 1) throw new Error(`Invalid ${arg}`);
      options.shotNumber = shot;
    } else if (arg.startsWith('--layer=')) {
      options.layerIds ??= [];
      options.layerIds.push(arg.slice('--layer='.length));
    } else if (arg === '--all-layers') {
      options.allLayers = true;
    } else if (arg.startsWith('--manifest=')) {
      options.manifestPath = arg.slice('--manifest='.length);
    } else if (arg.startsWith('--asset-root=')) {
      options.assetRoot = arg.slice('--asset-root='.length);
    } else if (arg.startsWith('--workflow=')) {
      options.workflowPath = arg.slice('--workflow='.length);
    } else if (arg.startsWith('--output=')) {
      options.outputRoot = arg.slice('--output='.length);
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }
  return options;
}

function printPreflight(preflight, compatibility) {
  console.log('Animation layer candidate preflight');
  console.log(
    `Manifest: ${preflight.manifest.manifestId} / ${preflight.selected.length} selected candidate layer(s)`,
  );
  console.log(
    `Host: ${preflight.hardwareTier ?? 'unprofiled'} / ComfyUI concurrency ${preflight.concurrency}${
      preflight.vramMode ? ` / ${preflight.vramMode}` : ''
    }`,
  );
  for (const check of preflight.checks) {
    console.log(`${check.ok ? '[ok]' : '[blocked]'} ${check.name}: ${check.detail}`);
  }

  console.log(
    `${compatibility.ok ? '[ok]' : '[blocked]'} Host workflow compatibility: ${compatibility.nodeCount} API node(s) / ${compatibility.nodeTypes.length} node type(s)`,
  );
  for (const nodeType of compatibility.missingNodeTypes) {
    console.log(`  missing node type: ${nodeType}`);
  }
  for (const item of compatibility.unavailableSelections) {
    console.log(
      `  unavailable selection: node ${item.nodeId} ${item.nodeType}.${item.inputName} = ${item.configuredValue}`,
    );
  }
  for (const error of compatibility.errors) {
    console.log(`  ${error}`);
  }

  console.log('');
  for (const { shot, layer, required } of preflight.selected) {
    console.log(
      `${required ? '*' : ' '} Shot ${shot.sourceShotNumber} / ${layer.id} / ${layer.role} / ${layer.state}`,
    );
  }
  console.log('* required for animation-v1 activation');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});