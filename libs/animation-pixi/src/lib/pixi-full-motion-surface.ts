import {
  assertPixiSourceAssetDigest,
  assertPixiSourceAssetHttpResponse,
  buildPixiApplicationOptions,
  buildPixiSourceRegistration,
  normalizePixiSourceAssetSha256,
  type PixiSourceAsset,
  type PixiSourceRegistrationRect,
} from './pixi-preview-surface';

export interface PixiSourceLayerFrameState {
  readonly assetId: string;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly scale: number;
  readonly rotationDegrees: number;
  readonly opacity: number;
  readonly timeSource: 'exact-frame';
}

export interface PixiFullMotionFrame {
  readonly frame: number;
  readonly width: number;
  readonly height: number;
  readonly sourceAssets: readonly PixiSourceAsset[];
  readonly sourceLayerStates: readonly PixiSourceLayerFrameState[];
}

export interface PixiFullMotionSurface {
  readonly canvas: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
  readonly sourceAssetCount: number;
  render(frame: PixiFullMotionFrame): void;
  destroy(): void;
}

type DestroyableChild = { destroy(): void };
type PixiTextureLike = DestroyableChild;
type PixiTextureFactory = { from(source: HTMLImageElement): PixiTextureLike };
type PixiAnchorLike = { set(x: number, y?: number): void };
type PixiSpriteLike = DestroyableChild & {
  alpha: number;
  width: number;
  height: number;
  x: number;
  y: number;
  rotation: number;
  readonly anchor: PixiAnchorLike;
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
  readonly renderer: { render(options: { readonly container: PixiStageLike }): void };
  init(options: ReturnType<typeof buildPixiApplicationOptions>): Promise<void>;
  destroy(removeView: boolean, options: { readonly children: boolean }): void;
};
type PixiApplicationConstructor = new () => PixiApplicationLike;

type PreparedSourceAsset = {
  readonly asset: PixiSourceAsset;
  readonly normalizedSha256: string;
  readonly texture: PixiTextureLike;
  readonly registrationRect: PixiSourceRegistrationRect;
};

export async function createPixiFullMotionSurface(
  width: number,
  height: number,
  sourceAssets: readonly PixiSourceAsset[],
): Promise<PixiFullMotionSurface> {
  const options = buildPixiApplicationOptions(width, height);
  const pixi = await import('pixi.js');
  const Application = pixi.Application as unknown as PixiApplicationConstructor;
  const Sprite = pixi.Sprite as unknown as PixiSpriteConstructor;
  const Texture = pixi.Texture as unknown as PixiTextureFactory;
  const app = new Application();
  await app.init(options);
  app.ticker.stop();

  const prepared: PreparedSourceAsset[] = [];
  const seenIds = new Set<string>();
  try {
    for (const asset of sourceAssets) {
      if (seenIds.has(asset.id)) throw new Error(`Duplicate Pixi source asset id ${asset.id}.`);
      seenIds.add(asset.id);
      prepared.push(await decodeVerifiedSourceAsset(asset, Texture, options.width, options.height));
    }
  } catch (error) {
    for (const item of prepared) item.texture.destroy();
    app.destroy(true, { children: true });
    throw error;
  }

  app.canvas.setAttribute('role', 'img');
  app.canvas.setAttribute('data-pixi-canvas', 'true');
  app.canvas.setAttribute('data-pixi-full-motion-surface', 'true');
  app.canvas.setAttribute('data-pixi-render-mode', 'manual-exact-frame');
  app.canvas.setAttribute('data-viewport-width', String(options.width));
  app.canvas.setAttribute('data-viewport-height', String(options.height));
  app.canvas.setAttribute('data-pixi-source-asset-count', String(prepared.length));
  app.canvas.setAttribute('data-pixi-source-asset-ids', prepared.map((item) => item.asset.id).join(','));
  app.canvas.setAttribute(
    'data-pixi-source-asset-sha256',
    prepared.map((item) => `sha256:${item.normalizedSha256}`).join(','),
  );
  app.canvas.setAttribute('data-pixi-source-asset-verification', 'verified');

  let destroyed = false;
  return Object.freeze({
    canvas: app.canvas,
    width: options.width,
    height: options.height,
    sourceAssetCount: prepared.length,
    render(frame: PixiFullMotionFrame): void {
      if (destroyed) throw new Error('Pixi full-motion surface is already destroyed.');
      assertCompatibleFrame(frame, options.width, options.height, prepared);
      destroyStageChildren(app.stage);

      for (const item of prepared) {
        const state = frame.sourceLayerStates.find((candidate) => candidate.assetId === item.asset.id);
        const sprite = new Sprite(item.texture);
        applySourceLayerState(sprite, item.registrationRect, state);
        app.stage.addChild(sprite);
      }

      app.renderer.render({ container: app.stage });
      app.canvas.setAttribute('aria-label', `Pixi Shot 3 full-motion preview at frame ${frame.frame}`);
      app.canvas.setAttribute('data-pixi-frame', String(frame.frame));
      app.canvas.setAttribute(
        'data-pixi-source-layer-state',
        frame.sourceLayerStates
          .map(
            (state) =>
              `${state.assetId}:x=${state.offsetX.toFixed(3)},y=${state.offsetY.toFixed(3)},scale=${state.scale.toFixed(6)},rot=${state.rotationDegrees.toFixed(6)},opacity=${state.opacity.toFixed(3)}`,
          )
          .join(','),
      );
      app.canvas.setAttribute(
        'data-pixi-source-layer-time-source',
        frame.sourceLayerStates.map((state) => `${state.assetId}:${state.timeSource}`).join(','),
      );
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      destroyStageChildren(app.stage);
      for (const item of prepared) item.texture.destroy();
      app.destroy(true, { children: true });
    },
  });
}

