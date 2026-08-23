import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fetchComfyHostInventory,
  summarizeComfyObjectInfo,
} from './comfyui-host-inventory.mjs';

const OBJECT_INFO = {
  CheckpointLoaderSimple: {
    category: 'loaders',
    input: {
      required: {
        ckpt_name: [['cinematic.safetensors', 'fast.safetensors']],
      },
    },
  },
  GroundingDinoSAMSegment: {
    display_name: 'GroundingDINO + SAM Segment',
    category: 'segmentation',
    input: {
      required: {
        sam_model: [['sam_vit_h.pth']],
        detector_model: [['groundingdino_swint_ogc.pth']],
        prompt: ['STRING'],
      },
    },
  },
  ImageRemoveBackground: {
    category: 'mask/background',
    input: {
      required: {
        image: ['IMAGE'],
        model: [['BiRefNet-general', 'RMBG-2.0']],
      },
    },
  },
  SaveImage: {
    category: 'image',
    input: {
      required: {
        filename_prefix: ['STRING'],
      },
    },
  },
};

test('summarizes likely layer-production nodes and installed resource choices', () => {
  const result = summarizeComfyObjectInfo(OBJECT_INFO);

  assert.equal(result.nodeCount, 4);
  assert.deepEqual(result.layerNodeTypes, [
    'GroundingDinoSAMSegment',
    'ImageRemoveBackground',
  ]);
  assert.deepEqual(
    result.resources.map((item) => [item.nodeType, item.inputName]),
    [
      ['CheckpointLoaderSimple', 'ckpt_name'],
      ['GroundingDinoSAMSegment', 'sam_model'],
      ['GroundingDinoSAMSegment', 'detector_model'],
      ['ImageRemoveBackground', 'model'],
    ],
  );
});

test('fetches object_info only and returns a portable host inventory', async () => {
  const requested = [];
  const result = await fetchComfyHostInventory({
    baseUrl: 'http://comfy.test/',
    fetchImpl: async (url) => {
      requested.push(String(url));
      return Response.json(OBJECT_INFO);
    },
  });

  assert.deepEqual(requested, ['http://comfy.test/object_info']);
  assert.equal(result.baseUrl, 'http://comfy.test');
  assert.equal(result.nodeCount, 4);
  assert.equal(result.layerNodeTypes.includes('GroundingDinoSAMSegment'), true);
});
