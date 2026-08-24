import { spawn, spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import net from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const root = dirname(dirname(dirname(scriptPath)));

loadLocalEnvFile();

const pnpmCommand = 'pnpm';
const dockerCommand = process.platform === 'win32' ? 'docker.exe' : 'docker';
const infrastructureServices = ['postgres'];
const managedPorts = [3000, 4200, 9229];
const databaseUrl = new URL(
  process.env.DATABASE_URL ??
    'postgresql://sumer_reel_forge:sumer_reel_forge@localhost:5432/sumer_reel_forge',
);
const databasePort = Number(databaseUrl.port || 5432);
const children = new Set();
let stopping = false;
let stdinRawModeEnabled = false;

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

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    shell: options.shell ?? false,
    stdio: options.stdio ?? 'pipe',
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function runPnpm(args, options = {}) {
  return run(pnpmCommand, args, {
    ...options,
    shell: process.platform === 'win32',
  });
}

function fail(message, details) {
  console.error(`start:all failed: ${message}`);
  if (details) {
    console.error(details.trim());
  }
  stopChildren();
  process.exit(1);
}

function assertInstallCurrent() {
  const nodeModules = join(root, 'node_modules');
  const modulesManifest = join(nodeModules, '.modules.yaml');
  const lockfile = join(root, 'pnpm-lock.yaml');
  const packageJson = join(root, 'package.json');

  if (!existsSync(nodeModules) || !existsSync(modulesManifest)) {
    fail('dependencies are not installed. Run `pnpm install` first.');
  }

  const installTime = statSync(modulesManifest).mtimeMs;
  const packageTime = statSync(packageJson).mtimeMs;
  const lockTime = statSync(lockfile).mtimeMs;
  const timestampToleranceMs = 2000;

  if (
    packageTime - installTime > timestampToleranceMs ||
    lockTime - installTime > timestampToleranceMs
  ) {
    fail('dependencies are stale. Run `pnpm install` first.');
  }

  const nxBin = join(
    root,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'nx.cmd' : 'nx',
  );
  if (!existsSync(nxBin)) {
    fail('Nx binary is missing from node_modules. Run `pnpm install` first.');
  }
}

function preparePlanningRuntime() {
  const provider = process.env.PLANNING_PROVIDER ?? 'deterministic';
  if (provider !== 'ollama') {
    console.log(`Planning runtime: ${provider} (Ollama warm-up skipped).`);
    return;
  }

  console.log('Checking local Ollama planning runtime...');
  const check = runPnpm(['planning:ollama:check'], { stdio: 'inherit' });
  if (check.status !== 0) {
    fail('Ollama planning check failed.');
  }

  console.log('Warming configured Ollama planning model...');
  const warm = runPnpm(['planning:ollama:warm'], { stdio: 'inherit' });
  if (warm.status !== 0) {
    fail('Ollama planning model warm-up failed.');
  }
}

function assertDockerAvailable() {
  const result = run(dockerCommand, ['compose', 'version']);

  if (result.status !== 0) {
    fail(
      'Docker Compose is unavailable. Start Docker Desktop and try again.',
      result.stderr || result.stdout,
    );
  }
}

function parseComposeJson(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return trimmed
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
}

function isStaleContainer(container) {
  const state = String(container.State ?? '').toLowerCase();
  const health = String(container.Health ?? '').toLowerCase();

  return (
    ['dead', 'exited', 'removing'].includes(state) ||
    state.includes('restart') ||
    health === 'unhealthy'
  );
}

function restartStaleInfrastructure() {
  const ps = run(dockerCommand, ['compose', 'ps', '--format', 'json']);

  if (ps.status !== 0) {
    fail('could not inspect Docker Compose services.', ps.stderr || ps.stdout);
  }

  const containers = parseComposeJson(ps.stdout);
  for (const service of infrastructureServices) {
    const container = containers.find((item) => item.Service === service);

    if (container && isStaleContainer(container)) {
      console.log(`Restarting stale Docker service: ${service}`);
      const restart = run(
        dockerCommand,
        ['compose', 'up', '-d', '--force-recreate', service],
        {
          stdio: 'inherit',
        },
      );

      if (restart.status !== 0) {
        fail(`could not restart Docker service ${service}.`);
      }
    }
  }

  const up = run(
    dockerCommand,
    ['compose', 'up', '-d', ...infrastructureServices],
    {
      stdio: 'inherit',
    },
  );

  if (up.status !== 0) {
    fail('could not start Docker infrastructure services.');
  }
}

async function prepareDatabase() {
  await waitForPort(databasePort, 60000).catch((error) =>
    fail(`Postgres did not become reachable: ${error.message}`),
  );

  console.log('Applying database migrations...');
  const migrate = runPnpm(['db:deploy'], {
    stdio: 'inherit',
  });

  if (migrate.status !== 0) {
    fail('database migration failed.');
  }

  console.log('Creating any missing Chapter 1 seed records...');
  const seed = runPnpm(['db:seed:chapter1'], {
    stdio: 'inherit',
  });

  if (seed.status !== 0) {
    fail('database seed failed.');
  }
}

function waitForPortOnHost(port, host, timeoutMs) {
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect(port, host);

      socket.once('connect', () => {
        socket.end();
        resolve();
      });

      socket.once('error', () => {
        socket.destroy();

        if (Date.now() - started > timeoutMs) {
          reject(
            new Error(
              `port ${port} did not open on ${host} within ${timeoutMs}ms`,
            ),
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
  return Promise.any([
    waitForPortOnHost(port, '127.0.0.1', timeoutMs),
    waitForPortOnHost(port, '::1', timeoutMs),
  ]).catch(() => {
    throw new Error(`port ${port} did not open within ${timeoutMs}ms`);
  });
}

function assertPortFreeOnHost(port, host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once('error', () => {
      reject(new Error(`port ${port} is already in use on ${host}`));
    });

    server.once('listening', () => {
      server.close(resolve);
    });

    server.listen(port, host);
  });
}

async function assertPortFree(port) {
  await assertPortFreeOnHost(port, '127.0.0.1');

  if (process.platform === 'win32') {
    await assertPortFreeOnHost(port, '::');
  }
}

function handleProcessOutput(label, chunk, stream) {
  const text = String(chunk);
  stream.write(`[${label}] ${text}`);

  if (
    text.includes('EADDRINUSE') ||
    text.includes('Process exited with code 1, waiting for changes to restart')
  ) {
    console.error(`[${label}] fatal dev-server startup error`);
    stopAndExit(1);
  }
}

function startProcess(label, args, envOverrides = {}) {
  const child = spawn(pnpmCommand, args, {
    cwd: root,
    env: {
      ...process.env,
      ...envOverrides,
    },
    shell: process.platform === 'win32',
    stdio: 'pipe',
    windowsHide: true,
  });

  children.add(child);

  child.stdout.on('data', (chunk) => {
    handleProcessOutput(label, chunk, process.stdout);
  });

  child.stderr.on('data', (chunk) => {
    handleProcessOutput(label, chunk, process.stderr);
  });

  child.on('exit', (code, signal) => {
    children.delete(child);

    if (signal) {
      console.error(`[${label}] exited with signal ${signal}`);
      return;
    }

    if (code !== 0) {
      console.error(`[${label}] exited with code ${code}`);
      stopChildren();
      process.exitCode = code ?? 1;
    }
  });

  return child;
}

function stopChildren() {
  if (stopping) {
    return;
  }

  stopping = true;
  restoreStdinMode();

  for (const child of children) {
    stopChildProcessTree(child);
  }

  cleanupRepoPortListeners();
}

function stopChildProcessTree(child) {
  if (!child.pid || child.killed) {
    return;
  }

  if (process.platform === 'win32') {
    const result = run('taskkill.exe', ['/PID', String(child.pid), '/T', '/F']);

    if (result.status !== 0 && !result.stderr.includes('not found')) {
      console.error(result.stderr.trim() || result.stdout.trim());
    }

    return;
  }

  child.kill('SIGINT');
}

function cleanupRepoPortListeners() {
  if (process.platform !== 'win32') {
    return;
  }

  const escapedRoot = root.replaceAll("'", "''");
  const ports = managedPorts.join(',');
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$root = '${escapedRoot}'.ToLowerInvariant()
$ports = @(${ports})
$connections = Get-NetTCPConnection -LocalPort $ports |
  Where-Object { $_.State -eq 'Listen' }
$listenerProcessIds = $connections |
  Select-Object -ExpandProperty OwningProcess -Unique
$devProcessIds = Get-CimInstance Win32_Process |
  Where-Object {
    if (-not $_.CommandLine) { return $false }
    $commandLine = $_.CommandLine.ToLowerInvariant()
    $isRepoProcess = $commandLine.Contains($root)
    $isNodeTool = $_.Name -in @('node.exe', 'esbuild.exe')
    $isStartAllDevProcess =
      $commandLine -match 'nx\\.js"\\s+"serve"\\s+"(api|web)"' -or
      $commandLine -match 'run-executor\\.js' -or
      $commandLine -match 'webpack-cli' -or
      $_.Name -eq 'esbuild.exe'

    return $isRepoProcess -and $isNodeTool -and $isStartAllDevProcess
  } |
  Select-Object -ExpandProperty ProcessId -Unique
$processIds = @($listenerProcessIds) + @($devProcessIds) |
  Select-Object -Unique

foreach ($processId in $processIds) {
  $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $processId"
  if ($proc -and $proc.CommandLine -and $proc.CommandLine.ToLowerInvariant().Contains($root)) {
    Write-Host "Stopping repo-local dev process $processId."
    Stop-Process -Id $processId -Force
  }
}
`;

  const result = run(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
    {
      stdio: 'inherit',
    },
  );

  if (result.status !== 0) {
    console.error('Could not complete managed port cleanup.');
  }
}

function stopAndExit(exitCode) {
  stopChildren();
  process.exit(exitCode);
}

function startCleanupWatcher() {
  if (process.platform !== 'win32') {
    return;
  }

  const watcher = spawn(
    process.execPath,
    [scriptPath, '--cleanup-when-parent-exits', String(process.pid)],
    {
      cwd: root,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    },
  );
  watcher.unref();
}

function startCleanupWhenParentExits(parentPid) {
  setInterval(() => {
    try {
      process.kill(parentPid, 0);
    } catch {
      cleanupRepoPortListeners();
      process.exit(0);
    }
  }, 750);
}

function enableInteractiveShutdown() {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    return;
  }

  process.stdin.setRawMode(true);
  stdinRawModeEnabled = true;
  process.stdin.resume();
  process.stdin.on('data', (chunk) => {
    if (String(chunk).includes('\u0003')) {
      console.log('Stopping Sumer Reel Forge dev servers...');
      stopAndExit(130);
    }
  });
}

function restoreStdinMode() {
  if (!stdinRawModeEnabled) {
    return;
  }

  process.stdin.setRawMode(false);
  stdinRawModeEnabled = false;
}

async function main() {
  assertInstallCurrent();
  preparePlanningRuntime();
  assertDockerAvailable();
  await assertPortFree(3000).catch((error) => fail(error.message));
  await assertPortFree(4200).catch((error) => fail(error.message));

  restartStaleInfrastructure();
  await prepareDatabase();

  startCleanupWatcher();
  startProcess('api', ['nx', 'serve', 'api'], { PORT: '3000' });
  startProcess('web', ['nx', 'serve', 'web', '--port=4200'], { PORT: '4200' });

  await Promise.all([waitForPort(3000, 60000), waitForPort(4200, 60000)]).catch(
    (error) => fail(error.message),
  );

  console.log('Sumer Reel Forge is running:');
  console.log('- Web: http://localhost:4200');
  console.log('- API: http://localhost:3000/api');
  console.log('- API docs: http://localhost:3000/api/docs');
  console.log(`- Planning: ${process.env.PLANNING_PROVIDER ?? 'deterministic'}`);
  console.log('Press Ctrl+C to stop web/API dev servers.');
}

process.on('SIGINT', () => {
  stopAndExit(130);
});

process.on('SIGTERM', () => {
  stopAndExit(143);
});

process.on('exit', () => {
  restoreStdinMode();
});

if (process.argv[2] === '--cleanup-when-parent-exits') {
  startCleanupWhenParentExits(Number(process.argv[3]));
} else {
  enableInteractiveShutdown();

  main().catch((error) =>
    fail(error instanceof Error ? error.message : String(error)),
  );
}
