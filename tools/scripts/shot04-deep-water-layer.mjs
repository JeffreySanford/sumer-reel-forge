import 'dotenv/config';
import { createHash } from 'node:crypto';
import { access, copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

const MANIFEST_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const ASSET_ROOT = resolve('assets');
const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const LAYER_ID = 'shot04-deep-water-v1';
const SHOT_NUMBER = 4;

const command = process.argv[2] ?? 'preflight';
if (!['preflight', 'generate'].includes(command)) {
  throw new Error('Use preflight or generate.');
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const shot = manifest.shots?.find((item) => item.sourceShotNumber === SHOT_NUMBER);
  const layer = shot?.layers?.find((item) => item.id === LAYER_ID);
  if (!shot || !layer) {
    throw new Error(`Could not resolve Shot ${SHOT_NUMBER} / ${LAYER_ID}.`);
  }
  if (layer.hasAlpha !== false) {
    throw new Error(`${LAYER_ID} must remain an opaque background layer.`);
  }

  const sourcePath = resolve(ASSET_ROOT, shot.sourceFrame);
  if (!(await exists(sourcePath))) throw new Error(`Shot 4 source not found: ${sourcePath}`);
  const sourceBytes = await readFile(sourcePath);
  const sourceDimensions = readPngDimensions(sourceBytes, 'Shot 4 editorial source');
  const sourceChecksum = sha256(sourceBytes);

  console.log('Shot 4 deep-water preservation preflight');
  console.log(`Manifest: ${manifest.manifestId} / ${LAYER_ID} / ${layer.state}`);
  console.log(`[ok] Editorial source: ${sourcePath}`);
  console.log(`[ok] Source dimensions: ${sourceDimensions.width}x${sourceDimensions.height}`);
  console.log(`[ok] Source checksum: ${sourceChecksum}`);
  console.log('[ok] Policy: exact editorial-byte preservation / no synthesis / no manifest mutation');
  console.log('* required for Shot 4 animation-v1 activation');

  if (command === 'preflight') return;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputRoot = join(CANDIDATE_ROOT, stamp);
  const shotDirectory = join(outputRoot, 'shot-04');
  await mkdir(shotDirectory, { recursive: true });
  const candidatePath = join(shotDirectory, `${LAYER_ID}.png`);
  await copyFile(sourcePath, candidatePath);

  const candidateBytes = await readFile(candidatePath);
  const candidateChecksum = sha256(candidateBytes);
  const candidateDimensions = readPngDimensions(candidateBytes, LAYER_ID);
  if (candidateChecksum !== sourceChecksum) {
    throw new Error('Deep-water candidate copy checksum does not match editorial source.');
  }
  if (
    candidateDimensions.width !== sourceDimensions.width ||
    candidateDimensions.height !== sourceDimensions.height
  ) {
    throw new Error('Deep-water candidate dimensions do not match editorial source.');
  }

  const candidate = {
    schemaVersion: 1,
    state: 'pending-human-review',
    manifestId: manifest.manifestId,
    shotId: shot.shotId,
    sourceShotNumber: SHOT_NUMBER,
    layerId: LAYER_ID,
    role: layer.role,
    material: layer.material,
    sourceFrame: shot.sourceFrame,
    intendedApprovedPath: layer.path ?? null,
    expectedAlpha: false,
    sourceDimensions,
    candidateDimensions,
    candidatePath,
    sha256: candidateChecksum,
    generatedAt: new Date().toISOString(),
    generationMethod: 'exact-editorial-source-copy',
    manifestMutated: false,
    automaticPromotionAllowed: false,
    preservationPolicy: {
      sourceBytesMustMatchExactly: true,
      sourcePixelsAuthoritative: true,
      synthesisAllowed: false,
      cropAllowed: false,
      resizeAllowed: false,
    },
  };

  await writeFile(
    join(shotDirectory, `${LAYER_ID}.candidate.json`),
    `${JSON.stringify(candidate, null, 2)}\n`,
    'utf8',
  );
  await writeFile(
    join(outputRoot, 'candidate-run.json'),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        type: 'animation-layer-candidates',
        generatedAt: candidate.generatedAt,
        sourceManifestId: manifest.manifestId,
        sourceManifestPath: MANIFEST_PATH,
        outputRoot,
        candidates: [candidate],
        approvalPolicy: {
          manifestMutated: false,
          candidateState: 'pending-human-review',
          automaticPromotionAllowed: false,
        },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  console.log('');
  console.log('Generated 1 exact-preservation deep-water candidate.');
  console.log(`Candidate workspace: ${outputRoot}`);
  console.log(`Candidate PNG: ${candidatePath}`);
  console.log('The animation-v1 manifest was NOT modified.');
  console.log('The candidate remains pending human review and preservation QA.');
}

function readPngDimensions(buffer, label) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length < 24 ||
    buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
    buffer.subarray(12, 16).toString('ascii') !== 'IHDR'
  ) {
    throw new Error(`${label} is not a valid PNG.`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
