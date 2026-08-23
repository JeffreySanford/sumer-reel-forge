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

const DEFAULT_MANIFEST_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const ASSET_ROOT = resolve('assets');
const PREVIEW_ROOT = resolve('tmp/animation-previews');
const PROMOTION_BASE = resolve('tmp/animation-assets/promotions');

const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));

await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const manifestPath = resolve(options.manifest ?? DEFAULT_MANIFEST_PATH);
  const manifestBytes = await readFile(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const shot = manifest.shots?.find(
    (item) => item.sourceShotNumber === options.shotNumber,
  );
  if (!shot) {
    throw new Error(
      `Shot ${options.shotNumber} is missing from the animation manifest.`,
    );
  }

  const shotLabel = String(options.shotNumber).padStart(2, '0');
  const previewType = `shot${shotLabel}-layered-candidate-preview`;
  const layeredPreviewRoot = resolve(
    PREVIEW_ROOT,
    `shot${shotLabel}-layered-preview`,
  );
  const candidateRoot = resolve(
    'tmp/animation-assets/candidates',
    manifest.manifestId,
  );
  const promotionRoot = resolve(PROMOTION_BASE, `shot${shotLabel}`);
  const confirmation = `APPROVE_SHOT_${options.shotNumber}`;

  const requiredIds = [...(shot.activationPolicy?.requiredLayerIds ?? [])].sort();
  if (!requiredIds.length) {
    throw new Error(
      `Shot ${options.shotNumber} has no activationPolicy.requiredLayerIds.`,
    );
  }

  const previewDirectory = options.previewDir
    ? resolve(options.previewDir)
    : await newestQaPassedPreview(layeredPreviewRoot, previewType);
  assertInside(layeredPreviewRoot, previewDirectory, 'Layered preview');

  const previewManifestPath = join(previewDirectory, 'preview-manifest.json');
  const layeredQaPath = join(previewDirectory, 'motion-qa.json');
  const preview = JSON.parse(await readFile(previewManifestPath, 'utf8'));
  const layeredQa = JSON.parse(await readFile(layeredQaPath, 'utf8'));

  if (preview.previewType !== previewType) {
    throw new Error(
      `Unexpected preview type ${preview.previewType ?? 'unknown'}; expected ${previewType}.`,
    );
  }
  if (preview.sourceShotNumber !== options.shotNumber) {
    throw new Error(
      `Layered preview sourceShotNumber ${preview.sourceShotNumber ?? 'unknown'} does not match Shot ${options.shotNumber}.`,
    );
  }
  if (layeredQa.pass !== true) {
    throw new Error(
      `Layered Shot ${options.shotNumber} motion QA has not passed.`,
    );
  }

  if (!Array.isArray(preview.candidates)) {
    throw new Error('Layered preview is missing candidate records.');
  }
  const previewIds = preview.candidates
    .map((item) => item?.layerId)
    .filter((value) => typeof value === 'string')
    .sort();
  if (JSON.stringify(previewIds) !== JSON.stringify(requiredIds)) {
    throw new Error(
      `Layered preview candidate set does not exactly match Shot ${options.shotNumber} activation requirements. Required: ${requiredIds.join(', ')}. Preview: ${previewIds.join(', ')}.`,
    );
  }

  const candidates = [];
  for (const layerId of requiredIds) {
    const record = preview.candidates.find((item) => item?.layerId === layerId);
    if (!record) throw new Error(`Layered preview is missing ${layerId}.`);

    const candidateRunDirectory = resolveRequiredPath(
      record.candidateRunDirectory,
      'candidateRunDirectory',
    );
    assertInside(
      candidateRoot,
      candidateRunDirectory,
      `${layerId} candidate run`,
    );

    const candidatePath = resolveRequiredPath(
      record.candidatePath,
      'candidatePath',
    );
    assertInside(
      candidateRunDirectory,
      candidatePath,
      `${layerId} candidate PNG`,
    );
    if (!(await exists(candidatePath))) {
      throw new Error(`${layerId} candidate not found: ${candidatePath}`);
    }

    const qaPath = resolveRequiredPath(record.qaPath, 'qaPath');
    assertQaEvidencePath(
      qaPath,
      candidateRunDirectory,
      previewDirectory,
      layerId,
    );
    if (!(await exists(qaPath))) {
      throw new Error(`${layerId} QA report not found: ${qaPath}`);
    }
    const qa = JSON.parse(await readFile(qaPath, 'utf8'));
    if (!qaPasses(qa)) {
      throw new Error(`${layerId} upstream QA is not passing.`);
    }

    const bytes = await readFile(candidatePath);
    const checksum = sha256(bytes);
    const recordedChecksum = normalizeSha256(
      record.candidateChecksum,
      `${layerId} layered preview candidateChecksum`,
    );
    if (recordedChecksum && recordedChecksum !== checksum) {
      throw new Error(
        `${layerId} checksum no longer matches the layered preview evidence.`,
      );
    }

    const layer = shot.layers?.find((item) => item.id === layerId);
    if (!layer?.path) {
      throw new Error(`${layerId} has no canonical animation-v1 path.`);
    }
    const targetPath = resolve(ASSET_ROOT, layer.path);
    assertInside(ASSET_ROOT, targetPath, `${layerId} target`);

    candidates.push({
      layerId,
      candidateRunDirectory,
      candidatePath,
      qaPath,
      qaType: record.qaType ?? qa.type ?? qa.verificationType ?? 'unknown',
      coverageAdvisory: record.coverageAdvisory ?? qa.coverageAdvisory ?? null,
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

  printPlan({
    shot,
    previewDirectory,
    layeredQaPath,
    candidates,
    dimensions,
  });

  if (!options.apply) {
    console.log('');
    console.log('DRY RUN ONLY — no animation-v1 file or manifest was modified.');
    console.log(
      `To promote after human review: pnpm animation:shot:promote -- --shot=${options.shotNumber} --confirm=${confirmation}`,
    );
    return;
  }

  if (options.confirm !== confirmation) {
    throw new Error(
      `Promotion requires explicit human confirmation: --confirm=${confirmation}`,
    );
  }

  await promote({
    manifest,
    manifestPath,
    manifestBeforeChecksum: sha256(manifestBytes),
    shot,
    previewDirectory,
    layeredQaPath,
    candidates,
    dimensions,
    promotionRoot,
    confirmation,
  });
}

async function promote({
  manifest,
  manifestPath,
  manifestBeforeChecksum,
  shot,
  previewDirectory,
  layeredQaPath,
  candidates,
  dimensions,
  promotionRoot,
  confirmation,
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
    layer.sha256 = `sha256:${candidate.checksum}`;
    const reviewNotes = Array.isArray(layer.review?.notes)
      ? layer.review.notes
      : [];
    layer.review = {
      status: 'approved',
      notes: [
        ...reviewNotes,
        `Human-approved from layered Shot ${shot.sourceShotNumber} audition ${basename(previewDirectory)} at ${approvedAt}.`,
        `${candidate.qaType} PASS: ${candidate.qaPath}`,
        ...(candidate.coverageAdvisory
          ? [`Coverage advisory at approval: ${candidate.coverageAdvisory}.`]
          : []),
      ],
    };
  }
  shot.status = 'approved';

  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
  const manifestTempPath = `${manifestPath}.promotion-${stamp}.tmp`;
  await writeFile(manifestTempPath, manifestText, 'utf8');
  await rename(manifestTempPath, manifestPath);
  const manifestAfterChecksum = sha256(Buffer.from(manifestText, 'utf8'));

  await mkdir(promotionRoot, { recursive: true });
  const receiptPath = join(promotionRoot, `${stamp}.json`);
  const receipt = {
    schemaVersion: 2,
    type: 'layered-shot-candidate-promotion',
    approvedAt,
    humanConfirmation: confirmation,
    manifestPath,
    manifestBeforeChecksum: `sha256:${manifestBeforeChecksum}`,
    manifestAfterChecksum: `sha256:${manifestAfterChecksum}`,
    shot: {
      shotId: shot.shotId,
      sourceShotNumber: shot.sourceShotNumber,
    },
    previewDirectory,
    layeredQaPath,
    sharedAssetDimensions: dimensions,
    layers: candidates.map((candidate) => ({
      layerId: candidate.layerId,
      sourceCandidatePath: candidate.candidatePath,
      upstreamQaPath: candidate.qaPath,
      qaType: candidate.qaType,
      coverageAdvisory: candidate.coverageAdvisory,
      sha256: `sha256:${candidate.checksum}`,
      targetPath: candidate.targetPath,
    })),
    policy: {
      editorialV1Modified: false,
      requiredLayerCount: candidates.length,
      manifestStateSetApproved: true,
      humanReviewSetApproved: true,
      automaticPromotionAllowed: false,
    },
  };
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');

  console.log('');
  console.log(`Shot ${shot.sourceShotNumber} promotion complete.`);
  for (const candidate of candidates) {
    console.log(`[approved] ${candidate.layerId} → ${candidate.targetPath}`);
  }
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Promotion receipt: ${receiptPath}`);
  console.log('editorial-v1 was NOT modified.');
  console.log(
    `Shot ${shot.sourceShotNumber} now satisfies the manifest approval side of layered activation.`,
  );
}

function printPlan({
  shot,
  previewDirectory,
  layeredQaPath,
  candidates,
  dimensions,
}) {
  console.log(`Shot ${shot.sourceShotNumber} layered promotion gate`);
  console.log(`[ok] shot: ${shot.shotId}`);
  console.log(`[ok] layered preview: ${previewDirectory}`);
  console.log(`[ok] layered QA PASS: ${layeredQaPath}`);
  console.log(
    `[ok] required candidate set: ${candidates.length}/${candidates.length}`,
  );
  console.log(
    `[ok] shared asset resolution: ${dimensions.width}x${dimensions.height}`,
  );
  for (const candidate of candidates) {
    console.log(
      `[ok] ${candidate.layerId}: ${candidate.qaType} PASS${
        candidate.coverageAdvisory
          ? ` · ${candidate.coverageAdvisory}`
          : ''
      } · sha256:${candidate.checksum.slice(0, 12)}…`,
    );
    console.log(`     source: ${candidate.candidatePath}`);
    console.log(`     target: ${candidate.targetPath}`);
  }
  console.log('[ok] editorial-v1 remains immutable');
}

async function newestQaPassedPreview(layeredPreviewRoot, previewType) {
  let entries;
  try {
    entries = await readdir(layeredPreviewRoot, { withFileTypes: true });
  } catch {
    throw new Error(`No layered preview root found at ${layeredPreviewRoot}.`);
  }

  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(layeredPreviewRoot, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));

  for (const directory of directories) {
    try {
      const qa = JSON.parse(
        await readFile(join(directory, 'motion-qa.json'), 'utf8'),
      );
      const preview = JSON.parse(
        await readFile(join(directory, 'preview-manifest.json'), 'utf8'),
      );
      if (qa.pass === true && preview.previewType === previewType) {
        return directory;
      }
    } catch {
      // Ignore incomplete or older previews.
    }
  }

  throw new Error(
    `No QA-passed ${previewType} preview was found under ${layeredPreviewRoot}.`,
  );
}

function parseOptions(args) {
  const result = {
    apply: false,
    confirm: undefined,
    previewDir: undefined,
    manifest: undefined,
    shotNumber: undefined,
  };

  for (const arg of args) {
    if (arg === '--apply') result.apply = true;
    else if (arg.startsWith('--confirm=')) {
      result.confirm = arg.slice('--confirm='.length);
    } else if (arg.startsWith('--preview-dir=')) {
      result.previewDir = arg.slice('--preview-dir='.length);
    } else if (arg.startsWith('--manifest=')) {
      result.manifest = arg.slice('--manifest='.length);
    } else if (arg.startsWith('--shot=')) {
      const value = Number(arg.slice('--shot='.length));
      if (!Number.isInteger(value) || value < 1) {
        throw new Error(`Invalid ${arg}`);
      }
      result.shotNumber = value;
    } else {
      throw new Error(`Unknown option ${arg}`);
    }
  }

  if (!result.shotNumber) {
    throw new Error('A positive --shot=<number> is required.');
  }
  return result;
}

function qaPasses(qa) {
  return qa?.pass === true || qa?.qaStatus === 'PASS';
}

function assertQaEvidencePath(
  qaPath,
  candidateRunDirectory,
  previewDirectory,
  layerId,
) {
  if (isInside(candidateRunDirectory, qaPath)) return;
  if (isInside(previewDirectory, qaPath)) return;
  if (isInside(PREVIEW_ROOT, qaPath)) return;
  throw new Error(
    `${layerId} QA evidence must remain under its candidate run or animation preview root: ${qaPath}`,
  );
}

function resolveRequiredPath(value, label) {
  if (typeof value !== 'string' || !value) {
    throw new Error(`Missing ${label}.`);
  }
  return resolve(value);
}

function normalizeSha256(value, label) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string.`);
  }
  const normalized = value.startsWith('sha256:')
    ? value.slice('sha256:'.length)
    : value;
  if (!/^[0-9a-f]{64}$/i.test(normalized)) {
    throw new Error(`${label} is not a valid SHA-256 digest.`);
  }
  return normalized.toLowerCase();
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
