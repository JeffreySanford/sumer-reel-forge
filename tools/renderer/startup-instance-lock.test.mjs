import assert from 'node:assert/strict';
import {
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  acquireStartupInstanceLock,
  inspectStartupInstanceLock,
  releaseStartupInstanceLock,
} from '../runtime/startup-instance-lock.mjs';

const startLocalSource = readFileSync('tools/scripts/start-local.mjs', 'utf8');

async function withTempLock(t) {
  const root = await mkdtemp(join(tmpdir(), 'srf-startup-lock-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return {
    root,
    lockDirectory: join(root, 'runtime', 'startup-instance'),
  };
}

test('startup lock admits one launcher and rejects a concurrent launcher', async (t) => {
  const { root, lockDirectory } = await withTempLock(t);
  const lock = acquireStartupInstanceLock({
    root,
    lockDirectory,
    host: 'test-host',
    pid: process.pid,
    isProcessAlive: () => true,
  });

  const active = inspectStartupInstanceLock(lockDirectory, {
    host: 'test-host',
    isProcessAlive: () => true,
  });
  assert.equal(active.stale, false);
  assert.equal(active.metadata.pid, process.pid);
  assert.equal(active.metadata.root, root);

  assert.throws(
    () =>
      acquireStartupInstanceLock({
        root,
        lockDirectory,
        host: 'test-host',
        pid: process.pid + 1,
        isProcessAlive: () => true,
      }),
    /Another `pnpm start:all` instance already owns startup/,
  );

  releaseStartupInstanceLock(lock);
  assert.equal(inspectStartupInstanceLock(lockDirectory), null);
});

test('startup lock recovers when the recorded owner process is gone', async (t) => {
  const { root, lockDirectory } = await withTempLock(t);
  mkdirSync(lockDirectory, { recursive: true });
  writeFileSync(
    join(lockDirectory, 'lock.json'),
    `${JSON.stringify({
      schemaVersion: 1,
      token: 'dead-owner',
      pid: 424242,
      host: 'test-host',
      root,
      startedAt: new Date(0).toISOString(),
    })}\n`,
    'utf8',
  );

  const lock = acquireStartupInstanceLock({
    root,
    lockDirectory,
    host: 'test-host',
    pid: process.pid,
    isProcessAlive: (pid) => pid === process.pid,
  });

  assert.notEqual(lock.metadata.token, 'dead-owner');
  assert.equal(lock.metadata.pid, process.pid);
  assert.equal(
    JSON.parse(readFileSync(join(lockDirectory, 'lock.json'), 'utf8')).token,
    lock.metadata.token,
  );

  releaseStartupInstanceLock(lock);
});

test('fresh unclaimed startup directory is not stolen during metadata creation', async (t) => {
  const { root, lockDirectory } = await withTempLock(t);
  mkdirSync(lockDirectory, { recursive: true });

  assert.throws(
    () =>
      acquireStartupInstanceLock({
        root,
        lockDirectory,
        host: 'test-host',
        isProcessAlive: () => false,
        unclaimedGraceMs: 60_000,
      }),
    /is acquiring startup ownership/,
  );
});

test('release refuses to delete a lock whose ownership token changed', async (t) => {
  const { root, lockDirectory } = await withTempLock(t);
  const lock = acquireStartupInstanceLock({
    root,
    lockDirectory,
    host: 'test-host',
    isProcessAlive: () => true,
  });

  const changed = {
    ...lock.metadata,
    token: 'replacement-owner',
  };
  writeFileSync(
    join(lockDirectory, 'lock.json'),
    `${JSON.stringify(changed)}\n`,
    'utf8',
  );

  assert.throws(
    () => releaseStartupInstanceLock(lock),
    /ownership changed/,
  );
  assert.equal(
    inspectStartupInstanceLock(lockDirectory)?.metadata.token,
    'replacement-owner',
  );
});

test('start-local acquires ownership before startup side effects and releases on process exit', () => {
  const acquireIndex = startLocalSource.indexOf(
    'startupLock = acquireStartupInstanceLock({',
  );
  const profileIndex = startLocalSource.indexOf('await prepareHardwareProfile();');

  assert.ok(acquireIndex >= 0, 'start-local must acquire the startup lock');
  assert.ok(
    profileIndex > acquireIndex,
    'startup ownership must be acquired before hardware profiling or child startup',
  );
  assert.match(startLocalSource, /process\.on\('exit', \(\) => \{/);
  assert.match(startLocalSource, /releaseStartupInstanceLock\(startupLock\)/);
});
