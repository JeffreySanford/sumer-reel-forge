import {
  assertPixiSourceAssetDigest,
  assertPixiSourceAssetHttpResponse,
  buildPixiApplicationOptions,
  buildPixiSourceRegistration,
  normalizePixiSourceAssetSha256,
  type PixiSourceAsset,
  type PixiSourceRegistrationRect,
} from './pixi-preview-surface';

export const PIXI_SHOT03_TRANSFORM_MODEL = 'shot03-local-groups-v1' as const;

const SHOT03_BACKGROUND_ID = 'shot03-background-v1';
const SHOT03_WATER_ID = 'shot03-water-v1';
const SHOT03_VESSEL_ID = 'shot03-vessel-v1';
const SHOT03_ENKI_BODY_ID = 'shot03-enki-body-v1';
const SHOT03_ENKI_EYES_ID = 'shot03-enki-eyes-v1';
const SHOT03_RIGGING_ID = 'shot03-rigging-v1';
const SHOT03_REQUIRED_IDS = Object.freeze([
  SHOT03_BACKGROUND_ID,
  SHOT03_WATER_ID,
  SHOT03_VESSEL_ID,
  SHOT03_ENKI_BODY_ID,
  SHOT03_ENKI_EYES_ID,
  SHOT03_RIGGING_ID,
]);

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

export interface PixiLocalGroupTransform {
  readonly id: 'camera-root' | 'vessel-root' | 'rigging-root';
  readonly pivotX: number;
  readonly pivotY: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly scale: number;
  readonly rotationDegrees: number;
}

export interface PixiShot03LocalGroupState {
  readonly camera: PixiLocalGroupTransform;
  readonly vessel: PixiLocalGroupTransform;
  readonly rigging: PixiLocalGroupTransform;
}

export interface PixiFullMotionSurface {
  readonly canvas: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
  readonly sourceAssetCount: number;
  render(frame: PixiFullMotionFrame): void;
  destroy(): void;
}

type PixiDestroyOptions = { readonly children?: boolean };
type DestroyableChild = { destroy(options?: PixiDestroyOptions): void };
type PixiTextureLike = DestroyableChild;
type PixiTextureFactory = { from(source: HTMLImageElement): PixiTextureLike };
type PixiPointLike = { set(x: number, y?: number): void };
type PixiSpriteLike = DestroyableChild & {
  alpha: number;
  width: number;
  height: number;
  x: number;
  y: number;
  rotation: number;
  readonly anchor: PixiPointLike;
};
type PixiSpriteConstructor = new (texture: PixiTextureLike) => PixiSpriteLike;
type PixiContainerLike = DestroyableChild & {
  x: number;
  y: number;
  rotation: number;
  readonly pivot: PixiPointLike;
  readonly scale: PixiPointLike;
  addChild(...children: DestroyableChild[]): unknown;
  removeChildren(): DestroyableChild[];
};
type PixiContainerConstructor = new () => PixiContainerLike;
type PixiStageLike = PixiContainerLike;
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
  const Container = pixi.Container as unknown as PixiContainerConstructor;
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
  app.canvas.setAttribute('data-pixi-transform-model', PIXI_SHOT03_TRANSFORM_MODEL);
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
      const groups = resolvePixiShot03LocalGroupState(frame);
      destroyStageChildren(app.stage);

      const cameraRoot = new Container();
      const vesselRoot = new Container();
      const riggingRoot = new Container();
      applyGroupTransform(cameraRoot, groups.camera);
      applyGroupTransform(vesselRoot, groups.vessel);
      applyGroupTransform(riggingRoot, groups.rigging);

      const background = createRegisteredSprite(
        Sprite,
        requiredPrepared(prepared, SHOT03_BACKGROUND_ID),
        requiredState(frame.sourceLayerStates, SHOT03_BACKGROUND_ID).opacity,
      );
      const water = createRegisteredSprite(
        Sprite,
        requiredPrepared(prepared, SHOT03_WATER_ID),
        requiredState(frame.sourceLayerStates, SHOT03_WATER_ID).opacity,
      );
      const vessel = createRegisteredSprite(
        Sprite,
        requiredPrepared(prepared, SHOT03_VESSEL_ID),
        requiredState(frame.sourceLayerStates, SHOT03_VESSEL_ID).opacity,
      );
      const enkiBody = createRegisteredSprite(
        Sprite,
        requiredPrepared(prepared, SHOT03_ENKI_BODY_ID),
        requiredState(frame.sourceLayerStates, SHOT03_ENKI_BODY_ID).opacity,
      );
      const enkiEyes = createRegisteredSprite(
        Sprite,
        requiredPrepared(prepared, SHOT03_ENKI_EYES_ID),
        requiredState(frame.sourceLayerStates, SHOT03_ENKI_EYES_ID).opacity,
      );
      const rigging = createRegisteredSprite(
        Sprite,
        requiredPrepared(prepared, SHOT03_RIGGING_ID),
        requiredState(frame.sourceLayerStates, SHOT03_RIGGING_ID).opacity,
      );

      vesselRoot.addChild(vessel, enkiBody, enkiEyes);
      riggingRoot.addChild(rigging);
      cameraRoot.addChild(background, water, vesselRoot, riggingRoot);
      app.stage.addChild(cameraRoot);

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
      app.canvas.setAttribute('data-pixi-local-group-state', serializeLocalGroups(groups));
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

