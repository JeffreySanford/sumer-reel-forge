import { spawn, spawnSync } from 'node:child_process';
import { existsSync, statSync, utimesSync } from 'node:fs';
import net from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyHardwareProfileEnvironment,
  collectAndPersistHardwareProfile,
  formatHardwareProfile,
} from '../runtime/hardware-profile.mjs';
import {
  acquireStartupInstanceLock,
  releaseStartupInstanceLock,
} from '../runtime/startup-instance-lock.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const root = dirname(dirname(dirname(scriptPath)));

loadLocalEnvFile();

// Local-first defaults for the normal `pnpm start:all` entrypoint.
// Explicit shell or .env values remain authoritative.
process.env.PLANNING_PROVIDER ??= 'ollama';
process.env.OLLAMA_VISION_MODEL ??= 'qwen3-vl:4b-instruct';
process.env.OLLAMA_TEXT_MODEL ??= 'qwen3:8b';
process.env.OLLAMA_BASE_URL ??= 'http://localhost:11434';
process.env.PLANNING_TIMEOUT_MS ??= '120000';
process.env.OLLAMA_KEEP_ALIVE ??= '10m';

const coreScript = join(root, 'tools', 'scripts', 'start-all.mjs');
const rendererScript = join(root, 'tools', 'scripts', 'renderer-worker.mjs');
const animationWorkerScript = join(root, 'tools', 'scripts', 'animation-worker.mjs');
const rendererAdapter = process.env.RENDER_ADAPTER ?? 'editorial';
const rendererWorkerId = process.env.RENDER_WORKER_ID ?? 'local-renderer';
const animationWorkerId = process.env.ANIMATION_WORKER_ID ?? 'local-animation-worker';
const comfyBaseUrl = new URL(
  process.env.COMFYUI_BASE_URL ?? 'http://127.0.0.1:8188',
);
const comfyManaged = process.env.COMFYUI_MANAGED !== 'false';
const comfyDirectory = resolve(
  process.env.COMFYUI_DIRECTORY ?? '.cache/comfyui/ComfyUI',
);
const comfyVenvDirectory = resolve(
  process.env.COMFYUI_VENV_DIRECTORY ?? '.cache/comfyui/.venv',
);
const comfyPython =
  process.env.COMFYUI_PYTHON_COMMAND ??
  resolve(
    comfyVenvDirectory,
    process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
  );

let stopping = false;
let startupLock;
let coreProcess;
let rendererProcess;
let animationWorkerProcess;
let comfyProcess;

function loadLocalEnvFile() {
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) return;
  if (typeof process.loadEnvFile !== 'function') {
    throw new Error(
      'Native .env loading requires Node 20.12 or newer. This workspace targets Node 22.',
    );
  }

  const inheritedEnvironment = { ...process.env };
  process.loadEnvFile(envPath);
  Object.assign(process.env, inheritedEnvironment);
}

function spawnNode(script, envOverrides = {}) {
  return spawn(process.execPath, [script], {
    cwd: root,
    env: {
      ...process.env,
      ...envOverrides,
    },
    stdio: 'inherit',
    windowsHide: true,
  });
}

function runPnpm(args) {
  return spawnSync('pnpm', args, {
    cwd: root,
    shell: process.platform === 'win32',
    stdio: 'inherit',
    windowsHide: true,
  });
}

async function prepareHardwareProfile() {
  console.log('Profiling local hardware...');
  try {
    const { profile, outputPath } = await collectAndPersistHardwareProfile({
      root,
      env: process.env,
    });
    applyHardwareProfileEnvironment(profile, process.env, outputPath);
    console.log(formatHardwareProfile(profile, outputPath));
    console.log('');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `Hardware profiling failed (${message}). Continuing with existing runtime defaults.`,
    );
  }
}

