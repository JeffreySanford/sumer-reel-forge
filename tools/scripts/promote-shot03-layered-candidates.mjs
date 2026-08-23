import 'dotenv/config';
import { createHash } from 'node:crypto';
import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path';

const MANIFEST_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const ASSET_ROOT = resolve('assets');
const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const PREVIEW_ROOT = resolve('tmp/animation-previews');
const LAYERED_PREVIEW_ROOT = resolve(
  'tmp/animation-previews/shot03-layered-preview',
);
const PROMOTION_ROOT = resolve('tmp/animation-assets/promotions/shot03');
const EXPECTED_LAYER_IDS = [
  'shot03-background-v1',
  'shot03-water-v1',
  'shot03-vessel-v1',
  'shot03-enki-body-v1',
];
const CONFIRMATION = 'APPROVE_SHOT_3';

const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));

await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const previewDirectory = options.previewDir
    ? resolve(options.previewDir)
    : await newestQaPassedPreview();
  assertInside(LAYERED_PREVIEW_ROOT, previewDirectory, 'Layered preview');

  const previewManifestPath = join(previewDirectory, 'preview-manifest.json');
  const layeredQaPath = join(previewDirectory, 'motion-qa.json');
  const preview = JSON.parse(await readFile(previewManifestPath, 'utf8'));
  const layeredQa = JSON.parse(await readFile(layeredQaPath, 'utf8'));

  if (preview.previewType !== 'shot03-layered-candidate-preview') {
    throw new Error(`Unexpected preview type ${preview.previewType ?? 'unknown'}.`);
  }
  if (layeredQa.pass !== true) {
    throw new Error('Layered Shot 3 motion QA has not passed.');
  }

  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const shot = manifest.shots?.find((item) => item.sourceShotNumber === 3);
  if (!shot) throw new Error('Shot 3 is missing from the animation manifest.');

  const requiredIds = [...(shot.activationPolicy?.requiredLayerIds ?? [])].sort();
  const expectedIds = [...EXPECTED_LAYER_IDS].sort();
  if (JSON.stringify(requiredIds) !== JSON.stringify(expectedIds)) {
    throw new Error(
      `Shot 3 activation policy changed. Expected ${expectedIds.join(', ')}; found ${requiredIds.join(', ')}.`,
    );
  }

  if (!Array.isArray(preview.candidates) || preview.candidates.length !== 4) {
    throw new Error('Layered preview must contain exactly four candidate records.');
  }

  const candidates = [];
  for (const layerId of EXPECTED_LAYER_IDS) {
    const record = preview.candidates.find((item) => item?.layerId === layerId);
    if (!record) throw new Error(`Layered preview is missing ${layerId}.`);

    const candidateRunDirectory = resolveRequiredPath(
      record.candidateRunDirectory,
      'candidateRunDirectory',
    );
    assertInside(CANDIDATE_ROOT, candidateRunDirectory, `${layerId} candidate run`);

    const candidatePath = resolveRequiredPath(record.candidatePath, 'candidatePath');
    assertInside(candidateRunDirectory, candidatePath, `${layerId} candidate PNG`);
    if (!(await exists(candidatePath))) {
      throw new Error(`${layerId} candidate not found: ${candidatePath}`);
    }

    const qaPath = resolveRequiredPath(record.qaPath, 'qaPath');
    assertQaEvidencePath(qaPath, candidateRunDirectory, layerId);
    if (!(await exists(qaPath))) {
      throw new Error(`${layerId} QA report not found: ${qaPath}`);
    }
    const qa = JSON.parse(await readFile(qaPath, 'utf8'));
    if (qa.pass !== true) throw new Error(`${layerId} upstream QA is not passing.`);

    const bytes = await readFile(candidatePath);
    const checksum = sha256(bytes);
    if (record.candidateChecksum && record.candidateChecksum !== checksum) {
      throw new Error(`${layerId} checksum no longer matches the layered preview evidence.`);
    }

    const layer = shot.layers?.find((item) => item.id === layerId);
    if (!layer?.path) throw new Error(`${layerId} has no canonical animation-v1 path.`);
    const targetPath = resolve(ASSET_ROOT, layer.path);
    assertInside(ASSET_ROOT, targetPath, `${layerId} target`);

    candidates.push({
      layerId,
      candidateRunDirectory,
      candidatePath,
      qaPath,
      qaType: record.qaType ?? 'unknown',
      checksum,
      dimensions: readPngDimensions(bytes, layerId),
      targetPath,
    });
  }

  const dimensions = candidates[0].dimensions;
  for (const candidate of candidates.slice(1)) {
    if (
      candidate.dimensions.width !== dimensions.width ||
      candidate.dimensions.height !== dimensions.height
    ) {
      throw new Error(
        `${candidate.layerId} dimensions ${candidate.dimensions.width}x${candidate.dimensions.height} do not match shared asset resolution ${dimensions.width}x${dimensions.height}.`,
      );
    }
  }

  printPlan({ previewDirectory, layeredQaPath, candidates, dimensions });

  if (!options.apply) {
    console.log('');
    console.log('DRY RUN ONLY — no animation-v1 file or manifest was modified.');
    console.log(
      `To promote after human review: pnpm animation:shot3:promote -- --confirm=${CONFIRMATION}`,
    );
    return;
  }

  if (options.confirm !== CONFIRMATION) {
    throw new Error(
      `Promotion requires explicit human confirmation: --confirm=${CONFIRMATION}`,
    );
  }

  await promote({
    manifest,
    shot,
    previewDirectory,
    layeredQaPath,
    candidates,
    dimensions,
  });
}

