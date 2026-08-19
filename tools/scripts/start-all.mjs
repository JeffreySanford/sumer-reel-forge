import 'dotenv/config';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import net from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const pnpmCommand = 'pnpm';
const dockerCommand = process.platform === 'win32' ? 'docker.exe' : 'docker';
const infrastructureServices = ['postgres'];
const children = new Set();

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
  await waitForPort(5432, 60000).catch((error) =>
    fail(`Postgres did not become reachable: ${error.message}`),
  );

  console.log('Applying database migrations...');
  const migrate = runPnpm(['db:deploy'], {
    stdio: 'inherit',
  });

  if (migrate.status !== 0) {
    fail('database migration failed.');
  }

  console.log('Seeding Chapter 1 reels...');
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
    stopChildren();
    process.exit(1);
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
  for (const child of children) {
    child.kill('SIGINT');
  }
}

async function main() {
  assertInstallCurrent();
  assertDockerAvailable();
  await assertPortFree(3000).catch((error) => fail(error.message));
  await assertPortFree(4200).catch((error) => fail(error.message));

  restartStaleInfrastructure();
  await prepareDatabase();

  startProcess('api', ['nx', 'serve', 'api'], { PORT: '3000' });
  startProcess('web', ['nx', 'serve', 'web', '--port=4200'], { PORT: '4200' });

  await Promise.all([waitForPort(3000, 60000), waitForPort(4200, 60000)]).catch(
    (error) => fail(error.message),
  );

  console.log('Sumer Reel Forge is running:');
  console.log('- Web: http://localhost:4200');
  console.log('- API: http://localhost:3000/api');
  console.log('- API docs: http://localhost:3000/api/docs');
  console.log('Press Ctrl+C to stop web/API dev servers.');
}

process.on('SIGINT', () => {
  stopChildren();
  process.exit(130);
});

process.on('SIGTERM', () => {
  stopChildren();
  process.exit(143);
});

main().catch((error) =>
  fail(error instanceof Error ? error.message : String(error)),
);
