import 'dotenv/config';
import { resolve } from 'node:path';
import { runProcess } from '../renderer/process-runner.mjs';

const projectDirectory = resolve('tools/chatterbox');
const modelDirectory = resolve(
  process.env.CHATTERBOX_MODEL_DIRECTORY ?? '.cache/chatterbox/model',
);
const modelRevision =
  process.env.CHATTERBOX_MODEL_REVISION ??
  '5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18';
const uvCommand = process.env.CHATTERBOX_COMMAND ?? 'uv';

await run(uvCommand, [
  'sync',
  '--project',
  projectDirectory,
  '--locked',
  '--python',
  '3.11',
  '--link-mode',
  'copy',
]);
await run(uvCommand, [
  'run',
  '--project',
  projectDirectory,
  '--locked',
  'python',
  resolve('tools/chatterbox/download_model.py'),
  '--output-directory',
  modelDirectory,
  '--revision',
  modelRevision,
]);
await run(uvCommand, [
  'run',
  '--project',
  projectDirectory,
  '--locked',
  'python',
  '-c',
  "import torch; print(f'PyTorch {torch.__version__}; CUDA available: {torch.cuda.is_available()}')",
]);

console.log(`Chatterbox is ready at ${modelDirectory}.`);

async function run(command, args) {
  await runProcess(command, args, {
    cwd: process.cwd(),
    timeoutMs: 1800000,
    onStdout: (message) => process.stdout.write(message),
    onStderr: (message) => process.stderr.write(message),
  });
}
