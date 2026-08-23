import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import {
  access,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { runProcess } from '../renderer/process-runner.mjs';

// Keep this bootstrap independent of workspace packages. ComfyUI setup must be
// usable even when node_modules is missing or being repaired.
try {
  loadEnvFile();
} catch (error) {
  if (error?.code !== 'ENOENT') {
    throw error;
  }
}

const root = resolve('.');
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
const managedModelsManifestPath = resolve(
  process.env.COMFYUI_MANAGED_MODELS_MANIFEST ??
    'tools/comfyui/managed-models.json',
);
const managedModelsStatePath = join(installRoot, 'managed-models-state.json');
const modelDownloadTimeoutMs = positiveInteger(
  process.env.COMFYUI_MODEL_DOWNLOAD_TIMEOUT_MS,
  3_600_000,
);
const modelsOnly = process.argv.includes('--models-only');
const runtimeOnly = process.argv.includes('--runtime-only');
const installModels =
  !runtimeOnly && process.env.COMFYUI_INSTALL_MODELS !== 'false';

await verifyNvidiaDriver();
await mkdir(installRoot, { recursive: true });

if (modelsOnly) {
  await assertExistingRuntime();
  await verifyCudaRuntime();
} else {
  await ensureTool(uvCommand, ['--version'], 'uv');
  await ensureTool(gitCommand, ['--version'], 'Git');
  await ensureComfyRuntime();
  await ensurePythonRuntime();
  await installPythonDependencies();
  await verifyCudaRuntime();
}

let installedModels = [];
if (installModels) {
  installedModels = await installManagedModels();
} else {
  console.log(
    runtimeOnly
      ? 'Skipping managed model installation (--runtime-only).'
      : 'Skipping managed model installation (COMFYUI_INSTALL_MODELS=false).',
  );
}

console.log('');
console.log('ComfyUI setup complete.');
console.log(`Source: ${sourceDirectory}`);
console.log(`Python: ${pythonExecutable}`);
if (installedModels.length) {
  console.log('Managed Reel Forge models:');
  for (const model of installedModels) {
    console.log(
      `  ✓ ${model.filename} · ${model.purpose} · ${formatBytes(model.sizeBytes)}`,
    );
  }
}
console.log('Next: run `pnpm start:all`.');
console.log(
  'Reel Forge will start this managed ComfyUI instance on http://127.0.0.1:8188 when one is not already running.',
);
console.log(
  'Then inspect layer-production capabilities with `node tools/scripts/inventory-comfyui-layer-host.mjs --json`.',
);

async function ensureComfyRuntime() {
  const mainScript = join(sourceDirectory, 'main.py');
  if (await fileExists(mainScript)) {
    console.log(`Using existing ComfyUI checkout at ${sourceDirectory}.`);
    console.log(
      'Setup is intentionally non-destructive; normal setup does not update an existing checkout.',
    );
    return;
  }

  if (await fileExists(sourceDirectory)) {
    throw new Error(
      `COMFYUI_DIRECTORY exists but is not a usable ComfyUI checkout: ${sourceDirectory}`,
    );
  }

  const requestedVersion =
    process.env.COMFYUI_VERSION ?? (await fetchLatestStableVersion());
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
}

async function ensurePythonRuntime() {
  if (await fileExists(pythonExecutable)) {
    console.log(`Using existing ComfyUI Python environment at ${venvDirectory}.`);
    return;
  }

  console.log('Creating isolated Python 3.13 environment...');
  await run(uvCommand, ['venv', venvDirectory, '--python', '3.13']);
}

async function installPythonDependencies() {
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
}

async function assertExistingRuntime() {
  if (!(await fileExists(join(sourceDirectory, 'main.py')))) {
    throw new Error(
      `--models-only requires an existing managed ComfyUI runtime at ${sourceDirectory}. Run \`pnpm comfyui:setup\` first.`,
    );
  }
  if (!(await fileExists(pythonExecutable))) {
    throw new Error(
      `--models-only requires the managed Python environment at ${pythonExecutable}. Run \`pnpm comfyui:setup\` first.`,
    );
  }
  console.log(`Using existing ComfyUI checkout at ${sourceDirectory}.`);
  console.log(`Using existing ComfyUI Python environment at ${venvDirectory}.`);
}

async function verifyCudaRuntime() {
  console.log('Verifying CUDA from the ComfyUI Python environment...');
  await run(pythonExecutable, [
    '-c',
    [
      'import torch',
      "assert torch.cuda.is_available(), 'PyTorch installed but CUDA is not available'",
      "print(f'PyTorch {torch.__version__}; CUDA runtime {torch.version.cuda}; GPU: {torch.cuda.get_device_name(0)}')",
    ].join('; '),
  ]);
}

async function installManagedModels() {
  const manifest = JSON.parse(
    await readFile(managedModelsManifestPath, 'utf8'),
  );
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.models)) {
    throw new Error(
      `Unsupported managed ComfyUI model manifest: ${managedModelsManifestPath}`,
    );
  }

  console.log('Provisioning curated Reel Forge ComfyUI models...');
  const installed = [];
  for (const model of manifest.models) {
    installed.push(await ensureManagedModel(model));
  }

  await writeFile(
    managedModelsStatePath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        verifiedAt: new Date().toISOString(),
        comfyDirectory: sourceDirectory,
        models: installed,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  return installed;
}

