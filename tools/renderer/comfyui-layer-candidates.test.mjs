import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  assertFullCanvasCandidate,
  buildLayerPrompt,
  generateLayerCandidates,
  readPngDimensionsFromBuffer,
  replaceWorkflowTokens,
  selectCandidateLayers,
} from './comfyui-layer-candidates.mjs';

const SHOT = {
  shotId: 'enki-at-the-helm',
  sourceShotNumber: 3,
  sourceFrame: 'project/editorial-v1/shot-03.png',
  activationPolicy: {
    requiredLayerIds: ['background', 'water', 'vessel', 'enki'],
  },
  layers: [
    layer('background', 'background', 'atmosphere-distant', false),
    layer('water', 'water', 'water', true),
    layer('vessel', 'major-prop', 'rigid-vessel', true),
    layer('enki', 'character', 'cloth-heavy', true),
    layer('rigging', 'foreground-occluder', 'reed', true),
  ],
};

const MANIFEST = {
  schemaVersion: 1,
  manifestId: 'test-animation-v1',
  shots: [SHOT],
};

test('selects only required non-approved layers by default', () => {
  const manifest = structuredClone(MANIFEST);
  manifest.shots[0].layers.find((item) => item.id === 'water').state = 'approved';

  const selected = selectCandidateLayers(manifest, { shotNumber: 3 });

  assert.deepEqual(
    selected.map(({ layer: item }) => item.id),
    ['background', 'vessel', 'enki'],
  );
  assert.equal(selected.every((item) => item.required), true);
});

test('all-layers opt-in includes optional pending layers', () => {
  const selected = selectCandidateLayers(MANIFEST, {
    shotNumber: 3,
    allLayers: true,
  });

  assert.deepEqual(
    selected.map(({ layer: item }) => item.id),
    ['background', 'water', 'vessel', 'enki', 'rigging'],
  );
  assert.equal(selected.at(-1).required, false);
});

test('layer prompts preserve identity and source registration', () => {
  const enki = SHOT.layers.find((item) => item.id === 'enki');
  const prompt = buildLayerPrompt(SHOT, {
    ...enki,
    id: 'shot03-enki-body-v1',
  });

  assert.match(prompt, /sole visual source/i);
  assert.match(prompt, /exact source dimensions and coordinates/i);
  assert.match(prompt, /Enki identity is an immutable anchor/i);
  assert.match(prompt, /do not redesign/i);
});

test('Nammu coherence prompt explicitly avoids a cutout supernatural character', () => {
  const prompt = buildLayerPrompt(
    { ...SHOT, shotId: 'nammu-under-water', sourceShotNumber: 4 },
    {
      ...layer('shot04-nammu-coherence-mask-v1', 'mask', 'divine-light', true),
    },
  );

  assert.match(prompt, /environmental coherence/i);
  assert.match(prompt, /never as a cutout woman/i);
  assert.match(prompt, /glowing-eyed/i);
});

test('replaces layer workflow tokens recursively', () => {
  const workflow = {
    a: '{{SOURCE_IMAGE}}',
    nested: [{ prompt: '{{LAYER_PROMPT}} / {{LAYER_ID}}' }],
  };

  assert.deepEqual(
    replaceWorkflowTokens(workflow, {
      '{{SOURCE_IMAGE}}': 'source.png',
      '{{LAYER_PROMPT}}': 'water only',
      '{{LAYER_ID}}': 'water',
    }),
    {
      a: 'source.png',
      nested: [{ prompt: 'water only / water' }],
    },
  );
});

test('rejects candidate PNG dimensions that break full-canvas registration', () => {
  assert.deepEqual(readPngDimensionsFromBuffer(pngHeader(1080, 1920)), {
    width: 1080,
    height: 1920,
  });
  assert.throws(
    () =>
      assertFullCanvasCandidate(
        { width: 1080, height: 1920 },
        { width: 768, height: 1344 },
        'water',
      ),
    /do not match source 1080x1920/,
  );
});

test('generation writes candidates under tmp-style output and never mutates the manifest', async () => {
  const root = await mkdtemp(join(os.tmpdir(), 'srf-layer-candidate-'));
  const assetRoot = join(root, 'assets');
  const sourcePath = join(assetRoot, SHOT.sourceFrame);
  const workflowPath = join(root, 'layer-workflow.json');
  const manifestPath = join(root, 'manifest.json');
  const outputRoot = join(root, 'tmp', 'animation-assets', 'candidates', 'run');
  await mkdir(join(sourcePath, '..'), { recursive: true });
  await writeFile(sourcePath, pngHeader(1080, 1920));
  await writeFile(
    workflowPath,
    JSON.stringify({ input: '{{SOURCE_IMAGE}}', prompt: '{{LAYER_PROMPT}}' }),
  );
  await writeFile(manifestPath, `${JSON.stringify(MANIFEST, null, 2)}\n`);
  const manifestBefore = await readFile(manifestPath, 'utf8');
  const selected = selectCandidateLayers(MANIFEST, {
    shotNumber: 3,
    layerIds: ['water'],
  });

  const fetchImpl = async (url) => {
    const value = String(url);
    if (value.endsWith('/upload/image')) {
      return Response.json({ name: 'uploaded-source.png', subfolder: '', type: 'input' });
    }
    if (value.endsWith('/prompt')) {
      return Response.json({ prompt_id: 'prompt-water' });
    }
    if (value.endsWith('/history/prompt-water')) {
      return Response.json({
        'prompt-water': {
          outputs: {
            '9': {
              images: [
                {
                  filename: 'water.png',
                  subfolder: '',
                  type: 'output',
                },
              ],
            },
          },
        },
      });
    }
    if (value.includes('/view?')) {
      return new Response(pngHeader(1080, 1920), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      });
    }
    throw new Error(`Unexpected fetch ${value}`);
  };

  const run = await generateLayerCandidates({
    outputRoot,
    fetchImpl,
    preflight: {
      ok: true,
      manifest: MANIFEST,
      manifestPath,
      workflowPath,
      baseUrl: 'http://comfy.test',
      assetRoot,
      selected,
      checks: [],
      concurrency: 1,
      hardwareTier: 'workstation',
      vramMode: 'normalvram',
    },
    pollIntervalMs: 1,
    timeoutMs: 1000,
  });

  assert.equal(run.candidates.length, 1);
  assert.equal(run.approvalPolicy.manifestMutated, false);
  assert.equal(run.approvalPolicy.automaticPromotionAllowed, false);
  assert.match(run.candidates[0].candidatePath, /tmp.*animation-assets.*candidates/);
  assert.equal(await readFile(manifestPath, 'utf8'), manifestBefore);
});

function layer(id, role, material, hasAlpha) {
  return {
    id,
    path: `project/animation-v1/${id}.png`,
    role,
    material,
    state: 'planned',
    hasAlpha,
    review: { status: 'pending', notes: [] },
  };
}

function pngHeader(width, height) {
  const buffer = Buffer.alloc(24);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}
