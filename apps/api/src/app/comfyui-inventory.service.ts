import { Injectable } from '@nestjs/common';

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
  /(model|ckpt|checkpoint|vae|lora|control|sam|ground|clip|unet|detector|segment|segm|background|removal|biref|depth)/i;

export interface ComfyUiResourceChoice {
  nodeType: string;
  inputName: string;
  values: Array<string | number | boolean>;
}

export interface ComfyUiLayerFamilies {
  segmentation: string[];
  matting: string[];
  backgroundRemoval: string[];
  depth: string[];
  inpaint: string[];
}

export interface ComfyUiInventory {
  schemaVersion: 1;
  baseUrl: string;
  observedAt: string;
  online: boolean;
  error: string | null;
  nodeCount: number;
  nodeTypes: string[];
  layerNodeTypes: string[];
  resources: ComfyUiResourceChoice[];
  families: ComfyUiLayerFamilies;
}

export function summarizeComfyObjectInfo(objectInfo: unknown) {
  const info = isRecord(objectInfo) ? objectInfo : {};
  const nodeTypes = Object.keys(info).sort();
  const layerNodeTypes = nodeTypes.filter((nodeType) => {
    const definition = isRecord(info[nodeType]) ? info[nodeType] : {};
    return isLayerProductionNode(nodeType, definition);
  });
  const resources: ComfyUiResourceChoice[] = [];

  for (const nodeType of nodeTypes) {
    const definition = isRecord(info[nodeType]) ? info[nodeType] : {};
    const input = isRecord(definition['input']) ? definition['input'] : {};
    const required = isRecord(input['required']) ? input['required'] : {};
    const optional = isRecord(input['optional']) ? input['optional'] : {};
    const inputs = { ...required, ...optional };

    for (const [inputName, rawDefinition] of Object.entries(inputs)) {
      if (!RESOURCE_INPUT_PATTERN.test(inputName) || !Array.isArray(rawDefinition)) {
        continue;
      }
      const allowedValues = Array.isArray(rawDefinition[0])
        ? rawDefinition[0].filter(
            (value): value is string | number | boolean =>
              typeof value === 'string' ||
              typeof value === 'number' ||
              typeof value === 'boolean',
          )
        : [];
      if (!allowedValues.length) continue;
      resources.push({ nodeType, inputName, values: allowedValues });
    }
  }

  return {
    nodeCount: nodeTypes.length,
    nodeTypes,
    layerNodeTypes,
    resources,
    families: buildFamilies(layerNodeTypes),
  };
}

@Injectable()
export class ComfyUiInventoryService {
  async getInventory(): Promise<ComfyUiInventory> {
    const baseUrl = (
      process.env.COMFYUI_BASE_URL ?? 'http://127.0.0.1:8188'
    ).replace(/\/$/, '');
    const observedAt = new Date().toISOString();

    try {
      const response = await fetch(`${baseUrl}/object_info`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) {
        return emptyInventory(
          baseUrl,
          observedAt,
          `ComfyUI /object_info returned HTTP ${response.status}.`,
        );
      }

      return {
        schemaVersion: 1,
        baseUrl,
        observedAt,
        online: true,
        error: null,
        ...summarizeComfyObjectInfo(await response.json()),
      };
    } catch (error) {
      return emptyInventory(
        baseUrl,
        observedAt,
        describeComfyFetchFailure(error, baseUrl),
      );
    }
  }
}

function emptyInventory(
  baseUrl: string,
  observedAt: string,
  error: string,
): ComfyUiInventory {
  return {
    schemaVersion: 1,
    baseUrl,
    observedAt,
    online: false,
    error,
    nodeCount: 0,
    nodeTypes: [],
    layerNodeTypes: [],
    resources: [],
    families: buildFamilies([]),
  };
}

function isLayerProductionNode(
  nodeType: string,
  definition: Record<string, unknown>,
): boolean {
  const searchable = [
    nodeType,
    definition['display_name'],
    definition['category'],
  ]
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

function buildFamilies(nodeTypes: string[]): ComfyUiLayerFamilies {
  return {
    segmentation: nodeTypes.filter((value) => SEGMENTATION_NODE_PATTERN.test(value)),
    matting: nodeTypes.filter((value) => MATTING_NODE_PATTERN.test(value)),
    backgroundRemoval: nodeTypes.filter((value) =>
      BACKGROUND_REMOVAL_NODE_PATTERN.test(value),
    ),
    depth: nodeTypes.filter((value) => DEPTH_NODE_PATTERN.test(value)),
    inpaint: nodeTypes.filter((value) => INPAINT_NODE_PATTERN.test(value)),
  };
}

function describeComfyFetchFailure(error: unknown, baseUrl: string): string {
  if (!(error instanceof Error)) {
    return `ComfyUI is not reachable at ${baseUrl}.`;
  }
  const cause = (
    error as Error & { cause?: { code?: string; message?: string } }
  ).cause;
  const detail = cause?.code ?? cause?.message ?? error.message;
  return `ComfyUI is not reachable at ${baseUrl}: ${detail}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
