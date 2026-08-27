import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expandPixelBounds } from '../animation/src/actor-semantic-vision-proxy.mjs';

const ROOT = resolve('.');
const ACTOR_PREP_ROOT = resolve('tmp/animation-assets/actor-prep/enki/v1');
const ALPHA_MIN = 8;
const PADDING_FRACTION = 0.18;
const MATTE_COLOR = '0xD8D8D8';

void main();

function main() {
  const workspace = latestActorPrepWorkspace();
  const actorPrepPath = join(workspace, 'actor-prep.json');
  const sourcePath = join(workspace, 'source', 'reference-enki.png');
  if (!existsSync(actorPrepPath) || !existsSync(sourcePath)) {
    throw new Error(`Latest actor-prep workspace is incomplete: ${workspace}`);
  }

  const actorPrep = JSON.parse(readFileSync(actorPrepPath, 'utf8'));
  const source = {
    width: Number(actorPrep?.source?.width),
    height: Number(actorPrep?.source?.height),
  };
  if (!Number.isInteger(source.width) || !Number.isInteger(source.height) || source.width <= 0 || source.height <= 0) {
    throw new Error('Actor prep does not contain valid source dimensions.');
  }

  const alphaBounds = detectAlphaBounds(sourcePath);
  const crop = expandPixelBounds(alphaBounds, source, PADDING_FRACTION);
  const discoveryDirectory = join(workspace, 'semantic-discovery');
  mkdirSync(discoveryDirectory, { recursive: true });
  const proxyPath = join(discoveryDirectory, 'semantic-vision-proxy.png');
  const metadataPath = join(discoveryDirectory, 'semantic-vision-proxy.json');

  renderNeutralMatteProxy({ sourcePath, proxyPath, crop });
  const metadata = {
    schemaVersion: 1,
    type: 'actor-semantic-vision-proxy',
    source,
    alphaBounds,
    crop,
    alphaThreshold: ALPHA_MIN,
    paddingFraction: PADDING_FRACTION,
    matteColor: MATTE_COLOR,
    sourcePath,
    proxyPath,
    sourcePixelsMutated: false,
    generatedSemanticPixels: false,
    coordinatePolicy: 'model returns proxy-normalized coordinates; hook remaps to original registered source frame',
  };
  writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');

  console.log('Shot 3 Enki semantic discovery autopilot');
  console.log('Policy: accepted source bytes remain untouched; Qwen sees a deterministic alpha-cropped neutral-matte proxy.');
  console.log(`Workspace: ${workspace}`);
  console.log(`Alpha bounds: x=${alphaBounds.x}, y=${alphaBounds.y}, ${alphaBounds.width}x${alphaBounds.height}`);
  console.log(`Vision crop: x=${crop.x}, y=${crop.y}, ${crop.width}x${crop.height}`);
  console.log(`Vision proxy: ${proxyPath}`);
  console.log('Coordinates are remapped back to the original registered 941x1672 source before existing consensus/QA.');
  console.log('No semantic threshold changes, no segmentation, no canonical mutation.');
  console.log('');

  const hook = pathToFileURL(resolve('tools/scripts/enki-semantic-vision-proxy-hook.mjs')).href;
  const target = resolve('tools/scripts/shot03-enki-semantic-discovery.mjs');
  const forwarded = process.argv.slice(2);
  const result = spawnSync(
    process.execPath,
    ['--import', hook, target, '--workspace', workspace, ...forwarded],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        ENKI_SEMANTIC_VISION_PROXY_META: metadataPath,
        ENKI_SEMANTIC_VISION_PROXY_IMAGE: proxyPath,
      },
      stdio: 'inherit',
      windowsHide: true,
      shell: false,
    },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}

function latestActorPrepWorkspace() {
  if (!existsSync(ACTOR_PREP_ROOT)) {
    throw new Error(`Actor-prep root does not exist: ${ACTOR_PREP_ROOT}`);
  }
  const candidates = readdirSync(ACTOR_PREP_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(ACTOR_PREP_ROOT, entry.name))
    .sort((left, right) => basename(right).localeCompare(basename(left)));
  for (const workspace of candidates) {
    if (
      existsSync(join(workspace, 'actor-prep.json')) &&
      existsSync(join(workspace, 'source', 'reference-enki.png')) &&
      existsSync(join(workspace, 'evidence', 'packet-receipt.json'))
    ) {
      const receipt = JSON.parse(readFileSync(join(workspace, 'evidence', 'packet-receipt.json'), 'utf8'));
      if (receipt.pass === true) return workspace;
    }
  }
  throw new Error('No passing Enki actor-prep workspace is available.');
}

function detectAlphaBounds(sourcePath) {
  const result = spawnSync(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel', 'info',
      '-i', sourcePath,
      '-vf', `alphaextract,bbox=min_val=${ALPHA_MIN}`,
      '-frames:v', '1',
      '-f', 'null',
      '-',
    ],
    { cwd: ROOT, encoding: 'utf8', windowsHide: true, shell: false },
  );
  if (result.error) throw result.error;
  const text = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const matches = [...text.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)];
  if (!matches.length) {
    throw new Error(`FFmpeg could not derive a non-transparent alpha bounding box from ${sourcePath}.`);
  }
  const [, width, height, x, y] = matches.at(-1);
  const bounds = { x: Number(x), y: Number(y), width: Number(width), height: Number(height) };
  if (![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isInteger) || bounds.width <= 0 || bounds.height <= 0) {
    throw new Error(`Invalid FFmpeg alpha bounds: ${JSON.stringify(bounds)}.`);
  }
  return bounds;
}

function renderNeutralMatteProxy({ sourcePath, proxyPath, crop }) {
  const filter = [
    `color=c=${MATTE_COLOR}:s=${crop.width}x${crop.height}:d=1,format=rgba[bg]`,
    `[0:v]crop=${crop.width}:${crop.height}:${crop.x}:${crop.y},format=rgba[fg]`,
    '[bg][fg]overlay=0:0:format=auto[out]',
  ].join(';');
  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-hide_banner',
      '-loglevel', 'error',
      '-i', sourcePath,
      '-filter_complex', filter,
      '-map', '[out]',
      '-frames:v', '1',
      '-update', '1',
      proxyPath,
    ],
    { cwd: ROOT, encoding: 'utf8', windowsHide: true, shell: false },
  );
  if (result.error) throw result.error;
  if (result.status !== 0 || !existsSync(proxyPath)) {
    throw new Error(`FFmpeg vision proxy render failed: ${result.stderr || `exit ${result.status}`}`);
  }
}
