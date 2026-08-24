import { createHash } from 'node:crypto';
import {
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
import { materialPromotionRejectionReason } from '../renderer/promotion-material-policy.mjs';

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
  if (!shot) throw new Error(`Shot ${options.shotNumber} is missing from the animation manifest.`);

  const shotLabel = String(options.shotNumber).padStart(2, '0');
  const previewType = `shot${shotLabel}-layered-candidate-preview`;
  const layeredPreviewRoot = resolve(PREVIEW_ROOT, `shot${shotLabel}-layered-preview`);
  const candidateRoot = resolve('tmp/animation-assets/candidates', manifest.manifestId);
  const promotionRoot = resolve(PROMOTION_BASE, `shot${shotLabel}`);
  const confirmation = `APPROVE_SHOT_${options.shotNumber}`;
  const requiredIds = [...(shot.activationPolicy?.requiredLayerIds ?? [])].sort();
  if (!requiredIds.length) {
    throw new Error(`Shot ${options.shotNumber} has no required activation layers.`);
  }

  const previewDirectory = options.previewDir
    ? resolve(options.previewDir)
    : await newestFullyReviewedPreview(layeredPreviewRoot, previewType);
  assertInside(layeredPreviewRoot, previewDirectory, 'Reviewed layered preview');

  const preview = JSON.parse(
    await readFile(join(previewDirectory, 'preview-manifest.json'), 'utf8'),
  );
  const reviewPath = join(previewDirectory, 'shot-review.json');
  const review = JSON.parse(await readFile(reviewPath, 'utf8'));
  const motionPath = join(previewDirectory, 'motion-qa.json');
  const materialPath = join(previewDirectory, 'material-motion-qa.json');
  const containmentPath = join(previewDirectory, 'contained-material-boundary-qa.json');
  const motion = JSON.parse(await readFile(motionPath, 'utf8'));
  const material = JSON.parse(await readFile(materialPath, 'utf8'));
  const containment = (await exists(containmentPath))
    ? JSON.parse(await readFile(containmentPath, 'utf8'))
    : null;

  assertReviewEvidence({
    shot,
    preview,
    previewType,
    review,
    motion,
    material,
    containment,
  });

  const previewIds = (preview.candidates ?? [])
    .map((item) => item?.layerId)
    .filter((value) => typeof value === 'string')
    .sort();
  if (JSON.stringify(previewIds) !== JSON.stringify(requiredIds)) {
    throw new Error(
      `Reviewed candidate set does not match activation requirements. Required: ${requiredIds.join(', ')}. Reviewed: ${previewIds.join(', ')}.`,
    );
  }

  const candidates = [];
  for (const layerId of requiredIds) {
    const record = preview.candidates.find((item) => item?.layerId === layerId);
    if (!record) throw new Error(`Reviewed preview is missing ${layerId}.`);

    const candidateRunDirectory = resolveRequiredPath(
      record.candidateRunDirectory,
      'candidateRunDirectory',
    );
    assertInside(candidateRoot, candidateRunDirectory, `${layerId} candidate run`);
    const candidatePath = resolveRequiredPath(record.candidatePath, 'candidatePath');
    assertInside(candidateRunDirectory, candidatePath, `${layerId} candidate PNG`);
    if (!(await exists(candidatePath))) {
      throw new Error(`${layerId} candidate is missing: ${candidatePath}`);
    }

    const qaPath = resolveRequiredPath(record.qaPath, 'qaPath');
    if (!(await exists(qaPath))) throw new Error(`${layerId} QA evidence is missing: ${qaPath}`);
    const qa = JSON.parse(await readFile(qaPath, 'utf8'));
    if (!(qa?.pass === true || qa?.qaStatus === 'PASS')) {
      throw new Error(`${layerId} upstream QA is not passing.`);
    }

    const bytes = await readFile(candidatePath);
    const checksum = sha256(bytes);
    const recordedChecksum = normalizeSha256(
      record.candidateChecksum,
      `${layerId} candidateChecksum`,
    );
    if (recordedChecksum && recordedChecksum !== checksum) {
      throw new Error(`${layerId} checksum no longer matches reviewed evidence.`);
    }

    const layer = shot.layers?.find((item) => item.id === layerId);
    if (!layer?.path) throw new Error(`${layerId} has no canonical animation-v1 path.`);
    const targetPath = resolve(ASSET_ROOT, layer.path);
    assertInside(ASSET_ROOT, targetPath, `${layerId} target`);

    candidates.push({
      layerId,
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
        `${candidate.layerId} dimensions do not match shared asset resolution ${dimensions.width}x${dimensions.height}.`,
      );
    }
  }

  printPlan({
    shot,
    previewDirectory,
    reviewPath,
    review,
    containment,
    candidates,
    dimensions,
  });

  if (!options.apply) {
    console.log('');
    console.log('DRY RUN ONLY — no animation-v1 file or manifest was modified.');
    console.log(
      `After human review: pnpm animation:shot:promote -- --shot=${options.shotNumber} --confirm=${confirmation}`,
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
    reviewPath,
    review,
    containmentPath: containment ? containmentPath : null,
    candidates,
    dimensions,
    promotionRoot,
    confirmation,
  });
}

