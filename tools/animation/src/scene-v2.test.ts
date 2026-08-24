import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import * as ts from 'typescript';
import { validateSceneV2, type SceneV2 } from './scene-v2';

const shotOneScenePath = resolve(
  'tools/animation/scenes/reel-01-shot-01-black-water-benchmark.scene-v2.json',
);
const shotTwoScenePath = resolve(
  'tools/animation/scenes/reel-01-shot-02-stag-coastline-benchmark.scene-v2.json',
);
const shotThreeScenePath = resolve(
  'tools/animation/scenes/reel-01-shot-03-benchmark.scene-v2.json',
);
const shotFourScenePath = resolve(
  'tools/animation/scenes/reel-01-shot-04-nammu-benchmark.scene-v2.json',
);
const shotFiveScenePath = resolve(
  'tools/animation/scenes/reel-01-shot-05-traveler-shrine-benchmark.scene-v2.json',
);
const shotFiveContractPath = resolve(
  'tools/animation/shot-contracts/reel-01-shot-05.json',
);

async function loadScene(scenePath = shotThreeScenePath): Promise<SceneV2> {
  return JSON.parse(await readFile(scenePath, 'utf8')) as SceneV2;
}

test('Shot 1 retrofit preserves the editorial frame and uses camera-only opening motion', async () => {
  const scene = await loadScene(shotOneScenePath);
  const result = validateSceneV2(scene);
  const shot = scene.shots[0]!;

  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(shot.id, 'black-water-before-dawn');
  assert.equal(shot.durationFrames, 180);
  assert.equal(shot.camera.preset, 'slowPush');
  assert.equal(shot.camera.scaleTo, 1.018);
  assert.deepEqual(shot.performance, []);
  assert.deepEqual(shot.atmosphere, []);
  assert.deepEqual(shot.lighting, []);
  assert.deepEqual(shot.layers[0]?.motionPresets, []);
  assert.match(shot.layers[0]?.assetPath ?? '', /editorial-v1\/shot-01\.png$/);
});

test('Shot 2 retrofit preserves the editorial frame and uses a restrained lateral pan', async () => {
  const scene = await loadScene(shotTwoScenePath);
  const result = validateSceneV2(scene);
  const shot = scene.shots[0]!;

  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(shot.id, 'stag-of-the-absu-coastline');
  assert.equal(shot.durationFrames, 210);
  assert.equal(shot.camera.preset, 'lateralPan');
  assert.equal(shot.camera.xFrom, -14);
  assert.equal(shot.camera.xTo, 14);
  assert.deepEqual(shot.performance, []);
  assert.deepEqual(shot.atmosphere, []);
  assert.deepEqual(shot.lighting, []);
  assert.deepEqual(shot.layers[0]?.motionPresets, []);
  assert.match(shot.layers[0]?.assetPath ?? '', /editorial-v1\/shot-02\.png$/);
});

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

test('Shot 4 benchmark Scene V2 passes numinous policy', async () => {
  const scene = await loadScene(shotFourScenePath);
  const result = validateSceneV2(scene);

  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(scene.shots[0]?.camera.preset, 'nearStatic');
  assert.equal(scene.shots[0]?.camera.scaleTo, 1.008);
  assert.equal(scene.shots[0]?.performance[0]?.preset, 'numinousDrift');
});

test('Shot 5 benchmark accepts source-grounded smokeDrift atmosphere', async () => {
  const scene = await loadScene(shotFiveScenePath);
  const result = validateSceneV2(scene);

  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(scene.shots[0]?.camera.preset, 'slowPush');
  assert.equal(scene.shots[0]?.stillnessAnchor, 'shrine-structure');
  assert.equal(scene.shots[0]?.atmosphere[0]?.preset, 'smokeDrift');
  assert.equal(scene.shots[0]?.camera.scaleTo, 1.022);
});