function reconcileWorkspaceInstall() {
  const nodeModules = join(root, 'node_modules');
  const modulesManifest = join(nodeModules, '.modules.yaml');
  const packageJson = join(root, 'package.json');
  const lockfile = join(root, 'pnpm-lock.yaml');
  const timestampToleranceMs = 2_000;

  const installMissing =
    !existsSync(nodeModules) || !existsSync(modulesManifest);
  const installLooksStale =
    !installMissing &&
    (statSync(packageJson).mtimeMs - statSync(modulesManifest).mtimeMs >
      timestampToleranceMs ||
      statSync(lockfile).mtimeMs - statSync(modulesManifest).mtimeMs >
        timestampToleranceMs);

  if (!installMissing && !installLooksStale) {
    return;
  }

  console.log(
    installMissing
      ? 'Workspace dependencies are missing; validating/installing from the lockfile...'
      : 'Workspace dependency metadata changed; reconciling pnpm install from the lockfile...',
  );

  const result = runPnpm(['install', '--frozen-lockfile']);
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `pnpm install --frozen-lockfile exited with code ${result.status ?? 1}. Run \`pnpm install\` manually if the lockfile intentionally needs to change.`,
    );
  }

  if (existsSync(modulesManifest)) {
    const now = new Date();
    utimesSync(modulesManifest, now, now);
  }
}

