const LAYER_NODE_PATTERN =
  /(sam|segment|mask|matting|rembg|remove.?background|background.?remove|biref|grounding|florence|clip.?seg|transparent|alpha|depth|inpaint)/i;
const RESOURCE_INPUT_PATTERN =
  /(model|ckpt|checkpoint|vae|lora|control|sam|ground|clip|unet|detector|segment|segm)/i;

export function summarizeComfyObjectInfo(objectInfo) {
  const info = objectInfo && typeof objectInfo === 'object' ? objectInfo : {};
  const nodeTypes = Object.keys(info).sort();
  const layerNodeTypes = nodeTypes.filter((nodeType) => {
    const definition = info[nodeType] ?? {};
    return LAYER_NODE_PATTERN.test(
      [nodeType, definition.display_name, definition.category]
        .filter(Boolean)
        .join(' '),
    );
  });
  const resources = [];

  for (const nodeType of nodeTypes) {
    const definition = info[nodeType] ?? {};
    const inputs = {
      ...(definition.input?.required ?? {}),
      ...(definition.input?.optional ?? {}),
    };
    for (const [inputName, inputDefinition] of Object.entries(inputs)) {
      if (!RESOURCE_INPUT_PATTERN.test(inputName)) continue;
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
