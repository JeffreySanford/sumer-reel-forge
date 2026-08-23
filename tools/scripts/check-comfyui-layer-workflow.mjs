import 'dotenv/config';
import { resolve } from 'node:path';
import { checkWorkflowHostCompatibility } from '../renderer/comfyui-workflow-doctor.mjs';

async function main() {
  const workflowPath = process.env.COMFYUI_LAYER_WORKFLOW_PATH
    ? resolve(process.env.COMFYUI_LAYER_WORKFLOW_PATH)
    : undefined;
  const baseUrl = (
    process.env.COMFYUI_BASE_URL ?? 'http://127.0.0.1:8188'
  ).replace(/\/$/, '');

  const report = await checkWorkflowHostCompatibility({
    workflowPath,
    baseUrl,
  });

  console.log('ComfyUI animation-layer workflow doctor');
  console.log(`Workflow: ${report.workflowPath ?? 'not configured'}`);
  console.log(`ComfyUI: ${report.baseUrl}`);
  console.log(`API nodes: ${report.nodeCount}`);
  console.log(`Node types: ${report.nodeTypes.length}`);
  console.log(
    `Tokens: source=${yesNo(report.tokenCoverage.sourceImage)} prompt=${yesNo(
      report.tokenCoverage.layerPrompt,
    )} output=${yesNo(report.tokenCoverage.outputPrefix)}`,
  );

  if (report.missingNodeTypes.length) {
    console.log('');
    console.log('Missing node types on this ComfyUI host:');
    for (const nodeType of report.missingNodeTypes) {
      console.log(`  - ${nodeType}`);
    }
  }

  if (report.unavailableSelections.length) {
    console.log('');
    console.log('Configured model/resource selections unavailable on this host:');
    for (const item of report.unavailableSelections) {
      console.log(
        `  - node ${item.nodeId} ${item.nodeType}.${item.inputName}: ${item.configuredValue}`,
      );
      if (item.availableValues.length && item.availableValues.length <= 12) {
        console.log(`    available: ${item.availableValues.join(', ')}`);
      }
    }
  }

  if (report.errors.length) {
    console.log('');
    console.log('Blocking issues:');
    for (const error of report.errors) {
      console.log(`  - ${error}`);
    }
  }

  console.log('');
  if (report.ok) {
    console.log('READY: this API workflow is compatible with the connected ComfyUI host.');
    console.log('No prompt was queued and no GPU generation was started.');
  } else {
    console.log('BLOCKED: fix the issues above before generating animation-layer candidates.');
    process.exitCode = 2;
  }
}

function yesNo(value) {
  return value ? 'yes' : 'no';
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
