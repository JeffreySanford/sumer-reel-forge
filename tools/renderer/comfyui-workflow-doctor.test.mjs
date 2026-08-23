import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  checkWorkflowHostCompatibility,
  compareWorkflowToObjectInfo,
  inspectWorkflowTemplate,
} from './comfyui-workflow-doctor.mjs';

const WORKFLOW = {
  '1': {
    class_type: 'LoadImage',
    inputs: { image: '{{SOURCE_IMAGE}}' },
  },
  '2': {
    class_type: 'CLIPTextEncode',
    inputs: { text: '{{LAYER_PROMPT}}' },
  },
  '3': {
    class_type: 'CheckpointLoaderSimple',
    inputs: { ckpt_name: 'approved-model.safetensors' },
  },
  '4': {
    class_type: 'SaveImage',
    inputs: { filename_prefix: '{{OUTPUT_PREFIX}}' },
  },
};

const OBJECT_INFO = {
  LoadImage: {
    input: { required: { image: [['example.png'], { image_upload: true }] } },
  },
  CLIPTextEncode: {
    input: { required: { text: ['STRING', { multiline: true }] } },
  },
  CheckpointLoaderSimple: {
    input: {
      required: {
        ckpt_name: [['approved-model.safetensors', 'alternate.safetensors']],
      },
    },
  },
  SaveImage: {
    input: { required: { filename_prefix: ['STRING'] } },
  },
};

test('accepts an API-format layer workflow with required Reel Forge tokens', () => {
  const result = inspectWorkflowTemplate(WORKFLOW);

  assert.equal(result.ok, true);
  assert.equal(result.nodeCount, 4);
  assert.deepEqual(result.nodeTypes, [
    'CLIPTextEncode',
    'CheckpointLoaderSimple',
    'LoadImage',
    'SaveImage',
  ]);
  assert.deepEqual(result.tokenCoverage, {
    sourceImage: true,
    layerPrompt: true,
    outputPrefix: true,
  });
});

test('rejects normal UI-style JSON that has no API class_type nodes', () => {
  const result = inspectWorkflowTemplate({
    nodes: [],
    source: '{{SOURCE_IMAGE}}',
    prompt: '{{LAYER_PROMPT}}',
    output: '{{OUTPUT_PREFIX}}',
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /API format/i);
});

test('reports missing custom nodes before generation', () => {
  const workflow = structuredClone(WORKFLOW);
  workflow['5'] = {
    class_type: 'ExampleMissingSegmentationNode',
    inputs: {},
  };

  const result = compareWorkflowToObjectInfo(workflow, OBJECT_INFO);

  assert.equal(result.ok, false);
  assert.deepEqual(result.missingNodeTypes, ['ExampleMissingSegmentationNode']);
});

test('reports checkpoint or model selections unavailable on the current host', () => {
  const workflow = structuredClone(WORKFLOW);
  workflow['3'].inputs.ckpt_name = 'missing-model.safetensors';

  const result = compareWorkflowToObjectInfo(workflow, OBJECT_INFO);

  assert.equal(result.ok, false);
  assert.equal(result.unavailableSelections.length, 1);
  assert.deepEqual(result.unavailableSelections[0], {
    nodeId: '3',
    nodeType: 'CheckpointLoaderSimple',
    inputName: 'ckpt_name',
    configuredValue: 'missing-model.safetensors',
    availableValues: ['approved-model.safetensors', 'alternate.safetensors'],
  });
});

test('does not treat Reel Forge replacement tokens as missing host selections', () => {
  const result = compareWorkflowToObjectInfo(WORKFLOW, OBJECT_INFO);

  assert.equal(result.ok, true);
  assert.equal(result.unavailableSelections.length, 0);
});

test('checks a saved workflow against live ComfyUI object_info without running it', async () => {
  const root = await mkdtemp(join(os.tmpdir(), 'srf-comfy-doctor-'));
  const workflowPath = join(root, 'layer-workflow.json');
  await writeFile(workflowPath, JSON.stringify(WORKFLOW));

  const requested = [];
  const result = await checkWorkflowHostCompatibility({
    workflowPath,
    baseUrl: 'http://comfy.test',
    fetchImpl: async (url) => {
      requested.push(String(url));
      return Response.json(OBJECT_INFO);
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(requested, ['http://comfy.test/object_info']);
});
