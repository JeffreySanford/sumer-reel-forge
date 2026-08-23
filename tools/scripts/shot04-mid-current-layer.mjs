import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const command = process.argv[2] ?? 'preflight';
if (!['preflight', 'generate'].includes(command)) {
  throw new Error('Use preflight or generate.');
}

const workflowPath = resolve(
  process.env.COMFYUI_SHOT04_MID_CURRENT_WORKFLOW_PATH ??
    'tools/renderer/workflows/shot04-mid-current-sam3-api.json',
);
const layerScript = resolve('tools/scripts/animation-layer-candidates.mjs');
const forwarded = process.argv.slice(3).filter((arg) => arg !== '--');

const result = spawnSync(
  process.execPath,
  [
    layerScript,
    command,
    '--shot=4',
    '--layer=shot04-mid-current-v1',
    ...forwarded,
  ],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      COMFYUI_LAYER_WORKFLOW_PATH: workflowPath,
    },
    stdio: 'inherit',
    windowsHide: true,
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
