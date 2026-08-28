import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

loadLocalEnvFile();

const pnpmCommand = 'pnpm';
const port = Number(process.env.E2E_API_PORT ?? 3100);
const sourceDatabaseUrl = new URL(
  process.env.DATABASE_URL ??
    'postgresql://sumer_reel_forge:sumer_reel_forge@localhost:5432/sumer_reel_forge',
);
const sourceDatabaseName = decodeURIComponent(
  sourceDatabaseUrl.pathname.replace(/^\//, ''),
);
const e2eDatabaseName =
  process.env.E2E_DATABASE_NAME ?? `${sourceDatabaseName}_e2e`;

if (!/^[a-z][a-z0-9_]*$/i.test(e2eDatabaseName)) {
  throw new Error(
    'E2E_DATABASE_NAME must contain only letters, digits, and underscores.',
  );
}

if (!e2eDatabaseName.endsWith('_e2e')) {
  throw new Error('Refusing to recreate a database without the `_e2e` suffix.');
}

const e2eDatabaseUrl = new URL(sourceDatabaseUrl);
e2eDatabaseUrl.pathname = `/${e2eDatabaseName}`;
let apiProcess;

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
    env: options.env ?? process.env,
    encoding: 'utf8',
    shell: process.platform === 'win32' && command === pnpmCommand,
    stdio: options.stdio ?? 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} exited with ${result.status}.`,
    );
  }
}

async function recreateDatabase() {
  const adminUrl = new URL(sourceDatabaseUrl);
  adminUrl.pathname = '/postgres';
  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();

  try {
    await client.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
      [e2eDatabaseName],
    );
    await client.query(`DROP DATABASE IF EXISTS "${e2eDatabaseName}"`);
    await client.query(`CREATE DATABASE "${e2eDatabaseName}"`);
  } finally {
    await client.end();
  }
}

async function verifySeedPreservesExistingContent(testEnv) {
  const client = new Client({ connectionString: e2eDatabaseUrl.toString() });
  await client.connect();

  try {
    const original = await client.query(`
      SELECT r.id AS reel_id, r.logline, s.id AS shot_id, s.visual
      FROM reels r
      JOIN reel_shots s ON s.reel_id = r.id AND s.shot_number = 1
      WHERE r.episode_number = 1
      LIMIT 1
    `);
    const baseline = original.rows[0];
    if (!baseline) {
      throw new Error('Seed safety check could not find Reel 1.');
    }

    await client.query('UPDATE reels SET logline = $1 WHERE id = $2', [
      'SEED_SAFETY_SENTINEL',
      baseline.reel_id,
    ]);
    await client.query('UPDATE reel_shots SET visual = $1 WHERE id = $2', [
      'SEED_SHOT_SENTINEL',
      baseline.shot_id,
    ]);

    run(pnpmCommand, ['db:seed:chapter1'], { env: testEnv });
    const preserved = await client.query(
      'SELECT r.logline, s.visual FROM reels r JOIN reel_shots s ON s.reel_id = r.id AND s.shot_number = 1 WHERE r.id = $1',
      [baseline.reel_id],
    );
    if (
      preserved.rows[0]?.logline !== 'SEED_SAFETY_SENTINEL' ||
      preserved.rows[0]?.visual !== 'SEED_SHOT_SENTINEL'
    ) {
      throw new Error('Default Chapter 1 seed overwrote existing content.');
    }

    run(pnpmCommand, ['db:seed:chapter1:refresh'], { env: testEnv });
    const refreshed = await client.query(
      'SELECT r.logline, s.visual FROM reels r JOIN reel_shots s ON s.reel_id = r.id AND s.shot_number = 1 WHERE r.id = $1',
      [baseline.reel_id],
    );
    if (
      refreshed.rows[0]?.logline !== baseline.logline ||
      refreshed.rows[0]?.visual !== baseline.visual
    ) {
      throw new Error(
        'Explicit Chapter 1 refresh did not restore seed content.',
      );
    }
  } finally {
    await client.end();
  }

  console.log('Verified that default seeding preserves existing reel content.');
}

async function waitForApi(timeoutMs = 60_000) {
  const startedAt = Date.now();
  const healthUrl = `http://127.0.0.1:${port}/api/health`;

  while (Date.now() - startedAt < timeoutMs) {
    if (apiProcess?.exitCode !== null) {
      throw new Error(`E2E API exited before becoming healthy.`);
    }

    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // The API is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`E2E API did not become healthy on port ${port}.`);
}

function startApi(env) {
  apiProcess = spawn(process.execPath, ['dist/apps/api/main.js'], {
    cwd: root,
    env,
    stdio: 'inherit',
    windowsHide: true,
  });
}

function stopApi() {
  if (!apiProcess?.pid || apiProcess.exitCode !== null) {
    return;
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(apiProcess.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }

  apiProcess.kill('SIGTERM');
}

async function main() {
  console.log(`Preparing isolated database ${e2eDatabaseName}...`);
  await recreateDatabase();

  const testEnv = {
    ...process.env,
    DATABASE_URL: e2eDatabaseUrl.toString(),
    E2E_DATABASE_NAME: e2eDatabaseName,
    HOST: '127.0.0.1',
    NODE_ENV: 'test',
    PORT: String(port),
    WEB_ORIGIN: 'http://localhost:4200',
    OLLAMA_BASE_URL: 'http://127.0.0.1:9',
    OLLAMA_TEXT_MODEL: 'qwen3:8b',
    OLLAMA_VISION_MODEL: 'qwen3-vl:8b',
  };

  run(pnpmCommand, ['db:deploy'], { env: testEnv });
  run(pnpmCommand, ['db:seed:chapter1'], { env: testEnv });
  await verifySeedPreservesExistingContent(testEnv);

  if (process.argv.includes('--prepare-only')) {
    console.log(`Prepared ${e2eDatabaseName}.`);
    return;
  }

  run(pnpmCommand, ['nx', 'build', 'api', '--configuration=development'], {
    env: testEnv,
  });
  startApi(testEnv);
  await waitForApi();

  run(
    pnpmCommand,
    ['exec', 'jest', '--config', 'apps/api-e2e/jest.config.ts', '--runInBand'],
    { env: testEnv },
  );
}

process.on('SIGINT', () => {
  stopApi();
  process.exit(130);
});
process.on('SIGTERM', () => {
  stopApi();
  process.exit(143);
});

try {
  await main();
} finally {
  stopApi();
}