async function ensureManagedModel(model) {
  validateModelDefinition(model);
  const destination = resolve(sourceDirectory, model.relativePath);
  assertPathInside(sourceDirectory, destination, model.id);
  await mkdir(dirname(destination), { recursive: true });

  if (await fileExists(destination)) {
    const existing = await inspectModelFile(destination, model);
    if (existing.valid) {
      console.log(
        `  ✓ ${model.filename} already verified (${formatBytes(existing.sizeBytes)}).`,
      );
      return modelState(model, destination, existing.sizeBytes);
    }

    console.warn(
      `  ! ${model.filename} failed integrity verification (${existing.reason}); replacing the managed copy.`,
    );
    await rm(destination, { force: true });
  }

  const temporary = `${destination}.part`;
  await rm(temporary, { force: true });
  console.log(
    `  ↓ ${model.filename} · ${model.purpose} · ${model.source} · license ${model.license}`,
  );
  console.log(`    ${model.url}`);

  try {
    await downloadFile(model.url, temporary);
    const downloaded = await inspectModelFile(temporary, model);
    if (!downloaded.valid) {
      throw new Error(
        `${model.filename} download failed integrity verification: ${downloaded.reason}.`,
      );
    }
    await rename(temporary, destination);
    console.log(
      `  ✓ ${model.filename} verified SHA-256 ${model.sha256.slice(0, 12)}… (${formatBytes(downloaded.sizeBytes)}).`,
    );
    return modelState(model, destination, downloaded.sizeBytes);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

async function inspectModelFile(path, model) {
  const fileStat = await stat(path);
  if (model.sizeBytes && fileStat.size !== model.sizeBytes) {
    return {
      valid: false,
      sizeBytes: fileStat.size,
      reason: `size ${fileStat.size} does not match expected ${model.sizeBytes}`,
    };
  }

  const sha256 = await sha256File(path);
  if (sha256.toLowerCase() !== model.sha256.toLowerCase()) {
    return {
      valid: false,
      sizeBytes: fileStat.size,
      reason: `SHA-256 ${sha256} does not match expected ${model.sha256}`,
    };
  }
  return { valid: true, sizeBytes: fileStat.size, sha256 };
}

async function downloadFile(url, destination) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/octet-stream',
      'User-Agent': 'sumer-reel-forge-comfyui-setup',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(modelDownloadTimeoutMs),
  });
  if (!response.ok || !response.body) {
    throw new Error(
      `Model download returned HTTP ${response.status} for ${url}.`,
    );
  }

  await pipeline(
    Readable.fromWeb(response.body),
    createWriteStream(destination, { flags: 'wx' }),
  );
}

async function sha256File(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}

function validateModelDefinition(model) {
  for (const key of [
    'id',
    'purpose',
    'filename',
    'relativePath',
    'url',
    'sha256',
    'license',
    'source',
  ]) {
    if (!model?.[key] || typeof model[key] !== 'string') {
      throw new Error(
        `Managed ComfyUI model entry is missing required string field ${key}.`,
      );
    }
  }
  if (!/^[a-f0-9]{64}$/i.test(model.sha256)) {
    throw new Error(`Invalid SHA-256 for managed model ${model.id}.`);
  }
}

function modelState(model, destination, sizeBytes) {
  return {
    id: model.id,
    purpose: model.purpose,
    filename: model.filename,
    path: relative(root, destination),
    sha256: model.sha256,
    sizeBytes,
    source: model.source,
    license: model.license,
  };
}

function assertPathInside(parent, candidate, label) {
  const relativePath = relative(resolve(parent), resolve(candidate));
  if (
    relativePath === '..' ||
    relativePath.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) ||
    relativePath.includes(`..${process.platform === 'win32' ? '\\' : '/'}`)
  ) {
    throw new Error(
      `Managed model ${label} resolves outside the ComfyUI directory: ${candidate}`,
    );
  }
}

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
    cwd: root,
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

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'unknown size';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
