import { runGpuManagedComfyUiScript } from '../runtime/comfyui-script-task.mjs';

try {
  process.exitCode = await runGpuManagedComfyUiScript({
    enginePath: 'tools/scripts/shot03-background-layer-engine.mjs',
    owner: 'shot03-background-layer',
    task: 'shot-3-background-repair',
    leaseCommands: ['generate'],
  });
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = Number.isInteger(error?.exitCode) ? error.exitCode : 1;
}
