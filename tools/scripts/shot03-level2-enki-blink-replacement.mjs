import { runGpuManagedComfyUiScript } from '../runtime/comfyui-script-task.mjs';

try {
  process.exitCode = await runGpuManagedComfyUiScript({
    enginePath: 'tools/scripts/shot03-level2-enki-blink-replacement-engine.mjs',
    owner: 'level2-character-state',
    task: 'shot-3-enki-blink-replacement-generation',
    leaseCommands: ['generate', 'all'],
  });
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = Number.isInteger(error?.exitCode) ? error.exitCode : 1;
}
