import type { PixiMaterialFrameState } from './pixi-water-material';

export const PIXI_PREVIEW_RENDER_MODE = 'manual-exact-frame' as const;

export type PixiRenderNodeKind = 'environment' | 'prop' | 'actor';
export type PixiSourceAssetRegistration = 'cover-center';

export interface PixiSourceAsset {
  readonly id: string;
  readonly role: string;
  readonly url: string;
  readonly sha256: string;
  /** Intrinsic source-space pixel width, before output registration. */
  readonly width: number;
  /** Intrinsic source-space pixel height, before output registration. */
  readonly height: number;
  readonly registration: PixiSourceAssetRegistration;
}

export interface PixiSourceRegistrationRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
}

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
  readonly sourceAssets: readonly PixiSourceAsset[];
  readonly materials: readonly PixiMaterialFrameState[];
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
  readonly sourceAssetCount: number;
  render(frame: PixiRenderFrame): void;
  destroy(): void;
}

type DestroyableChild = {
  destroy(): void;
};

type PixiSpriteLike = DestroyableChild & {
  alpha: number;
  width: number;
  height: number;
  x: number;
  y: number;
  setMask(options: { readonly mask: PixiSpriteLike; readonly channel: 'alpha' }): void;
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
  ellipse(x: number, y: number, halfWidth: number, halfHeight: number): PixiGraphicsLike;
  moveTo(x: number, y: number): PixiGraphicsLike;
  lineTo(x: number, y: number): PixiGraphicsLike;
  fill(style: number | { readonly color: number; readonly alpha?: number }): PixiGraphicsLike;
  stroke(
    style: number | { readonly color: number; readonly width?: number; readonly alpha?: number },
  ): PixiGraphicsLike;
  setMask(options: { readonly mask: PixiSpriteLike; readonly channel: 'alpha' }): void;
};

type PixiGraphicsConstructor = new () => PixiGraphicsLike;

type PixiTextureLike = DestroyableChild;

type PixiTextureFactory = {
  from(source: HTMLImageElement): PixiTextureLike;
};

type PixiSpriteConstructor = new (texture: PixiTextureLike) => PixiSpriteLike;

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

type PreparedSourceAsset = {
  readonly asset: PixiSourceAsset;
  readonly normalizedSha256: string;
  readonly texture: PixiTextureLike;
  readonly registrationRect: PixiSourceRegistrationRect;
};

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

export function normalizePixiSourceAssetSha256(value: string): string {
  const normalized = value.startsWith('sha256:') ? value.slice('sha256:'.length) : value;
  if (!/^[a-f0-9]{64}$/i.test(normalized)) {
    throw new Error('Pixi source asset sha256 must contain exactly 64 hexadecimal characters.');
  }
  return normalized.toLowerCase();
}

export function assertPixiSourceAssetHttpResponse(
  asset: Pick<PixiSourceAsset, 'id'>,
  ok: boolean,
  status: number,
): void {
  if (!ok) {
    throw new Error(`Pixi source asset ${asset.id} failed to load with HTTP ${status}.`);
  }
}

export function assertPixiSourceAssetDigest(
  asset: Pick<PixiSourceAsset, 'id' | 'sha256'>,
  actualSha256: string,
): string {
  const expected = normalizePixiSourceAssetSha256(asset.sha256);
  const actual = normalizePixiSourceAssetSha256(actualSha256);
  if (actual !== expected) {
    throw new Error(
      `Pixi source asset ${asset.id} checksum mismatch: expected ${expected}, received ${actual}.`,
    );
  }
  return actual;
}

export function buildPixiSourceRegistration(
  asset: Pick<PixiSourceAsset, 'id' | 'width' | 'height' | 'registration'>,
  outputWidth: number,
  outputHeight: number,
): PixiSourceRegistrationRect {
  const width = assertViewportDimension(outputWidth, 'registration output width');
  const height = assertViewportDimension(outputHeight, 'registration output height');
  const sourceWidth = assertViewportDimension(asset.width, `${asset.id} source width`);
  const sourceHeight = assertViewportDimension(asset.height, `${asset.id} source height`);

  if (asset.registration !== 'cover-center') {
    throw new Error(`Unsupported Pixi source registration ${String(asset.registration)} for ${asset.id}.`);
  }

  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const registeredWidth = sourceWidth * scale;
  const registeredHeight = sourceHeight * scale;

  return Object.freeze({
    x: (width - registeredWidth) / 2,
    y: (height - registeredHeight) / 2,
    width: registeredWidth,
    height: registeredHeight,
    scale,
  });
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

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, '0')).join('');
}

