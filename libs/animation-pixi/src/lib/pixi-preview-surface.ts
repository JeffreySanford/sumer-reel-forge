export const PIXI_PREVIEW_RENDER_MODE = 'manual-exact-frame' as const;

export type PixiRenderNodeKind = 'environment' | 'prop' | 'actor';

export interface PixiRenderNode {
  readonly id: string;
  readonly label: string;
  readonly kind: PixiRenderNodeKind;
  readonly x: number;
  readonly y: number;
  readonly opacity: number;
  readonly proofState?: string;
}

export interface PixiRenderFrame {
  readonly frame: number;
  readonly width: number;
  readonly height: number;
  readonly nodeCount: number;
  readonly nodes: readonly PixiRenderNode[];
}

export interface PixiPreviewApplicationOptions {
  readonly width: number;
  readonly height: number;
  readonly autoStart: false;
  readonly sharedTicker: false;
  readonly antialias: false;
  readonly backgroundColor: number;
  readonly backgroundAlpha: 1;
  readonly resolution: 1;
  readonly preference: 'webgl';
}

export interface PixiPreviewSurface {
  readonly canvas: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
  readonly renderMode: typeof PIXI_PREVIEW_RENDER_MODE;
  render(frame: PixiRenderFrame): void;
  destroy(): void;
}

type DestroyableChild = {
  destroy(): void;
};

type PixiGraphicsLike = DestroyableChild & {
  alpha: number;
  rect(x: number, y: number, width: number, height: number): PixiGraphicsLike;
  roundRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): PixiGraphicsLike;
  circle(x: number, y: number, radius: number): PixiGraphicsLike;
  moveTo(x: number, y: number): PixiGraphicsLike;
  lineTo(x: number, y: number): PixiGraphicsLike;
  fill(style: number | { readonly color: number; readonly alpha?: number }): PixiGraphicsLike;
  stroke(
    style: number | { readonly color: number; readonly width?: number; readonly alpha?: number },
  ): PixiGraphicsLike;
};

type PixiGraphicsConstructor = new () => PixiGraphicsLike;

type PixiStageLike = {
  addChild(...children: DestroyableChild[]): unknown;
  removeChildren(): DestroyableChild[];
};

type PixiApplicationLike = {
  readonly canvas: HTMLCanvasElement;
  readonly stage: PixiStageLike;
  readonly ticker: { stop(): void };
  readonly renderer: {
    render(options: { readonly container: PixiStageLike }): void;
  };
  init(options: PixiPreviewApplicationOptions): Promise<void>;
  destroy(removeView: boolean, options: { readonly children: boolean }): void;
};

type PixiApplicationConstructor = new () => PixiApplicationLike;

function assertViewportDimension(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
    throw new Error(`Pixi preview ${label} must be a positive integer.`);
  }
  return value;
}

function assertFrameNumber(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('Pixi preview frame must be a non-negative integer.');
  }
  return value;
}

export function buildPixiApplicationOptions(
  width: number,
  height: number,
): PixiPreviewApplicationOptions {
  return Object.freeze({
    width: assertViewportDimension(width, 'width'),
    height: assertViewportDimension(height, 'height'),
    autoStart: false,
    sharedTicker: false,
    antialias: false,
    backgroundColor: 0x05080d,
    backgroundAlpha: 1,
    resolution: 1,
    preference: 'webgl',
  });
}

function lineWidth(frame: PixiRenderFrame, scale = 1): number {
  return Math.max(1, (frame.width / 700) * scale);
}

function destroyStageChildren(stage: PixiStageLike): void {
  for (const child of stage.removeChildren()) child.destroy();
}

function assertCompatibleFrame(frame: PixiRenderFrame, width: number, height: number): void {
  assertFrameNumber(frame.frame);
  if (frame.width !== width || frame.height !== height) {
    throw new Error(
      `Pixi preview frame viewport ${frame.width}x${frame.height} does not match surface ${width}x${height}.`,
    );
  }
  if (frame.nodeCount !== frame.nodes.length) {
    throw new Error(
      `Pixi preview frame nodeCount ${frame.nodeCount} does not match ${frame.nodes.length} nodes.`,
    );
  }
}