function assertReviewEvidence({ shot, preview, previewType, review, motion, material, containment }) {
  if (preview.previewType !== previewType) {
    throw new Error(`Unexpected preview type ${preview.previewType ?? 'unknown'}; expected ${previewType}.`);
  }
  if (preview.sourceShotNumber !== shot.sourceShotNumber) {
    throw new Error('Reviewed preview shot number does not match the manifest shot.');
  }
  if (motion.pass !== true) throw new Error('Aggregate Scene V2 motion QA has not passed.');
  if (review.sourceShotNumber !== shot.sourceShotNumber) {
    throw new Error('shot-review.json does not match the requested shot.');
  }
  if (review.deterministic?.pass !== true) {
    throw new Error('Full deterministic shot review has not passed.');
  }
  if (review.deterministic?.aggregateSceneMotion?.pass !== true) {
    throw new Error('Reviewed aggregate scene gate is not passing.');
  }

  const materialReason = materialPromotionRejectionReason({
    shotNumber: shot.sourceShotNumber,
    material,
    review,
  });
  if (materialReason) {
    throw new Error(`Material promotion evidence rejected: ${materialReason}.`);
  }

  const requiresContainment = (shot.layers ?? []).some(
    (layer) =>
      (shot.activationPolicy?.requiredLayerIds ?? []).includes(layer.id) &&
      layer.role === 'water' &&
      layer.material === 'water' &&
      String(layer.anchor ?? '').includes('water-basin'),
  );
  if (requiresContainment && !containment) {
    throw new Error('Contained water requires contained-material-boundary-qa.json before promotion.');
  }
  if (containment && containment.pass !== true) {
    throw new Error('Contained-material boundary QA is not passing.');
  }
  if (requiresContainment && review.deterministic?.containedMaterialBoundary?.pass !== true) {
    throw new Error('shot-review.json does not record a passing contained-material boundary gate.');
  }

  if (!review.ai || review.ai.status === 'SKIPPED') {
    throw new Error('A completed source-aware AI review is required before promotion.');
  }
  if (review.ai.advisoryOnly !== true) {
    throw new Error('AI review must remain advisory-only.');
  }
  if (!review.approvalPolicy?.humanApprovalRequired) {
    throw new Error('Promotion policy must require human approval.');
  }
  if (review.approvalPolicy?.automaticPromotionAllowed !== false) {
    throw new Error('Automatic promotion must remain disabled.');
  }
}

