import 'dotenv/config';
import { resolve } from 'node:path';
import { runProcess } from '../renderer/process-runner.mjs';

const venvDirectory = resolve(
  process.env.CHATTERBOX_VENV_DIRECTORY ?? '.cache/chatterbox/.venv',
);
const pythonExecutable =
  process.env.CHATTERBOX_COMMAND ?? defaultPythonExecutable(venvDirectory);
const modelDirectory = resolve(
  process.env.CHATTERBOX_MODEL_DIRECTORY ?? '.cache/chatterbox/model',
);
const modelRevision =
  process.env.CHATTERBOX_MODEL_REVISION ??
  '5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18';
const uvCommand = process.env.CHATTERBOX_UV_COMMAND ?? 'uv';

await run(uvCommand, [
  'venv',
  venvDirectory,
  '--python',
  '3.11',
]);
await run(uvCommand, [
  'pip',
  'install',
  '--python',
  pythonExecutable,
  '--index-url',
  'https://pypi.org/simple',
  '--extra-index-url',
  'https://download.pytorch.org/whl/cu124',
  'chatterbox-tts==0.1.7',
  'setuptools==80.9.0',
  'soundfile==0.13.1',
  'torch==2.6.0+cu124',
  'torchaudio==2.6.0+cu124',
]);
await run(pythonExecutable, [
  resolve('tools/chatterbox/download_model.py'),
  '--output-directory',
  modelDirectory,
  '--revision',
  modelRevision,
]);
await run(pythonExecutable, [
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

function defaultPythonExecutable(directory) {
  const executable =
    process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python';
  return resolve(directory, executable);
}
