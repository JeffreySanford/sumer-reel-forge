import {
  buildPixiContainedWaterMaterialState,
  type PixiContainedWaterMaterialBinding,
  type PixiRenderFrame,
  type PixiSourceAsset,
} from '@sumer-reel-forge/animation-pixi';
import type { RuntimePreviewModel, RuntimePreviewNode } from './runtime-preview';

export interface PixiPreviewTiming {
  readonly fps: number;
  readonly durationFrames: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function projectX(node: RuntimePreviewNode, width: number): number {
  const normalized = clamp(12 + node.x * 7, 8, 92);
  return (normalized / 100) * width;
}

function projectY(node: RuntimePreviewNode, height: number): number {
  const baseHeight = 177.778;
  if (node.kind === 'environment') return (126 / baseHeight) * height;

  if (node.kind === 'prop') {
    const normalized = clamp(112 - node.y * 3, 85, 125);
    return (normalized / baseHeight) * height;
  }

  const normalized = clamp(80 - node.y * 3, 40, 105);
  return (normalized / baseHeight) * height;
}

function assertViewportDimension(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
    throw new Error(`Pixi preview ${label} must be a positive integer.`);
  }
  return value;
}

function buildMaterialStates(
  frame: number,
  bindings: readonly PixiContainedWaterMaterialBinding[],
  timing: PixiPreviewTiming | undefined,
) {
  if (bindings.length === 0) return Object.freeze([]);
  if (!timing) {
    throw new Error('Pixi material bindings require exact fps and durationFrames timing.');
  }

  return Object.freeze(
    bindings.map((binding) =>
      buildPixiContainedWaterMaterialState(binding, {
        frame,
        fps: timing.fps,
        durationFrames: timing.durationFrames,
      }),
    ),
  );
}

export function buildPixiPreviewPlan(
  model: RuntimePreviewModel,
  width: number,
  height: number,
  sourceAssets: readonly PixiSourceAsset[] = [],
  materialBindings: readonly PixiContainedWaterMaterialBinding[] = [],
  timing?: PixiPreviewTiming,
  includeDiagnosticNodes = false,
): PixiRenderFrame {
  const resolvedWidth = assertViewportDimension(width, 'width');
  const resolvedHeight = assertViewportDimension(height, 'height');

  // Artwork review is the default: source-backed composition only. Runtime
  // diagnostics remain available in the inspection table and may be projected
  // into Pixi explicitly for engineering-focused tests or specialist views.
  const nodes = includeDiagnosticNodes
    ? model.nodes.map((node) =>
        Object.freeze({
          id: node.id,
          label: node.label,
          kind: node.kind,
          x: projectX(node, resolvedWidth),
          y: projectY(node, resolvedHeight),
          opacity: node.opacity,
          ...(node.proofState ? { proofState: node.proofState } : {}),
        }),
      )
    : [];

  return Object.freeze({
    frame: model.frame,
    width: resolvedWidth,
    height: resolvedHeight,
    nodeCount: nodes.length,
    nodes: Object.freeze(nodes),
    sourceAssets: Object.freeze(sourceAssets.map((asset) => Object.freeze({ ...asset }))),
    materials: buildMaterialStates(model.frame, materialBindings, timing),
  });
}