async function promote({
  manifest,
  manifestPath,
  manifestBeforeChecksum,
  shot,
  previewDirectory,
  reviewPath,
  review,
  containmentPath,
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
            `${candidate.layerId} target already exists with a different checksum. Refusing overwrite.`,
          );
        }
        staged.push({ ...candidate, tempPath: null, alreadyPresent: true });
        continue;
      }
      const tempPath = `${candidate.targetPath}.promotion-${stamp}.tmp`;
      await copyFile(candidate.candidatePath, tempPath);
      if (sha256(await readFile(tempPath)) !== candidate.checksum) {
        throw new Error(`${candidate.layerId} staged copy checksum mismatch.`);
      }
      staged.push({ ...candidate, tempPath, alreadyPresent: false });
    }
    for (const candidate of staged) {
      if (candidate.tempPath) await rename(candidate.tempPath, candidate.targetPath);
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
    const notes = Array.isArray(layer.review?.notes) ? layer.review.notes : [];
    layer.review = {
      status: 'approved',
      notes: [
        ...notes,
        `Human-approved from full reviewed-shot gate ${basename(previewDirectory)} at ${approvedAt}.`,
        `Full shot review: ${reviewPath}`,
        ...(containmentPath ? [`Containment QA PASS: ${containmentPath}`] : []),
        `AI advisory status at approval: ${review.ai.status}${review.ai.rawStatus ? ` (raw ${review.ai.rawStatus})` : ''}.`,
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
    schemaVersion: 3,
    type: 'fully-reviewed-layered-shot-promotion',
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
    reviewPath,
    reviewFinalStateAtApproval: review.finalState,
    aiStatusAtApproval: review.ai.status,
    aiRawStatusAtApproval: review.ai.rawStatus ?? review.ai.status,
    containedMaterialBoundaryPath: containmentPath,
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
      deterministicReviewRequired: true,
      completedAiAdvisoryRequired: true,
      humanReviewSetApproved: true,
      automaticPromotionAllowed: false,
    },
  };
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');

  console.log('');
  console.log(`Shot ${shot.sourceShotNumber} reviewed promotion complete.`);
  for (const candidate of candidates) {
    console.log(`[approved] ${candidate.layerId} → ${candidate.targetPath}`);
  }
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Promotion receipt: ${receiptPath}`);
  console.log('editorial-v1 was NOT modified.');
}

function printPlan({ shot, previewDirectory, reviewPath, review, containment, candidates, dimensions }) {
  console.log(`Shot ${shot.sourceShotNumber} full reviewed promotion gate`);
  console.log(`[ok] shot: ${shot.shotId}`);
  console.log(`[ok] reviewed preview: ${previewDirectory}`);
  console.log(`[ok] aggregate deterministic QA`);
  console.log(`[ok] calibrated material-local QA`);
  console.log(
    `[${containment ? 'ok' : 'skip'}] contained-material boundary QA${containment ? '' : ' · not applicable'}`,
  );
  console.log(`[ok] completed AI advisory: ${review.ai.status}`);
  if (review.ai.rawStatus && review.ai.rawStatus !== review.ai.status) {
    console.log(`     raw AI status normalized by delta policy: ${review.ai.rawStatus}`);
  }
  console.log(`[ok] human approval remains required`);
  console.log(`[ok] review evidence: ${reviewPath}`);
  console.log(`[ok] required candidate set: ${candidates.length}/${candidates.length}`);
  console.log(`[ok] shared asset resolution: ${dimensions.width}x${dimensions.height}`);
  for (const candidate of candidates) {
    console.log(
      `[ok] ${candidate.layerId}: ${candidate.qaType} PASS · sha256:${candidate.checksum.slice(0, 12)}…`,
    );
    console.log(`     source: ${candidate.candidatePath}`);
    console.log(`     target: ${candidate.targetPath}`);
  }
  console.log('[ok] editorial-v1 remains immutable');
}

async function newestFullyReviewedPreview(root, previewType) {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    throw new Error(`No layered preview root found at ${root}.`);
  }
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));

  for (const directory of directories) {
    try {
      const preview = JSON.parse(
        await readFile(join(directory, 'preview-manifest.json'), 'utf8'),
      );
      const review = JSON.parse(await readFile(join(directory, 'shot-review.json'), 'utf8'));
      if (
        preview.previewType === previewType &&
        review.deterministic?.pass === true &&
        review.ai?.status &&
        review.ai.status !== 'SKIPPED'
      ) {
        return directory;
      }
    } catch {
      // Ignore incomplete and pre-modern-review directories.
    }
  }
  throw new Error(`No fully reviewed ${previewType} preview was found under ${root}.`);
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
    else if (arg.startsWith('--confirm=')) result.confirm = arg.slice('--confirm='.length);
    else if (arg.startsWith('--preview-dir=')) result.previewDir = arg.slice('--preview-dir='.length);
    else if (arg.startsWith('--manifest=')) result.manifest = arg.slice('--manifest='.length);
    else if (arg.startsWith('--shot=')) {
      const value = Number(arg.slice('--shot='.length));
      if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid ${arg}`);
      result.shotNumber = value;
    } else throw new Error(`Unknown option ${arg}`);
  }
  if (!result.shotNumber) throw new Error('A positive --shot=<number> is required.');
  return result;
}

function resolveRequiredPath(value, label) {
  if (typeof value !== 'string' || !value) throw new Error(`Missing ${label}.`);
  return resolve(value);
}

function normalizeSha256(value, label) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new Error(`${label} must be a string.`);
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
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

function assertInside(parent, child, label) {
  const path = relative(resolve(parent), resolve(child));
  if (path.startsWith('..') || isAbsolute(path)) {
    throw new Error(`${label} must remain under ${parent}: ${child}`);
  }
}