test('Shot 5 requires shrine and water while keeping smoke optional and defined', async () => {
  const contract = JSON.parse(await readFile(shotFiveContractPath, 'utf8'));
  const required = contract.shot?.activationPolicy?.requiredLayerIds ?? [];
  const smoke = contract.shot?.layers?.find(
    (layer: { id?: string }) => layer.id === 'shot05-smoke-v1',
  );

  assert.deepEqual(required, [
    'shot05-shrine-base-v1',
    'shot05-welcome-water-v1',
  ]);
  assert.ok(smoke, 'Shot 5 smoke layer should remain available as an optional lane.');
  assert.equal(smoke.state, 'planned');
  assert.equal(smoke.review?.status, 'pending');
  assert.match(smoke.review?.notes?.join('\n') ?? '', /Optional\/deferred/);
  assert.equal(required.includes('shot05-smoke-v1'), false);
});

test('contained water renderer uses true refraction instead of only translated cards', async () => {
  const rendererPath = resolve(
    'tools/animation/src/ContainedWaterMaterialLayer.tsx',
  );
  const source = await readFile(rendererPath, 'utf8');

  assert.match(source, /feTurbulence/);
  assert.match(source, /feDisplacementMap/);
  assert.match(source, /water-refraction-a/);
  assert.match(source, /water-refraction-b/);
});

test('contained water keeps readable ripples inside a contracted basin mask without diagonal glint bands', async () => {
  const rendererPath = resolve(
    'tools/animation/src/ContainedWaterMaterialLayer.tsx',
  );
  const source = await readFile(rendererPath, 'utf8');

  assert.match(source, /data-water-boundary="basin-alpha-safe"/);
  assert.match(source, /transform: 'scale\(0\.985\)'/);
  assert.match(source, /data-water-motion="broad-traveling-ripple"/);
  assert.doesNotMatch(source, /repeating-linear-gradient/);
  assert.doesNotMatch(source, /glintDrift|counterDrift/);
});

test('Shot 4 benchmark rejects camera movement above 1 percent', async () => {
  const scene = await loadScene(shotFourScenePath);
  scene.shots[0]!.camera.scaleTo = 1.02;
  const result = validateSceneV2(scene);

  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /camera scale delta 2\.00% exceeds 1%/);
});

test('Shot 4 benchmark rejects camera rotation', async () => {
  const scene = await loadScene(shotFourScenePath);
  scene.shots[0]!.camera.rotationTo = 0.1;
  const result = validateSceneV2(scene);

  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /may not use camera rotation/);
});

test('Shot 4 benchmark requires environmental numinous drift', async () => {
  const scene = await loadScene(shotFourScenePath);
  scene.shots[0]!.performance = [];
  const result = validateSceneV2(scene);

  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /requires enabled numinousDrift environmental coherence/);
});

test('Shot 4 benchmark rejects conventional character performance', async () => {
  const scene = await loadScene(shotFourScenePath);
  scene.shots[0]!.performance.push({
    target: 'nammu-eyes',
    preset: 'blinkOnce',
    startProgress: 0.5,
    endProgress: 0.54,
    intensity: 1,
    enabled: true,
  });
  const result = validateSceneV2(scene);

  assert.equal(result.valid, false);
  assert.match(
    result.errors.join('\n'),
    /may not animate Nammu with conventional character performance presets/,
  );
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

test('Scene V2 benchmark renderer contains no top-level await', async () => {
  const scriptPath = resolve('tools/scripts/render-scene-v2-benchmark.ts');
  const source = await readFile(scriptPath, 'utf8');
  const sourceFile = ts.createSourceFile(
    scriptPath,
    source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  );
  const violations: string[] = [];

  const visit = (node: ts.Node): void => {
    if (isFunctionBoundary(node)) {
      return;
    }

    if (ts.isAwaitExpression(node)) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile),
      );
      violations.push(`await at ${line + 1}:${character + 1}`);
      return;
    }

    if (ts.isForOfStatement(node) && node.awaitModifier) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile),
      );
      violations.push(`for-await at ${line + 1}:${character + 1}`);
      return;
    }

    ts.forEachChild(node, visit);
  };

  for (const statement of sourceFile.statements) {
    visit(statement);
  }

  assert.deepEqual(
    violations,
    [],
    `Benchmark renderer must stay CommonJS-compatible: ${violations.join(', ')}`,
  );
});

test(
  'Remotion registers SceneV2Benchmark with the real Shot 4 props',
  { timeout: 60_000 },
  async () => {
    const scene = await loadScene(shotFourScenePath);
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

function isFunctionBoundary(node: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

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
