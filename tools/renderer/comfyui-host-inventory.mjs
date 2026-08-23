const SEGMENTATION_NODE_PATTERN =
  /(^SAM\d|segment|grounding|florence|clip.?seg|RTDETR_detect|CreateBoundingBoxes|CropByBBoxes|LayersFromBoundingBoxes)/i;
const BACKGROUND_REMOVAL_NODE_PATTERN =
  /(remove.?background|background.?removal|biref|green.?screen)/i;
const MATTING_NODE_PATTERN =
  /(matting|transparent|alpha|JoinImageWithAlpha|SplitImageWithAlpha)/i;
const DEPTH_NODE_PATTERN = /(depth|DA3Inference|MoGeInference|MoGePanoramaInference)/i;
const INPAINT_NODE_PATTERN =
  /(inpaint|eraser|genfill|gen.?fill|expandimage|expand.?image|FluxErase|FluxProFill)/i;
const MASK_OPERATION_NODE_PATTERN =
  /(^BatchMasksNode$|^CropMask$|^FeatherMask$|^GrowMask$|^ImageColorToMask$|^ImageCompositeMasked$|^ImageToMask$|^InvertMask$|^LatentCompositeMasked$|^LoadImageMask$|^MaskComposite$|^MaskPreview$|^MaskToImage$|^MediaPipeFaceMask$|^ResizeImageMaskNode$|^SetLatentNoiseMask$|^SolidMask$|^ThresholdMask$|^VAEEncodeForInpaint$|^ConditioningSetMask$)/i;
const RESOURCE_INPUT_PATTERN =
  /(model|ckpt|checkpoint|vae|lora|control|ground|clip|unet|detector|segment|segm|background|removal|biref|depth)/i;
const SAM_RESOURCE_INPUT_PATTERN =
  /(^sam$|^sam_|_sam$|sam_model|sam_checkpoint|sam_ckpt)/i;

function isLayerProductionNode(nodeType, definition = {}) {
  const searchable = [nodeType, definition.display_name, definition.category]
    .filter(Boolean)
    .join(' ');

  return (
    SEGMENTATION_NODE_PATTERN.test(searchable) ||
    BACKGROUND_REMOVAL_NODE_PATTERN.test(searchable) ||
    MATTING_NODE_PATTERN.test(searchable) ||
    DEPTH_NODE_PATTERN.test(searchable) ||
    INPAINT_NODE_PATTERN.test(searchable) ||
    MASK_OPERATION_NODE_PATTERN.test(nodeType)
  );
}

export function summarizeComfyObjectInfo(objectInfo) {
  const info = objectInfo && typeof objectInfo === 'object' ? objectInfo : {};
  const nodeTypes = Object.keys(info).sort();
  const layerNodeTypes = nodeTypes.filter((nodeType) =>
    isLayerProductionNode(nodeType, info[nodeType] ?? {}),
  );
  const resources = [];

  for (const nodeType of nodeTypes) {
    const definition = info[nodeType] ?? {};
    const inputs = {
      ...(definition.input?.required ?? {}),
      ...(definition.input?.optional ?? {}),
    };
    for (const [inputName, inputDefinition] of Object.entries(inputs)) {
      if (
        !RESOURCE_INPUT_PATTERN.test(inputName) &&
        !SAM_RESOURCE_INPUT_PATTERN.test(inputName)
      ) {
        continue;
      }
      const allowedValues = Array.isArray(inputDefinition?.[0])
        ? inputDefinition[0].filter(
            (value) =>
              typeof value === 'string' ||
              typeof value === 'number' ||
              typeof value === 'boolean',
          )
        : undefined;
      if (!allowedValues?.length) continue;
      resources.push({
        nodeType,
        inputName,
        values: allowedValues,
      });
    }
  }

  return {
    nodeCount: nodeTypes.length,
    nodeTypes,
    layerNodeTypes,
    resources,
  };
}

export async function fetchComfyHostInventory({
  baseUrl = 'http://127.0.0.1:8188',
  fetchImpl = globalThis.fetch,
  timeoutMs = 5_000,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch is unavailable.');
  }
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  const response = await fetchImpl(`${normalizedBaseUrl}/object_info`, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(
      `ComfyUI /object_info returned HTTP ${response.status}: ${await response.text()}`,
    );
  }
  return {
    baseUrl: normalizedBaseUrl,
    observedAt: new Date().toISOString(),
    ...summarizeComfyObjectInfo(await response.json()),
  };
}
