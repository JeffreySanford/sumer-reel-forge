import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

const genericSource = read('tools/scripts/animation-layer-candidates.mjs');

const managedScriptWrappers = [
  {
    path: 'tools/scripts/shot03-background-layer.mjs',
    owner: 'shot03-background-layer',
    engine: 'shot03-background-layer-engine.mjs',
    leaseCommands: "['generate']",
  },
  {
    path: 'tools/scripts/repair-background-from-overlay.mjs',
    owner: 'animation-background-repair',
    engine: 'repair-background-from-overlay-engine.mjs',
    leaseCommands: "['generate']",
  },
  {
    path: 'tools/scripts/shot03-level2-enki-blink-v2.mjs',
    owner: 'level2-character-state',
    engine: 'shot03-level2-enki-blink-v2-engine.mjs',
    leaseCommands: "['generate', 'all']",
  },
  {
    path: 'tools/scripts/shot03-level2-enki-blink-replacement.mjs',
    owner: 'level2-character-state',
    engine: 'shot03-level2-enki-blink-replacement-engine.mjs',
    leaseCommands: "['generate', 'all']",
  },
];

const delegatedGenericWrappers = [
  'tools/scripts/shot03-water-layer.mjs',
  'tools/scripts/shot03-vessel-layer.mjs',
  'tools/scripts/shot03-enki-body-layer.mjs',
  'tools/scripts/shot04-mid-current-layer.mjs',
];

test('generic ComfyUI candidate generation holds one lease around internal concurrency', () => {
  assert.match(
    genericSource,
    /import \{ withGpuAiTask \} from '\.\.\/runtime\/gpu-ai-task\.mjs';/,
  );
  assert.match(genericSource, /owner:\s*'animation-layer-candidates'/);
  assert.match(genericSource, /backend:\s*'comfyui'/);

  const leaseStart = genericSource.indexOf('const run = await withGpuAiTask(');
  const generation = genericSource.indexOf(
    'return generateLayerCandidates({ ...options, preflight });',
    leaseStart,
  );

  assert.ok(leaseStart >= 0, 'generic generation must acquire the shared GPU lease');
  assert.ok(
    generation > leaseStart,
    'the complete candidate-generation call, including its internal concurrency, must run inside one lease',
  );
});

test('specialized direct ComfyUI entrypoints delegate complete generation commands through one managed script lease', () => {
  for (const item of managedScriptWrappers) {
    const source = read(item.path);
    assert.match(source, /runGpuManagedComfyUiScript/);
    assert.match(source, new RegExp(`owner:\\s*'${item.owner}'`));
    assert.match(source, new RegExp(item.engine.replaceAll('.', '\\.')));
    assert.ok(
      source.includes(`leaseCommands: ${item.leaseCommands}`),
      `${item.path} must lease exactly ${item.leaseCommands}`,
    );
  }
});

test('specialized ComfyUI engines stay lease-neutral so wrappers cannot double-acquire', () => {
  for (const item of managedScriptWrappers) {
    const enginePath = item.path.replace('.mjs', '-engine.mjs');
    const source = read(enginePath);
    assert.doesNotMatch(source, /withGpuAiTask|runGpuManagedComfyUiScript/);
    assert.match(source, /\/prompt/);
  }
});

test('multi-workflow blink production is protected by one outer lease', () => {
  const wrapper = read('tools/scripts/shot03-level2-enki-blink-v2.mjs');
  const engine = read('tools/scripts/shot03-level2-enki-blink-v2-engine.mjs');

  assert.match(wrapper, /leaseCommands:\s*\['generate', 'all'\]/);
  assert.match(engine, /blink eye localization/);
  assert.match(engine, /blink-state inpaint/);
  assert.doesNotMatch(engine, /withGpuAiTask|runGpuManagedComfyUiScript/);
});

test('thin layer wrappers delegate to the already-leased generic candidate CLI without nested leases', () => {
  for (const path of delegatedGenericWrappers) {
    const source = read(path);
    assert.match(source, /animation-layer-candidates\.mjs/);
    assert.doesNotMatch(source, /withGpuAiTask|runGpuManagedComfyUiScript/);
  }
});

test('legacy local renderer owns one lease around the complete ComfyUI image batch', () => {
  const wrapper = read('tools/renderer/comfyui-adapter.mjs');
  const engine = read('tools/renderer/comfyui-adapter-engine.mjs');
  const localAdapter = read('tools/renderer/local-adapter.mjs');

  assert.match(wrapper, /withGpuAiTask/);
  assert.match(wrapper, /owner:\s*'local-renderer-comfyui'/);
  assert.match(wrapper, /backend:\s*'comfyui'/);
  assert.match(wrapper, /return renderComfyUiImagesEngine\(context\)/);
  assert.doesNotMatch(engine, /withGpuAiTask/);
  assert.match(engine, /\/prompt/);

  const imageBatch = localAdapter.indexOf('await renderComfyUiImages(context)');
  const tts = localAdapter.indexOf('await runConfiguredCommand({', imageBatch);
  assert.ok(imageBatch >= 0, 'local renderer must invoke the managed image batch');
  assert.ok(tts > imageBatch, 'TTS must occur after the managed ComfyUI batch returns');
});