async function promote({
  manifest,
  shot,
  previewDirectory,
  layeredQaPath,
  candidates,
  dimensions,
}) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const staged = [];
  try {
    for (const candidate of candidates) {
      await mkdir(dirname(candidate.targetPath), { recursive: true });

      if (await exists(candidate.targetPath)) {
        const existingChecksum = sha256(await readFile(candidate.targetPath));
        if (existingChecksum !== candidate.checksum) {
          throw new Error(
            `${candidate.layerId} target already exists with a different checksum. Refusing to overwrite ${candidate.targetPath}.`,
          );
        }
        staged.push({ ...candidate, tempPath: null, alreadyPresent: true });
        continue;
      }

      const tempPath = `${candidate.targetPath}.promotion-${stamp}.tmp`;
      await copyFile(candidate.candidatePath, tempPath);
      const stagedChecksum = sha256(await readFile(tempPath));
      if (stagedChecksum !== candidate.checksum) {
        throw new Error(`${candidate.layerId} staged copy checksum mismatch.`);
      }
      staged.push({ ...candidate, tempPath, alreadyPresent: false });
    }

    for (const candidate of staged) {
      if (!candidate.tempPath) continue;
      await rename(candidate.tempPath, candidate.targetPath);
    }
  } finally {
    await Promise.all(
      staged.map(async (candidate) => {
        if (candidate.tempPath && (await exists(candidate.tempPath))) {
          await rm(candidate.tempPath, { force: true });
        }
      }),
    );
  }

  const approvedAt = new Date().toISOString();
  for (const candidate of candidates) {
    const layer = shot.layers.find((item) => item.id === candidate.layerId);
    layer.state = 'approved';
    layer.sha256 = candidate.checksum;
    layer.review = {
      status: 'approved',
      notes: [
        ...(Array.isArray(layer.review?.notes) ? layer.review.notes : []),
        `Human-approved from layered Shot 3 audition ${basename(previewDirectory)} at ${approvedAt}.`,
        `${candidate.qaType} PASS: ${candidate.qaPath}`,
      ],
    };
  }
  shot.status = 'approved';

  const manifestTempPath = `${MANIFEST_PATH}.promotion-${stamp}.tmp`;
  await writeFile(manifestTempPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await rename(manifestTempPath, MANIFEST_PATH);

  await mkdir(PROMOTION_ROOT, { recursive: true });
  const receiptPath = join(PROMOTION_ROOT, `${stamp}.json`);
  const receipt = {
    schemaVersion: 1,
    type: 'shot03-layered-candidate-promotion',
    approvedAt,
    humanConfirmation: CONFIRMATION,
    manifestPath: MANIFEST_PATH,
    previewDirectory,
    layeredQaPath,
    sharedAssetDimensions: dimensions,
    layers: candidates.map((candidate) => ({
      layerId: candidate.layerId,
      sourceCandidatePath: candidate.candidatePath,
      upstreamQaPath: candidate.qaPath,
      qaType: candidate.qaType,
      sha256: candidate.checksum,
      targetPath: candidate.targetPath,
    })),
    policy: {
      editorialV1Modified: false,
      requiredLayerCount: candidates.length,
      manifestStateSetApproved: true,
      humanReviewSetApproved: true,
    },
  };
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');

  console.log('');
  console.log('Shot 3 promotion complete.');
  for (const candidate of candidates) {
    console.log(`[approved] ${candidate.layerId} → ${candidate.targetPath}`);
  }
  console.log(`Manifest: ${MANIFEST_PATH}`);
  console.log(`Promotion receipt: ${receiptPath}`);
  console.log('editorial-v1 was NOT modified.');
  console.log('Shot 3 now satisfies the manifest approval side of layered activation.');
}

