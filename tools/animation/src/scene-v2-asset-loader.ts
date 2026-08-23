import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  resolveSceneV2Assets,
  validateAnimationAssetManifest,
  type AnimationAssetManifest,
  type SceneV2AssetResolution,
} from './animation-asset-manifest';
import { assertSceneV2, type SceneV2 } from './scene-v2';

export interface LoadedSceneV2ForRender {
  scene: SceneV2;
  scenePath: string;
  manifestPath?: string;
  assetResolution: SceneV2AssetResolution;
}

export async function loadSceneV2ForRender(
  scenePath: string,
  assetRoot = resolve('assets'),
): Promise<LoadedSceneV2ForRender> {
  const absoluteScenePath = resolve(scenePath);
  const sourceScene = JSON.parse(
    await readFile(absoluteScenePath, 'utf8'),
  ) as SceneV2;

  let manifest: AnimationAssetManifest | undefined;
  let manifestPath: string | undefined;

  if (
    sourceScene.assetStrategy === 'prefer-animation-manifest' &&
    sourceScene.assetManifestPath
  ) {
    manifestPath = resolve(assetRoot, sourceScene.assetManifestPath);
    manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as AnimationAssetManifest;
    const manifestValidation = validateAnimationAssetManifest(manifest);
    if (!manifestValidation.valid) {
      throw new Error(
        `Invalid animation asset manifest ${manifestPath}:\n- ${manifestValidation.errors.join('\n- ')}`,
      );
    }
  }

  const assetResolution = resolveSceneV2Assets(sourceScene, manifest);
  assertSceneV2(assetResolution.scene);

  for (const shot of assetResolution.scene.shots) {
    for (const layer of shot.layers.filter((item) => item.required)) {
      await access(resolve(assetRoot, layer.assetPath));
    }
  }

  return {
    scene: assetResolution.scene,
    scenePath: absoluteScenePath,
    manifestPath,
    assetResolution,
  };
}
