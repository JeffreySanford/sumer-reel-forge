import { readFile } from 'node:fs/promises';

const TOKEN_PATTERN = /\{\{[A-Z0-9_]+\}\}/;

export function inspectWorkflowTemplate(workflow) {
  const errors = [];
  if (!workflow || typeof workflow !== 'object' || Array.isArray(workflow)) {
    return {
      ok: false,
      nodeCount: 0,
      nodeTypes: [],
      tokenCoverage: emptyTokenCoverage(),
      errors: ['Workflow must be a ComfyUI API-format object.'],
    };
  }

  const nodes = Object.values(workflow).filter(
    (node) => node && typeof node === 'object' && typeof node.class_type === 'string',
  );
  const nodeTypes = [...new Set(nodes.map((node) => node.class_type))].sort();
  const serialized = JSON.stringify(workflow);
  const tokenCoverage = {
    sourceImage: serialized.includes('{{SOURCE_IMAGE}}'),
    layerPrompt:
      serialized.includes('{{LAYER_PROMPT}}') || serialized.includes('{{PROMPT}}'),
    outputPrefix: serialized.includes('{{OUTPUT_PREFIX}}'),
  };

  if (!nodes.length) {
    errors.push(
      'Workflow contains no API nodes with class_type. Export it from ComfyUI using API format, not the normal UI workflow JSON.',
    );
  }
  if (!tokenCoverage.sourceImage) {
    errors.push('Workflow is missing {{SOURCE_IMAGE}}.');
  }
  if (!tokenCoverage.layerPrompt) {
    errors.push('Workflow is missing {{LAYER_PROMPT}} or {{PROMPT}}.');
  }
  if (!tokenCoverage.outputPrefix) {
    errors.push('Workflow is missing {{OUTPUT_PREFIX}}.');
  }

  return {
    ok: errors.length === 0,
    nodeCount: nodes.length,
    nodeTypes,
    tokenCoverage,
    errors,
  };
}

export function compareWorkflowToObjectInfo(workflow, objectInfo) {
  const inspection = inspectWorkflowTemplate(workflow);
  const hostInfo = objectInfo && typeof objectInfo === 'object' ? objectInfo : {};
  const missingNodeTypes = inspection.nodeTypes.filter((nodeType) => !hostInfo[nodeType]);
  const unavailableSelections = [];

  if (inspection.ok) {
    for (const [nodeId, node] of Object.entries(workflow)) {
      if (!node || typeof node !== 'object' || typeof node.class_type !== 'string') continue;
      const definition = hostInfo[node.class_type];
      if (!definition) continue;
      const definitions = {
        ...(definition.input?.required ?? {}),
        ...(definition.input?.optional ?? {}),
      };
      for (const [inputName, value] of Object.entries(node.inputs ?? {})) {
        if (typeof value !== 'string' || TOKEN_PATTERN.test(value)) continue;
        const inputDefinition = definitions[inputName];
        const allowedValues = Array.isArray(inputDefinition?.[0])
          ? inputDefinition[0]
          : undefined;
        if (allowedValues && !allowedValues.includes(value)) {
          unavailableSelections.push({
            nodeId,
            nodeType: node.class_type,
            inputName,
            configuredValue: value,
            availableValues: allowedValues,
          });
        }
      }
    }
  }

  return {
    ...inspection,
    ok:
      inspection.ok &&
      missingNodeTypes.length === 0 &&
      unavailableSelections.length === 0,
    missingNodeTypes,
    unavailableSelections,
  };
}

export async function checkWorkflowHostCompatibility({
  workflowPath,
  baseUrl = 'http://127.0.0.1:8188',
  fetchImpl = globalThis.fetch,
  timeoutMs = 5_000,
}) {
  if (!workflowPath) {
    return {
      ok: false,
      workflowPath: null,
      baseUrl,
      errors: ['COMFYUI_LAYER_WORKFLOW_PATH is not set.'],
      nodeCount: 0,
      nodeTypes: [],
      tokenCoverage: emptyTokenCoverage(),
      missingNodeTypes: [],
      unavailableSelections: [],
    };
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch is unavailable.');
  }

  let workflow;
  try {
    workflow = JSON.parse(await readFile(workflowPath, 'utf8'));
  } catch (error) {
    return {
      ok: false,
      workflowPath,
      baseUrl,
      errors: [error instanceof Error ? error.message : String(error)],
      nodeCount: 0,
      nodeTypes: [],
      tokenCoverage: emptyTokenCoverage(),
      missingNodeTypes: [],
      unavailableSelections: [],
    };
  }

  const inspection = inspectWorkflowTemplate(workflow);
  if (!inspection.ok) {
    return {
      ...inspection,
      workflowPath,
      baseUrl,
      missingNodeTypes: [],
      unavailableSelections: [],
    };
  }

  try {
    const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/object_info`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      return {
        ...inspection,
        ok: false,
        workflowPath,
        baseUrl,
        errors: [...inspection.errors, `ComfyUI /object_info returned HTTP ${response.status}.`],
        missingNodeTypes: [],
        unavailableSelections: [],
      };
    }
    const objectInfo = await response.json();
    return {
      ...compareWorkflowToObjectInfo(workflow, objectInfo),
      workflowPath,
      baseUrl,
    };
  } catch (error) {
    return {
      ...inspection,
      ok: false,
      workflowPath,
      baseUrl,
      errors: [
        ...inspection.errors,
        `Unable to inspect ComfyUI host: ${error instanceof Error ? error.message : String(error)}`,
      ],
      missingNodeTypes: [],
      unavailableSelections: [],
    };
  }
}

function emptyTokenCoverage() {
  return {
    sourceImage: false,
    layerPrompt: false,
    outputPrefix: false,
  };
}
