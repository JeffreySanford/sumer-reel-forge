import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import {
  validateSceneV2,
  type SceneV2,
} from './scene-v2';

const scenePath = resolve(
  'tools/animation/scenes/reel-01-shot-03-benchmark.scene-v2.json',
);

async function loadScene(): Promise<SceneV2> {
  return JSON.parse(await readFile(scenePath, 'utf8')) as SceneV2;
}

test('Shot 3 benchmark Scene V2 passes deterministic policy', async () => {
  const scene = await loadScene();
  const result = validateSceneV2(scene);

  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(scene.shots[0]?.camera.scaleTo, 1.024);
  assert.match(result.warnings.join('\n'), /defers 2 performance preset/);
});

test('Shot 3 benchmark rejects camera movement above 3 percent', async () => {
  const scene = await loadScene();
  scene.shots[0]!.camera.scaleTo = 1.04;
  const result = validateSceneV2(scene);

  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /camera scale delta 4\.00% exceeds 3%/);
});

test('Scene V2 cannot waive human approval', async () => {
  const scene = await loadScene();
  scene.reviewPolicy.humanApprovalRequired = false;
  const result = validateSceneV2(scene);

  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /requires human approval/);
});

test('Scene V2 cannot mutate story text', async () => {
  const scene = await loadScene();
  scene.sourcePolicy.storyMutationAllowed = true;
  const result = validateSceneV2(scene);

  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /may not mutate story text/);
});

test(
  'Remotion registers SceneV2Benchmark with the real Shot 3 props',
  { timeout: 60_000 },
  async () => {
    const scene = await loadScene();
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'sumer-scene-v2-'));
    const propsPath = join(temporaryDirectory, 'props.json');
    await writeFile(propsPath, `${JSON.stringify({ scene }, null, 2)}\n`, 'utf8');

    const output = await runCommand('pnpm', [
      'exec',
      'remotion',
      'compositions',
      resolve('tools/animation/src/index.tsx'),
      `--props=${propsPath}`,
      `--public-dir=${resolve('assets')}`,
      '--quiet',
    ]);

    assert.match(output, /(?:^|\s)SceneV2Benchmark(?:\s|$)/);
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