function applySourceLayerState(
  sprite: PixiSpriteLike,
  rect: PixiSourceRegistrationRect,
  state: PixiSourceLayerFrameState | undefined,
): void {
  const resolved =
    state ??
    ({
      assetId: '',
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      rotationDegrees: 0,
      opacity: 1,
      timeSource: 'exact-frame',
    } as const);
  sprite.anchor.set(0.5, 0.5);
  sprite.x = rect.x + rect.width / 2 + resolved.offsetX;
  sprite.y = rect.y + rect.height / 2 + resolved.offsetY;
  sprite.width = rect.width * resolved.scale;
  sprite.height = rect.height * resolved.scale;
  sprite.rotation = (resolved.rotationDegrees * Math.PI) / 180;
  sprite.alpha = resolved.opacity;
}

function assertCompatibleFrame(
  frame: PixiFullMotionFrame,
  width: number,
  height: number,
  prepared: readonly PreparedSourceAsset[],
): void {
  if (!Number.isInteger(frame.frame) || frame.frame < 0) {
    throw new Error('Pixi full-motion frame must be a non-negative integer.');
  }
  if (frame.width !== width || frame.height !== height) {
    throw new Error(
      `Pixi full-motion frame viewport ${frame.width}x${frame.height} does not match surface ${width}x${height}.`,
    );
  }
  if (frame.sourceAssets.length !== prepared.length) {
    throw new Error('Pixi full-motion source asset count does not match prepared assets.');
  }

  frame.sourceAssets.forEach((asset, index) => {
    const item = prepared[index];
    if (
      !item ||
      asset.id !== item.asset.id ||
      normalizePixiSourceAssetSha256(asset.sha256) !== item.normalizedSha256
    ) {
      throw new Error(`Pixi full-motion source asset ${asset.id} does not match prepared identity.`);
    }
  });

  const assetIds = new Set(prepared.map((item) => item.asset.id));
  const stateIds = new Set<string>();
  for (const state of frame.sourceLayerStates) {
    if (!assetIds.has(state.assetId)) {
      throw new Error(`Pixi source-layer state references unknown asset ${state.assetId}.`);
    }
    if (stateIds.has(state.assetId)) {
      throw new Error(`Duplicate Pixi source-layer state for ${state.assetId}.`);
    }
    stateIds.add(state.assetId);
    if (
      !Number.isFinite(state.offsetX) ||
      !Number.isFinite(state.offsetY) ||
      !Number.isFinite(state.scale) ||
      !Number.isFinite(state.rotationDegrees) ||
      !Number.isFinite(state.opacity)
    ) {
      throw new Error(`Pixi source-layer state ${state.assetId} contains non-finite values.`);
    }
    if (state.scale <= 0) throw new Error(`Pixi source-layer state ${state.assetId} scale must be positive.`);
    if (state.opacity < 0 || state.opacity > 1) {
      throw new Error(`Pixi source-layer state ${state.assetId} opacity must be between 0 and 1.`);
    }
    if (state.timeSource !== 'exact-frame') {
      throw new Error(`Pixi source-layer state ${state.assetId} must use exact-frame time authority.`);
    }
  }
}

async function decodeVerifiedSourceAsset(
  asset: PixiSourceAsset,
  Texture: PixiTextureFactory,
  width: number,
  height: number,
): Promise<PreparedSourceAsset> {
  if (!asset.id.trim()) throw new Error('Pixi source asset id must not be empty.');
  if (!asset.url.trim()) throw new Error(`Pixi source asset ${asset.id} URL must not be empty.`);
  const registrationRect = buildPixiSourceRegistration(asset, width, height);
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
        `Pixi source asset ${asset.id} decoded as ${image.naturalWidth}x${image.naturalHeight}, expected ${asset.width}x${asset.height}.`,
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

async function verifySourceAssetBytes(asset: PixiSourceAsset, bytes: ArrayBuffer): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error(`Pixi source asset ${asset.id} cannot be verified because Web Crypto is unavailable.`);
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const actual = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
  return assertPixiSourceAssetDigest(asset, actual);
}

function destroyStageChildren(stage: PixiStageLike): void {
  for (const child of stage.removeChildren()) child.destroy();
}
