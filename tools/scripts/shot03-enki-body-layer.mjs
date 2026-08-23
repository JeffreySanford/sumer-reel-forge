import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const command = process.argv[2] ?? 'preflight';
if (!['preflight', 'generate'].includes(command)) {
  throw new Error('Use preflight or generate.');
}

const workflowPath = resolve(
  process.env.COMFYUI_SHOT03_ENKI_BODY_WORKFLOW_PATH ??
    'tools/renderer/workflows/shot03-enki-body-sam3-api.json',
);
const layerScript = resolve('tools/scripts/animation-layer-candidates.mjs');

const result = spawnSync(
  process.execPath,
  [
    layerScript,
    command,
    '--shot=3',
    '--layer=shot03-enki-body-v1',
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

if (result.error) {
  throw result.error;
}
process.exitCode = result.status ?? 1;