function printPlan({ previewDirectory, layeredQaPath, candidates, dimensions }) {
  console.log('Shot 3 layered promotion gate');
  console.log(`[ok] layered preview: ${previewDirectory}`);
  console.log(`[ok] layered QA PASS: ${layeredQaPath}`);
  console.log(`[ok] shared asset resolution: ${dimensions.width}x${dimensions.height}`);
  for (const candidate of candidates) {
    console.log(
      `[ok] ${candidate.layerId}: ${candidate.qaType} PASS · ${candidate.checksum.slice(0, 12)}…`,
    );
    console.log(`     source: ${candidate.candidatePath}`);
    console.log(`     target: ${candidate.targetPath}`);
  }
  console.log('[ok] editorial-v1 remains immutable');
}

async function newestQaPassedPreview() {
  let entries;
  try {
    entries = await readdir(LAYERED_PREVIEW_ROOT, { withFileTypes: true });
  } catch {
    throw new Error(`No layered preview root found at ${LAYERED_PREVIEW_ROOT}.`);
  }
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(LAYERED_PREVIEW_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));

  for (const directory of directories) {
    try {
      const qa = JSON.parse(await readFile(join(directory, 'motion-qa.json'), 'utf8'));
      const preview = JSON.parse(
        await readFile(join(directory, 'preview-manifest.json'), 'utf8'),
      );
      if (
        qa.pass === true &&
        preview.previewType === 'shot03-layered-candidate-preview'
      ) {
        return directory;
      }
    } catch {
      // Ignore incomplete or older previews.
    }
  }
  throw new Error('No QA-passed layered Shot 3 preview was found.');
}

function parseOptions(args) {
  const result = { apply: false, confirm: undefined, previewDir: undefined };
  for (const arg of args) {
    if (arg === '--apply') result.apply = true;
    else if (arg.startsWith('--confirm=')) {
      result.confirm = arg.slice('--confirm='.length);
    } else if (arg.startsWith('--preview-dir=')) {
      result.previewDir = arg.slice('--preview-dir='.length);
    } else throw new Error(`Unknown option ${arg}`);
  }
  return result;
}

function assertQaEvidencePath(qaPath, candidateRunDirectory, layerId) {
  if (isInside(candidateRunDirectory, qaPath)) return;
  if (isInside(PREVIEW_ROOT, qaPath)) return;
  throw new Error(
    `${layerId} QA evidence must remain under its candidate run or animation preview root: ${qaPath}`,
  );
}

function resolveRequiredPath(value, label) {
  if (typeof value !== 'string' || !value) throw new Error(`Missing ${label}.`);
  return resolve(value);
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
  return createHash('sha256').update(value).digest('hex');
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function assertInside(parent, child, label) {
  if (!isInside(parent, child)) {
    throw new Error(`${label} must remain under ${parent}: ${child}`);
  }
}

function isInside(parent, child) {
  const path = relative(resolve(parent), resolve(child));
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}
