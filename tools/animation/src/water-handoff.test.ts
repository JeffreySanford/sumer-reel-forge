import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import type { SceneV2 } from './scene-v2';
import type { WaterMaterialHandoffConfig } from './SceneV2WaterHandoff';

interface WaterHandoffConfigFile {
  schemaVersion: 1;
  transitionId: string;
  outgoingScenePath: string;
  incomingScenePath: string;
  transition: WaterMaterialHandoffConfig;
  reviewMarkers: Array<{ id: string; frame: number }>;
  reviewPolicy: {
    humanApprovalRequired: boolean;
    hardFails: string[];
  };
}

const configPath = resolve(
  'tools/animation/scenes/reel-01-shot-03-to-04-water-handoff.json',
);

async function loadConfig(): Promise<WaterHandoffConfigFile> {
  return JSON.parse(await readFile(configPath, 'utf8')) as WaterHandoffConfigFile;
}

async function loadScene(path: string): Promise<SceneV2> {
  return JSON.parse(await readFile(resolve(path), 'utf8')) as SceneV2;
}

test('Shot 3 to 4 handoff requires water material continuity', async () => {
  const config = await loadConfig();
  assert.equal(config.transition.type, 'waterMaterialHandoff');
  assert.equal(config.transition.materialContinuityRequired, true);
  assert.equal(config.transition.genericDissolveAllowed, false);
  assert.equal(config.reviewPolicy.humanApprovalRequired, true);
  assert.ok(config.transition.preRollFrames >= 12);
  assert.ok(config.transition.postRollFrames >= 12);
  assert.ok(config.transition.coverPeak > 0.5);
});

test('Shot 3 to 4 handoff keeps the physical and numinous scenes separate', async () => {
  const config = await loadConfig();
  const outgoing = await loadScene(config.outgoingScenePath);
  const incoming = await loadScene(config.incomingScenePath);

  assert.equal(outgoing.shots[0]?.sourceShotNumber, 3);
  assert.equal(incoming.shots[0]?.sourceShotNumber, 4);
  assert.equal(outgoing.durationFrames, 210);
  assert.equal(incoming.durationFrames, 240);
  assert.equal(outgoing.fps, incoming.fps);
  assert.equal(
    outgoing.shots[0]?.performance.some(
      (item) => item.preset === 'numinousDrift' && item.enabled !== false,
    ),
    false,
  );
  assert.equal(
    incoming.shots[0]?.performance.some(
      (item) => item.preset === 'numinousDrift' && item.enabled !== false,
    ),
    true,
  );
});

test('Shot 3 to 4 review markers straddle the material cut', async () => {
  const config = await loadConfig();
  const outgoing = await loadScene(config.outgoingScenePath);
  const cutFrame = outgoing.durationFrames;
  const frames = config.reviewMarkers.map((marker) => marker.frame);

  assert.ok(frames.some((frame) => frame < cutFrame));
  assert.ok(frames.includes(cutFrame));
  assert.ok(frames.some((frame) => frame > cutFrame));
});

test(
  'Remotion registers SceneV2WaterHandoff with the real Shot 3 and 4 props',
  { timeout: 60_000 },
  async () => {
    const config = await loadConfig();
    const outgoingScene = await loadScene(config.outgoingScenePath);
    const incomingScene = await loadScene(config.incomingScenePath);
    const temporaryDirectory = await mkdtemp(
      join(tmpdir(), 'sumer-water-handoff-'),
    );
    const propsPath = join(temporaryDirectory, 'props.json');
    await writeFile(
      propsPath,
      `${JSON.stringify(
        {
          outgoingScene,
          incomingScene,
          transition: config.transition,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    const output = await runCommand('pnpm', [
      'exec',
      'remotion',
      'compositions',
      resolve('tools/animation/src/index.tsx'),
      `--props=${propsPath}`,
      `--public-dir=${resolve('assets')}`,
      '--quiet',
    ]);

    assert.match(output, /(?:^|\s)SceneV2WaterHandoff(?:\s|$)/);
  },
);

function runCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: resolve('.'),
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.once('error', rejectPromise);
    child.once('exit', (code, signal) => {
      if (code !== 0) {
        rejectPromise(
          new Error(
            `${command} ${args.join(' ')} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}\n${stderr}`,
          ),
        );
        return;
      }
      resolvePromise(stdout);
    });
  });
}
