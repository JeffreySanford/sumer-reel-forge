import { Injectable } from '@nestjs/common';

const LAYER_NODE_PATTERN =
  /(sam|segment|mask|matting|rembg|remove.?background|background.?remove|biref|grounding|florence|clip.?seg|transparent|alpha|depth|inpaint)/i;
const RESOURCE_INPUT_PATTERN =
  /(model|ckpt|checkpoint|vae|lora|control|sam|ground|clip|unet|detector|segment|segm)/i;

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
    return LAYER_NODE_PATTERN.test(
      [nodeType, definition['display_name'], definition['category']]
        .filter(Boolean)
        .join(' '),
    );
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

function buildFamilies(nodeTypes: string[]): ComfyUiLayerFamilies {
  return {
    segmentation: nodeTypes.filter((value) =>
      /(sam|segment|grounding|florence|clip.?seg)/i.test(value),
    ),
    matting: nodeTypes.filter((value) => /(matting|alpha|transparent)/i.test(value)),
    backgroundRemoval: nodeTypes.filter((value) =>
      /(rembg|remove.?background|background.?remove|biref)/i.test(value),
    ),
    depth: nodeTypes.filter((value) => /depth/i.test(value)),
    inpaint: nodeTypes.filter((value) => /inpaint/i.test(value)),
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