export function resolvePixiShot03LocalGroupState(
  frame: Pick<PixiFullMotionFrame, 'width' | 'height' | 'sourceLayerStates'>,
): PixiShot03LocalGroupState {
  const cameraState = requiredState(frame.sourceLayerStates, SHOT03_BACKGROUND_ID);
  const waterState = requiredState(frame.sourceLayerStates, SHOT03_WATER_ID);
  const vesselState = requiredState(frame.sourceLayerStates, SHOT03_VESSEL_ID);
  const enkiBodyState = requiredState(frame.sourceLayerStates, SHOT03_ENKI_BODY_ID);
  const enkiEyesState = requiredState(frame.sourceLayerStates, SHOT03_ENKI_EYES_ID);
  const riggingState = requiredState(frame.sourceLayerStates, SHOT03_RIGGING_ID);

  assertSameTransform(cameraState, waterState, 'water must remain camera-carried');
  assertSameTransform(vesselState, enkiBodyState, 'Enki body must remain vessel-carried');
  assertSameTransform(vesselState, enkiEyesState, 'Enki eye state must remain vessel-carried');

  const camera = Object.freeze({
    id: 'camera-root' as const,
    pivotX: frame.width * 0.5,
    pivotY: frame.height * 0.48,
    offsetX: cameraState.offsetX,
    offsetY: cameraState.offsetY,
    scale: cameraState.scale,
    rotationDegrees: cameraState.rotationDegrees,
  });

  const vessel = Object.freeze({
    id: 'vessel-root' as const,
    pivotX: frame.width * 0.5,
    pivotY: frame.height * 0.62,
    offsetX: vesselState.offsetX - cameraState.offsetX,
    offsetY: vesselState.offsetY - cameraState.offsetY,
    scale: vesselState.scale / cameraState.scale,
    rotationDegrees: vesselState.rotationDegrees - cameraState.rotationDegrees,
  });

  const rigging = Object.freeze({
    id: 'rigging-root' as const,
    pivotX: frame.width * 0.5,
    pivotY: frame.height * 0.18,
    offsetX: riggingState.offsetX - cameraState.offsetX,
    offsetY: riggingState.offsetY - cameraState.offsetY,
    scale: riggingState.scale / cameraState.scale,
    rotationDegrees: riggingState.rotationDegrees - cameraState.rotationDegrees,
  });

  return Object.freeze({ camera, vessel, rigging });
}

function createRegisteredSprite(
  Sprite: PixiSpriteConstructor,
  item: PreparedSourceAsset,
  opacity: number,
): PixiSpriteLike {
  const sprite = new Sprite(item.texture);
  sprite.anchor.set(0, 0);
  sprite.x = item.registrationRect.x;
  sprite.y = item.registrationRect.y;
  sprite.width = item.registrationRect.width;
  sprite.height = item.registrationRect.height;
  sprite.rotation = 0;
  sprite.alpha = opacity;
  return sprite;
}

function applyGroupTransform(
  container: PixiContainerLike,
  transform: PixiLocalGroupTransform,
): void {
  container.pivot.set(transform.pivotX, transform.pivotY);
  container.x = transform.pivotX + transform.offsetX;
  container.y = transform.pivotY + transform.offsetY;
  container.scale.set(transform.scale, transform.scale);
  container.rotation = (transform.rotationDegrees * Math.PI) / 180;
}

function requiredPrepared(
  prepared: readonly PreparedSourceAsset[],
  assetId: string,
): PreparedSourceAsset {
  const item = prepared.find((candidate) => candidate.asset.id === assetId);
  if (!item) throw new Error(`Pixi Shot 3 local-group renderer is missing source asset ${assetId}.`);
  return item;
}

function requiredState(
  states: readonly PixiSourceLayerFrameState[],
  assetId: string,
): PixiSourceLayerFrameState {
  const state = states.find((candidate) => candidate.assetId === assetId);
  if (!state) throw new Error(`Pixi Shot 3 local-group renderer is missing state ${assetId}.`);
  return state;
}

function assertSameTransform(
  expected: PixiSourceLayerFrameState,
  actual: PixiSourceLayerFrameState,
  message: string,
): void {
  const epsilon = 1e-9;
  if (
    Math.abs(expected.offsetX - actual.offsetX) > epsilon ||
    Math.abs(expected.offsetY - actual.offsetY) > epsilon ||
    Math.abs(expected.scale - actual.scale) > epsilon ||
    Math.abs(expected.rotationDegrees - actual.rotationDegrees) > epsilon
  ) {
    throw new Error(`${message}: ${actual.assetId} diverged from ${expected.assetId}.`);
  }
}

function serializeLocalGroups(groups: PixiShot03LocalGroupState): string {
  return [groups.camera, groups.vessel, groups.rigging]
    .map(
      (group) =>
        `${group.id}:pivot=${group.pivotX.toFixed(3)}/${group.pivotY.toFixed(3)},x=${group.offsetX.toFixed(3)},y=${group.offsetY.toFixed(3)},scale=${group.scale.toFixed(6)},rot=${group.rotationDegrees.toFixed(6)}`,
    )
    .join('|');
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
  for (const requiredId of SHOT03_REQUIRED_IDS) {
    if (!assetIds.has(requiredId)) {
      throw new Error(`Pixi Shot 3 local-group renderer requires source asset ${requiredId}.`);
    }
  }

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
  for (const child of stage.removeChildren()) child.destroy({ children: true });
}