function preparePrismaClient() {
  console.log('Generating Prisma client...');
  const result = runPnpm(['db:generate']);

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Prisma client generation exited with code ${result.status ?? 1}.`);
  }
}

function waitForPortOnHost(port, host, timeoutMs) {
  const started = Date.now();

  return new Promise((resolvePromise, reject) => {
    const attempt = () => {
      const socket = net.connect(port, host);

      socket.once('connect', () => {
        socket.end();
        resolvePromise();
      });

      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - started >= timeoutMs) {
          reject(
            new Error(`${host}:${port} did not open within ${timeoutMs}ms`),
          );
          return;
        }
        setTimeout(attempt, 500);
      });
    };

    attempt();
  });
}

function waitForPort(port, timeoutMs) {
  return waitForPortOnHost(port, '127.0.0.1', timeoutMs);
}

async function probeComfyUi(timeoutMs = 2_000) {
  try {
    const response = await fetch(
      new URL('/system_stats', comfyBaseUrl).toString(),
      { signal: AbortSignal.timeout(timeoutMs) },
    );
    return response.ok;
  } catch {
    return false;
  }
}

async function portIsOpen(host, port) {
  try {
    await waitForPortOnHost(port, host, 250);
    return true;
  } catch {
    return false;
  }
}

function comfyVramArgs() {
  switch (process.env.SRF_COMFYUI_VRAM_MODE) {
    case 'lowvram':
      return ['--lowvram'];
    case 'highvram-capable':
    case 'highvram':
      return ['--highvram'];
    default:
      return [];
  }
}

async function prepareComfyUi() {
  if (!comfyManaged) {
    console.log(
      `ComfyUI management disabled (COMFYUI_MANAGED=false). Expecting ${comfyBaseUrl.origin}.`,
    );
    return;
  }

  const hostname = comfyBaseUrl.hostname;
  const isLoopback = ['127.0.0.1', 'localhost', '::1'].includes(hostname);
  if (comfyBaseUrl.protocol !== 'http:' || !isLoopback) {
    console.log(
      `ComfyUI is configured as an external service at ${comfyBaseUrl.origin}; start:all will not manage it.`,
    );
    return;
  }

  if (await probeComfyUi()) {
    console.log(
      `ComfyUI already running at ${comfyBaseUrl.origin}; using the existing instance.`,
    );
    return;
  }

  const port = Number(comfyBaseUrl.port || 8188);
  const connectHost = hostname === 'localhost' ? '127.0.0.1' : hostname;
  if (await portIsOpen(connectHost, port)) {
    console.warn(
      `Port ${port} is already occupied, but ${comfyBaseUrl.origin}/system_stats is not responding as ComfyUI. Reel Forge will not replace that process.`,
    );
    return;
  }

  const mainScript = join(comfyDirectory, 'main.py');
  if (!existsSync(mainScript) || !existsSync(comfyPython)) {
    console.warn(
      'Managed ComfyUI is not installed yet. Run `pnpm comfyui:setup` once; Reel Forge will continue without GPU layer generation.',
    );
    return;
  }

  const args = [
    mainScript,
    '--listen',
    connectHost,
    '--port',
    String(port),
    ...comfyVramArgs(),
  ];

  console.log(`Starting managed ComfyUI at ${comfyBaseUrl.origin}...`);
  comfyProcess = spawn(comfyPython, args, {
    cwd: comfyDirectory,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });

  comfyProcess.once('error', (error) => {
    if (!stopping) {
      console.warn(`Managed ComfyUI could not start: ${error.message}`);
    }
    comfyProcess = undefined;
  });

  comfyProcess.once('exit', (code, signal) => {
    if (!stopping) {
      console.warn(
        signal
          ? `Managed ComfyUI exited with signal ${signal}. Reel Forge will continue without it.`
          : `Managed ComfyUI exited with code ${code ?? 0}. Reel Forge will continue without it.`,
      );
    }
    comfyProcess = undefined;
  });

  try {
    await waitForPortOnHost(port, connectHost, 90_000);
    if (!(await probeComfyUi(5_000))) {
      throw new Error('port opened but /system_stats did not become ready');
    }
    console.log(`Managed ComfyUI ready: ${comfyBaseUrl.origin}`);
  } catch (error) {
    console.warn(
      `Managed ComfyUI did not become ready (${error instanceof Error ? error.message : String(error)}). Reel Forge will continue without it.`,
    );
    stopChild(comfyProcess);
    comfyProcess = undefined;
  }
}

function stopChild(child) {
  if (!child?.pid || child.killed) {
    return;
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }

  child.kill('SIGINT');
}

function stopAll(exitCode) {
  if (stopping) {
    return;
  }

  stopping = true;
  stopChild(animationWorkerProcess);
  stopChild(rendererProcess);
  stopChild(coreProcess);
  stopChild(comfyProcess);
  process.exitCode = exitCode;
}

async function main() {
  startupLock = acquireStartupInstanceLock({
    root,
    lockDirectory: process.env.SRF_STARTUP_LOCK_PATH,
  });
  console.log(`Startup ownership acquired for pid ${startupLock.metadata.pid}.`);

  await prepareHardwareProfile();
  reconcileWorkspaceInstall();
  preparePrismaClient();
  await prepareComfyUi();

  coreProcess = spawnNode(coreScript);

  coreProcess.once('exit', (code, signal) => {
    if (stopping) {
      return;
    }
    console.error(
      signal
        ? `Core local runtime exited with signal ${signal}.`
        : `Core local runtime exited with code ${code ?? 0}.`,
    );
    stopAll(code ?? 1);
  });

  await waitForPort(3000, 60000);
  if (stopping) {
    return;
  }

  rendererProcess = spawnNode(rendererScript, {
    RENDER_ADAPTER: rendererAdapter,
    RENDER_WORKER_ID: rendererWorkerId,
  });

  rendererProcess.once('exit', (code, signal) => {
    if (stopping) {
      return;
    }
    console.error(
      signal
        ? `Renderer worker exited with signal ${signal}.`
        : `Renderer worker exited with code ${code ?? 0}.`,
    );
    stopAll(code ?? 1);
  });

  console.log(
    `Managed renderer worker started: ${rendererWorkerId} / ${rendererAdapter}.`,
  );

  animationWorkerProcess = spawnNode(animationWorkerScript, {
    ANIMATION_WORKER_ID: animationWorkerId,
  });

  animationWorkerProcess.once('exit', (code, signal) => {
    if (stopping) {
      return;
    }
    console.error(
      signal
        ? `Animation worker exited with signal ${signal}.`
        : `Animation worker exited with code ${code ?? 0}.`,
    );
    stopAll(code ?? 1);
  });

  console.log(`Managed animation worker started: ${animationWorkerId}.`);
}

process.on('SIGINT', () => stopAll(130));
process.on('SIGTERM', () => stopAll(143));
process.on('exit', () => {
  if (!startupLock) return;
  try {
    releaseStartupInstanceLock(startupLock);
  } catch {
    // Exit cleanup must never remove a lock whose ownership changed.
  }
});

main().catch((error) => {
  console.error(`Managed local startup failed: ${error.message}`);
  stopAll(1);
});