async function verifySourceAssetBytes(asset: PixiSourceAsset, bytes: ArrayBuffer): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error(`Pixi source asset ${asset.id} cannot be verified because Web Crypto is unavailable.`);
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return assertPixiSourceAssetDigest(asset, bytesToHex(digest));
}

function assertSourceAssetIdentity(
  asset: PixiSourceAsset,
  width: number,
  height: number,
): PixiSourceRegistrationRect {
  if (!asset.id.trim()) throw new Error('Pixi source asset id must not be empty.');
  if (!asset.url.trim()) throw new Error(`Pixi source asset ${asset.id} URL must not be empty.`);
  normalizePixiSourceAssetSha256(asset.sha256);
  return buildPixiSourceRegistration(asset, width, height);
}

async function decodeVerifiedSourceAsset(
  asset: PixiSourceAsset,
  Texture: PixiTextureFactory,
  width: number,
  height: number,
): Promise<PreparedSourceAsset> {
  const registrationRect = assertSourceAssetIdentity(asset, width, height);

  const response = await fetch(asset.url, { cache: 'no-store' });
  assertPixiSourceAssetHttpResponse(asset, response.ok, response.status);

  const bytes = await response.arrayBuffer();
  const normalizedSha256 = await verifySourceAssetBytes(asset, bytes);
  const blobUrl = URL.createObjectURL(
    new Blob([bytes], { type: response.headers.get('content-type') ?? 'image/png' }),
  );

  try {
    const image = new Image();
    const loaded = new Promise<void>((resolve, reject) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener(
        'error',
        () => reject(new Error(`Pixi source asset ${asset.id} could not be decoded as an image.`)),
        { once: true },
      );
    });
    image.src = blobUrl;
    await loaded;

    if (image.naturalWidth !== asset.width || image.naturalHeight !== asset.height) {
      throw new Error(
        `Pixi source asset ${asset.id} decoded as ${image.naturalWidth}x${image.naturalHeight}, expected source ${asset.width}x${asset.height}.`,
      );
    }

    return Object.freeze({
      asset: Object.freeze({ ...asset }),
      normalizedSha256,
      texture: Texture.from(image),
      registrationRect,
    });
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

function assertMaterialStates(
  frame: PixiRenderFrame,
  preparedSourceAssets: readonly PreparedSourceAsset[],
): void {
  const assetIds = new Set(preparedSourceAssets.map((prepared) => prepared.asset.id));
  const materialIds = new Set<string>();
  const materialAssetIds = new Set<string>();

  for (const material of frame.materials) {
    if (!material.id.trim()) throw new Error('Pixi material id must not be empty.');
    if (materialIds.has(material.id)) throw new Error(`Duplicate Pixi material id ${material.id}.`);
    materialIds.add(material.id);

    if (!assetIds.has(material.assetId)) {
      throw new Error(`Pixi material ${material.id} references unknown source asset ${material.assetId}.`);
    }
    if (materialAssetIds.has(material.assetId)) {
      throw new Error(`Pixi source asset ${material.assetId} has more than one material state.`);
    }
    materialAssetIds.add(material.assetId);

    if (material.kind !== 'contained-water-micro-drift') {
      throw new Error(`Unsupported Pixi material kind ${String(material.kind)}.`);
    }
    if (material.containment !== 'source-alpha') {
      throw new Error(`Pixi material ${material.id} must use source-alpha containment.`);
    }
    if (material.timeSource !== 'exact-frame') {
      throw new Error(`Pixi material ${material.id} must use exact-frame time authority.`);
    }
    if (
      !Number.isFinite(material.offsetX) ||
      !Number.isFinite(material.offsetY) ||
      !Number.isFinite(material.scale) ||
      !Number.isFinite(material.movingOpacity) ||
      !Number.isFinite(material.settle) ||
      !Number.isFinite(material.readableRippleStrength)
    ) {
      throw new Error(`Pixi material ${material.id} contains non-finite state.`);
    }
    if (Math.abs(material.offsetX) > material.maxOffsetX + 1e-9) {
      throw new Error(`Pixi material ${material.id} exceeded maxOffsetX.`);
    }
    if (Math.abs(material.offsetY) > material.maxOffsetY + 1e-9) {
      throw new Error(`Pixi material ${material.id} exceeded maxOffsetY.`);
    }
    if (material.scale < 1 || material.scale > material.maxScale + 1e-9) {
      throw new Error(`Pixi material ${material.id} exceeded its scale bounds.`);
    }
    if (material.movingOpacity < 0 || material.movingOpacity > 1) {
      throw new Error(`Pixi material ${material.id} movingOpacity must be between 0 and 1.`);
    }
    if (material.settle < 0 || material.settle > 1) {
      throw new Error(`Pixi material ${material.id} settle must be between 0 and 1.`);
    }
    if (material.readableRippleStrength < 0 || material.readableRippleStrength > 1) {
      throw new Error(`Pixi material ${material.id} readableRippleStrength must be between 0 and 1.`);
    }
    if (material.ripples.length !== 3) {
      throw new Error(`Pixi material ${material.id} must resolve exactly three readable ripples.`);
    }
    for (const ripple of material.ripples) {
      if (
        !Number.isFinite(ripple.cycle) ||
        !Number.isFinite(ripple.opacity) ||
        !Number.isFinite(ripple.scaleX) ||
        !Number.isFinite(ripple.scaleY) ||
        !Number.isFinite(ripple.travelX) ||
        !Number.isFinite(ripple.travelY)
      ) {
        throw new Error(`Pixi material ${material.id} contains non-finite ripple state.`);
      }
      if (ripple.cycle < 0 || ripple.cycle >= 1) {
        throw new Error(`Pixi material ${material.id} ripple cycle must be in [0, 1).`);
      }
      if (ripple.opacity < 0 || ripple.opacity > 1) {
        throw new Error(`Pixi material ${material.id} ripple opacity must be between 0 and 1.`);
      }
      if (ripple.scaleX <= 0 || ripple.scaleY <= 0) {
        throw new Error(`Pixi material ${material.id} ripple scale must be positive.`);
      }
    }
  }
}

function assertCompatibleFrame(
  frame: PixiRenderFrame,
  width: number,
  height: number,
  preparedSourceAssets: readonly PreparedSourceAsset[],
): void {
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
  if (frame.sourceAssets.length !== preparedSourceAssets.length) {
    throw new Error(
      `Pixi preview frame source asset count ${frame.sourceAssets.length} does not match prepared count ${preparedSourceAssets.length}.`,
    );
  }
  frame.sourceAssets.forEach((asset, index) => {
    const prepared = preparedSourceAssets[index];
    if (
      !prepared ||
      asset.id !== prepared.asset.id ||
      normalizePixiSourceAssetSha256(asset.sha256) !== prepared.normalizedSha256 ||
      asset.width !== prepared.asset.width ||
      asset.height !== prepared.asset.height ||
      asset.registration !== prepared.asset.registration
    ) {
      throw new Error(`Pixi preview frame source asset ${asset.id} does not match prepared identity.`);
    }
  });
  assertMaterialStates(frame, preparedSourceAssets);
}

function setSpriteRect(
  sprite: PixiSpriteLike,
  rect: Pick<PixiSourceRegistrationRect, 'x' | 'y' | 'width' | 'height'>,
): void {
  sprite.x = rect.x;
  sprite.y = rect.y;
  sprite.width = rect.width;
  sprite.height = rect.height;
}

function drawReadableWaterRipples(
  app: PixiApplicationLike,
  Graphics: PixiGraphicsConstructor,
  Sprite: PixiSpriteConstructor,
  frame: PixiRenderFrame,
  prepared: PreparedSourceAsset,
  material: PixiMaterialFrameState,
): void {
  if (material.readableRippleStrength <= 0) return;

  const centerX = frame.width * 0.53;
  const centerY = frame.height * 0.832;
  const baseHalfWidth = (frame.width * 0.175) / 2;
  const baseHalfHeight = (frame.height * 0.051) / 2;

  for (const ripple of material.ripples) {
    if (ripple.opacity <= 0.002) continue;

    const crestMask = new Sprite(prepared.texture);
    setSpriteRect(crestMask, prepared.registrationRect);
    crestMask.alpha = 1;

    const crest = new Graphics()
      .ellipse(
        centerX + ripple.travelX,
        centerY + ripple.travelY,
        baseHalfWidth * ripple.scaleX,
        baseHalfHeight * ripple.scaleY,
      )
      .stroke({
        color: 0xfff3cd,
        width: lineWidth(frame, 1.2),
        alpha: 0.88,
      });
    crest.alpha = ripple.opacity;
    crest.setMask({ mask: crestMask, channel: 'alpha' });

    const shadowMask = new Sprite(prepared.texture);
    setSpriteRect(shadowMask, prepared.registrationRect);
    shadowMask.alpha = 1;

    const shadow = new Graphics()
      .ellipse(
        centerX + ripple.travelX,
        centerY + ripple.travelY + 1.6,
        baseHalfWidth * ripple.scaleX * 1.025,
        baseHalfHeight * ripple.scaleY * 1.04,
      )
      .stroke({
        color: 0x3a301e,
        width: lineWidth(frame, 1.7),
        alpha: 0.42,
      });
    shadow.alpha = ripple.opacity * 0.34;
    shadow.setMask({ mask: shadowMask, channel: 'alpha' });

    app.stage.addChild(shadowMask);
    app.stage.addChild(shadow);
    app.stage.addChild(crestMask);
    app.stage.addChild(crest);
  }
}

function drawSourceAsset(
  app: PixiApplicationLike,
  Graphics: PixiGraphicsConstructor,
  Sprite: PixiSpriteConstructor,
  frame: PixiRenderFrame,
  prepared: PreparedSourceAsset,
): void {
  const base = new Sprite(prepared.texture);
  setSpriteRect(base, prepared.registrationRect);
  base.alpha = 1;
  app.stage.addChild(base);

  const material = frame.materials.find((candidate) => candidate.assetId === prepared.asset.id);
  if (!material) return;

  const moving = new Sprite(prepared.texture);
  const mask = new Sprite(prepared.texture);
  setSpriteRect(mask, prepared.registrationRect);
  mask.alpha = 1;

  const movingWidth = prepared.registrationRect.width * material.scale;
  const movingHeight = prepared.registrationRect.height * material.scale;
  moving.x =
    prepared.registrationRect.x - (movingWidth - prepared.registrationRect.width) / 2 + material.offsetX;
  moving.y =
    prepared.registrationRect.y - (movingHeight - prepared.registrationRect.height) / 2 + material.offsetY;
  moving.width = movingWidth;
  moving.height = movingHeight;
  moving.alpha = material.movingOpacity;
  moving.setMask({ mask, channel: 'alpha' });

  app.stage.addChild(mask);
  app.stage.addChild(moving);
  drawReadableWaterRipples(app, Graphics, Sprite, frame, prepared, material);
}

function writeMaterialEvidence(canvas: HTMLCanvasElement, materials: readonly PixiMaterialFrameState[]): void {
  canvas.setAttribute('data-pixi-material-count', String(materials.length));
  canvas.setAttribute('data-pixi-material-ids', materials.map((material) => material.id).join(','));
  canvas.setAttribute(
    'data-pixi-material-state',
    materials
      .map(
        (material) =>
          `${material.id}:dx=${material.offsetX.toFixed(3)},dy=${material.offsetY.toFixed(3)},scale=${material.scale.toFixed(6)},settle=${material.settle.toFixed(3)},opacity=${material.movingOpacity.toFixed(3)}`,
      )
      .join(','),
  );
  canvas.setAttribute(
    'data-pixi-material-ripple-state',
    materials
      .map(
        (material) =>
          `${material.id}:strength=${material.readableRippleStrength.toFixed(3)};${material.ripples
            .map(
              (ripple) =>
                `r${ripple.index}=cycle:${ripple.cycle.toFixed(3)}|opacity:${ripple.opacity.toFixed(3)}|sx:${ripple.scaleX.toFixed(3)}|sy:${ripple.scaleY.toFixed(3)}|tx:${ripple.travelX.toFixed(3)}|ty:${ripple.travelY.toFixed(3)}`,
            )
            .join(';')}`,
      )
      .join(','),
  );
  canvas.setAttribute(
    'data-pixi-material-bounds',
    materials
      .map(
        (material) =>
          `${material.id}:max-dx=${material.maxOffsetX.toFixed(3)},max-dy=${material.maxOffsetY.toFixed(3)},max-scale=${material.maxScale.toFixed(6)}`,
      )
      .join(','),
  );
  canvas.setAttribute(
    'data-pixi-material-containment',
    materials.map((material) => `${material.id}:${material.containment}`).join(','),
  );
  canvas.setAttribute(
    'data-pixi-material-time-source',
    materials.map((material) => `${material.id}:${material.timeSource}`).join(','),
  );
}

function drawFrame(
  app: PixiApplicationLike,
  Graphics: PixiGraphicsConstructor,
  Sprite: PixiSpriteConstructor,
  frame: PixiRenderFrame,
  preparedSourceAssets: readonly PreparedSourceAsset[],
): void {
  destroyStageChildren(app.stage);

  for (const prepared of preparedSourceAssets) {
    drawSourceAsset(app, Graphics, Sprite, frame, prepared);
  }

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
  writeMaterialEvidence(app.canvas, frame.materials);
}

export async function createPixiPreviewSurface(
  width: number,
  height: number,
  sourceAssets: readonly PixiSourceAsset[] = [],
): Promise<PixiPreviewSurface> {
  const options = buildPixiApplicationOptions(width, height);
  const pixi = await import('pixi.js');
  const Application = pixi.Application as unknown as PixiApplicationConstructor;
  const Graphics = pixi.Graphics as unknown as PixiGraphicsConstructor;
  const Sprite = pixi.Sprite as unknown as PixiSpriteConstructor;
  const Texture = pixi.Texture as unknown as PixiTextureFactory;
  const app = new Application();
  await app.init(options);
  app.ticker.stop();

  const preparedSourceAssets: PreparedSourceAsset[] = [];
  const seenIds = new Set<string>();
  try {
    for (const asset of sourceAssets) {
      if (seenIds.has(asset.id)) throw new Error(`Duplicate Pixi source asset id ${asset.id}.`);
      seenIds.add(asset.id);
      preparedSourceAssets.push(
        await decodeVerifiedSourceAsset(asset, Texture, options.width, options.height),
      );
    }
  } catch (error) {
    for (const prepared of preparedSourceAssets) prepared.texture.destroy();
    app.destroy(true, { children: true });
    throw error;
  }

  app.canvas.setAttribute('role', 'img');
  app.canvas.setAttribute('data-pixi-canvas', 'true');
  app.canvas.setAttribute('data-pixi-render-mode', PIXI_PREVIEW_RENDER_MODE);
  app.canvas.setAttribute('data-viewport-width', String(options.width));
  app.canvas.setAttribute('data-viewport-height', String(options.height));
  app.canvas.setAttribute('data-pixi-source-asset-count', String(preparedSourceAssets.length));
  app.canvas.setAttribute(
    'data-pixi-source-asset-ids',
    preparedSourceAssets.map((prepared) => prepared.asset.id).join(','),
  );
  app.canvas.setAttribute(
    'data-pixi-source-asset-sha256',
    preparedSourceAssets.map((prepared) => `sha256:${prepared.normalizedSha256}`).join(','),
  );
  app.canvas.setAttribute(
    'data-pixi-source-asset-dimensions',
    preparedSourceAssets
      .map((prepared) => `${prepared.asset.id}:${prepared.asset.width}x${prepared.asset.height}`)
      .join(','),
  );
  app.canvas.setAttribute(
    'data-pixi-source-asset-registration',
    preparedSourceAssets
      .map((prepared) => `${prepared.asset.id}:${prepared.asset.registration}`)
      .join(','),
  );
  app.canvas.setAttribute(
    'data-pixi-source-asset-registration-rect',
    preparedSourceAssets
      .map(
        (prepared) =>
          `${prepared.asset.id}:${prepared.registrationRect.x.toFixed(3)},${prepared.registrationRect.y.toFixed(3)},${prepared.registrationRect.width.toFixed(3)},${prepared.registrationRect.height.toFixed(3)}`,
      )
      .join(','),
  );
  app.canvas.setAttribute('data-pixi-source-asset-verification', 'verified');

  let destroyed = false;

  return Object.freeze({
    canvas: app.canvas,
    width: options.width,
    height: options.height,
    renderMode: PIXI_PREVIEW_RENDER_MODE,
    sourceAssetCount: preparedSourceAssets.length,
    render(frame: PixiRenderFrame): void {
      if (destroyed) throw new Error('Pixi preview surface is already destroyed.');
      assertCompatibleFrame(frame, options.width, options.height, preparedSourceAssets);
      drawFrame(app, Graphics, Sprite, frame, preparedSourceAssets);
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      destroyStageChildren(app.stage);
      for (const prepared of preparedSourceAssets) prepared.texture.destroy();
      app.destroy(true, { children: true });
    },
  });
}
