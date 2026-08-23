import 'dotenv/config';
import { access, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { runProcess } from '../renderer/process-runner.mjs';

const installRoot = resolve(
  process.env.COMFYUI_INSTALL_ROOT ?? '.cache/comfyui',
);
const sourceDirectory = resolve(
  process.env.COMFYUI_DIRECTORY ?? join(installRoot, 'ComfyUI'),
);
const venvDirectory = resolve(
  process.env.COMFYUI_VENV_DIRECTORY ?? join(installRoot, '.venv'),
);
const pythonExecutable =
  process.env.COMFYUI_PYTHON_COMMAND ?? defaultPythonExecutable(venvDirectory);
const repository =
  process.env.COMFYUI_REPOSITORY ?? 'https://github.com/Comfy-Org/ComfyUI.git';
const torchIndexUrl =
  process.env.COMFYUI_TORCH_INDEX_URL ??
  'https://download.pytorch.org/whl/cu130';
const uvCommand = process.env.COMFYUI_UV_COMMAND ?? 'uv';
const gitCommand = process.env.COMFYUI_GIT_COMMAND ?? 'git';

await verifyNvidiaDriver();
await ensureTool(uvCommand, ['--version'], 'uv');
await ensureTool(gitCommand, ['--version'], 'Git');
await mkdir(installRoot, { recursive: true });

const requestedVersion =
  process.env.COMFYUI_VERSION ?? (await fetchLatestStableVersion());

if (!(await fileExists(join(sourceDirectory, 'main.py')))) {
  if (await fileExists(sourceDirectory)) {
    throw new Error(
      `COMFYUI_DIRECTORY exists but is not a usable ComfyUI checkout: ${sourceDirectory}`,
    );
  }

  console.log(`Installing ComfyUI ${requestedVersion}...`);
  await run(gitCommand, [
    'clone',
    '--depth',
    '1',
    '--branch',
    requestedVersion,
    repository,
    sourceDirectory,
  ]);
} else {
  console.log(`Using existing ComfyUI checkout at ${sourceDirectory}.`);
  console.log(
    'Setup is intentionally non-destructive; normal setup does not update an existing checkout.',
  );
}

if (!(await fileExists(pythonExecutable))) {
  console.log('Creating isolated Python 3.13 environment...');
  await run(uvCommand, ['venv', venvDirectory, '--python', '3.13']);
} else {
  console.log(`Using existing ComfyUI Python environment at ${venvDirectory}.`);
}

console.log('Installing NVIDIA-enabled PyTorch...');
await run(uvCommand, [
  'pip',
  'install',
  '--python',
  pythonExecutable,
  'torch',
  'torchvision',
  'torchaudio',
  '--extra-index-url',
  torchIndexUrl,
]);

console.log('Installing ComfyUI dependencies...');
await run(uvCommand, [
  'pip',
  'install',
  '--python',
  pythonExecutable,
  '-r',
  join(sourceDirectory, 'requirements.txt'),
]);

console.log('Verifying CUDA from the ComfyUI Python environment...');
await run(pythonExecutable, [
  '-c',
  [
    'import torch',
    "assert torch.cuda.is_available(), 'PyTorch installed but CUDA is not available'",
    "print(f'PyTorch {torch.__version__}; CUDA runtime {torch.version.cuda}; GPU: {torch.cuda.get_device_name(0)}')",
  ].join('; '),
]);

console.log('');
console.log('ComfyUI setup complete.');
console.log(`Source: ${sourceDirectory}`);
console.log(`Python: ${pythonExecutable}`);
console.log('Next: run `pnpm start:all`.');
console.log(
  'Reel Forge will start this managed ComfyUI instance on http://127.0.0.1:8188 when one is not already running.',
);
console.log(
  'Then inspect layer-production capabilities with `node tools/scripts/inventory-comfyui-layer-host.mjs --json`.',
);

async function verifyNvidiaDriver() {
  console.log('Checking NVIDIA driver...');
  try {
    await run(
      process.env.NVIDIA_SMI_COMMAND ?? 'nvidia-smi',
      [
        '--query-gpu=name,memory.total,driver_version',
        '--format=csv,noheader',
      ],
      30_000,
    );
  } catch (error) {
    throw new Error(
      `NVIDIA GPU/driver check failed. Reel Forge's managed ComfyUI setup currently targets NVIDIA CUDA hosts. ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function fetchLatestStableVersion() {
  console.log('Resolving latest stable ComfyUI release...');
  const response = await fetch(
    'https://api.github.com/repos/Comfy-Org/ComfyUI/releases/latest',
    {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'sumer-reel-forge-comfyui-setup',
      },
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Could not resolve the latest stable ComfyUI release (HTTP ${response.status}). Set COMFYUI_VERSION to a stable release tag and retry.`,
    );
  }

  const payload = await response.json();
  if (!payload?.tag_name || typeof payload.tag_name !== 'string') {
    throw new Error(
      'GitHub did not return a stable ComfyUI release tag. Set COMFYUI_VERSION explicitly and retry.',
    );
  }

  return payload.tag_name;
}

async function ensureTool(command, args, label) {
  try {
    await run(command, args, 30_000);
  } catch {
    throw new Error(
      `${label} is required for ComfyUI setup but was not found. Install ${label} and retry.`,
    );
  }
}

async function run(command, args, timeoutMs = 1_800_000) {
  await runProcess(command, args, {
    cwd: process.cwd(),
    timeoutMs,
    onStdout: (message) => process.stdout.write(message),
    onStderr: (message) => process.stderr.write(message),
  });
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function defaultPythonExecutable(directory) {
  const executable =
    process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python';
  return resolve(directory, executable);
}
