import { runGpuManagedComfyUiScript } from '../runtime/comfyui-script-task.mjs';

try {
  process.exitCode = await runGpuManagedComfyUiScript({
    enginePath: 'tools/scripts/repair-background-from-overlay-engine.mjs',
    owner: 'animation-background-repair',
    task: ({ args }) => {
      const shot = optionValue(args, '--shot=') ?? 'unknown';
      const layer = optionValue(args, '--background-layer=') ?? 'background';
      return `shot-${shot}-${layer}-background-repair`;
    },
    leaseCommands: ['generate'],
  });
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = Number.isInteger(error?.exitCode) ? error.exitCode : 1;
}

function optionValue(args, prefix) {
  const value = args.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : undefined;
}