function drawFrame(
  app: PixiApplicationLike,
  Graphics: PixiGraphicsConstructor,
  frame: PixiRenderFrame,
): void {
  destroyStageChildren(app.stage);

  const camera = new Graphics()
    .rect(frame.width * 0.04, frame.height * 0.025, frame.width * 0.92, frame.height * 0.95)
    .stroke({ color: 0x30363d, width: lineWidth(frame, 0.8) });
  app.stage.addChild(camera);

  for (const node of frame.nodes) {
    if (node.kind === 'environment') {
      const environment = new Graphics()
        .roundRect(
          frame.width * 0.06,
          node.y,
          frame.width * 0.88,
          frame.height * 0.2475,
          frame.width * 0.02,
        )
        .fill({ color: 0x388bfd, alpha: 0.13 })
        .stroke({ color: 0x388bfd, width: lineWidth(frame, 0.55) });
      environment.alpha = node.opacity;
      app.stage.addChild(environment);
      continue;
    }

    if (node.kind === 'prop') {
      const prop = new Graphics()
        .roundRect(
          node.x - frame.width * 0.12,
          node.y - frame.height * 0.0225,
          frame.width * 0.24,
          frame.height * 0.045,
          frame.width * 0.018,
        )
        .fill({ color: 0xd29922, alpha: 0.2 })
        .stroke({ color: 0xd29922, width: lineWidth(frame, 0.7) })
        .moveTo(node.x - frame.width * 0.15, node.y + frame.height * 0.034)
        .lineTo(node.x + frame.width * 0.15, node.y + frame.height * 0.034)
        .stroke({ color: 0x8b949e, width: lineWidth(frame, 0.4) });
      prop.alpha = node.opacity;
      app.stage.addChild(prop);
      continue;
    }

    const actor = new Graphics()
      .circle(node.x, node.y, frame.width * 0.045)
      .fill({ color: 0x3fb950, alpha: 0.25 })
      .stroke({ color: 0x3fb950, width: lineWidth(frame, 0.8) })
      .moveTo(node.x, node.y + frame.width * 0.05)
      .lineTo(node.x, node.y + frame.width * 0.14)
      .stroke({ color: 0x3fb950, width: lineWidth(frame, 0.7) });

    if (node.proofState) {
      actor
        .circle(node.x, node.y, frame.width * 0.08)
        .stroke({ color: 0xd2a8ff, width: lineWidth(frame, 0.8), alpha: 0.9 });
    }

    actor.alpha = node.opacity;
    app.stage.addChild(actor);
  }

  app.renderer.render({ container: app.stage });
  app.canvas.setAttribute('aria-label', `Pixi runtime preview at frame ${frame.frame}`);
  app.canvas.setAttribute('data-pixi-frame', String(frame.frame));
  app.canvas.setAttribute('data-pixi-node-count', String(frame.nodeCount));
}

export async function createPixiPreviewSurface(
  width: number,
  height: number,
): Promise<PixiPreviewSurface> {
  const options = buildPixiApplicationOptions(width, height);
  const pixi = await import('pixi.js');
  const Application = pixi.Application as unknown as PixiApplicationConstructor;
  const Graphics = pixi.Graphics as unknown as PixiGraphicsConstructor;
  const app = new Application();
  await app.init(options);
  app.ticker.stop();

  app.canvas.setAttribute('role', 'img');
  app.canvas.setAttribute('data-pixi-canvas', 'true');
  app.canvas.setAttribute('data-pixi-render-mode', PIXI_PREVIEW_RENDER_MODE);
  app.canvas.setAttribute('data-viewport-width', String(options.width));
  app.canvas.setAttribute('data-viewport-height', String(options.height));

  let destroyed = false;

  return Object.freeze({
    canvas: app.canvas,
    width: options.width,
    height: options.height,
    renderMode: PIXI_PREVIEW_RENDER_MODE,
    render(frame: PixiRenderFrame): void {
      if (destroyed) throw new Error('Pixi preview surface is already destroyed.');
      assertCompatibleFrame(frame, options.width, options.height);
      drawFrame(app, Graphics, frame);
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      app.destroy(true, { children: true });
    },
  });
}
