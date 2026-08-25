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
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';

const MANIFEST_PATH = resolve(
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/manifest.json',
);
const ASSET_ROOT = resolve('assets');
const PREVIEW_ROOT = resolve('tmp/animation-previews/shot03-level2-preview');
const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const PROMOTION_ROOT = resolve('tmp/animation-assets/promotions/shot03-level2');
const EXPECTED_PREVIEW_TYPE = 'shot03-level2-optional-layer-audition';
const EXPECTED_LAYER_IDS = ['shot03-enki-eyes-v1', 'shot03-rigging-v1'];
const CONFIRMATION = 'APPROVE_SHOT_3_LEVEL2';

const options = parseOptions(process.argv.slice(2).filter((arg) => arg !== '--'));

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const previewDirectory = options.previewDir
    ? resolve(options.previewDir)
    : await newestCompletePreview();
  assertInside(PREVIEW_ROOT, previewDirectory, 'Level 2 reviewed preview');

  const manifestBytes = await readFile(MANIFEST_PATH);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const shot = manifest.shots?.find((item) => item.sourceShotNumber === 3);
  if (!shot) throw new Error('Shot 3 is missing from the canonical animation manifest.');

  const previewPath = join(previewDirectory, 'preview-manifest.json');
  const preview = JSON.parse(await readFile(previewPath, 'utf8'));
  validatePreview(preview);

  const videoPath = resolveRequiredPath(preview.output?.path, 'preview.output.path');
  assertInside(previewDirectory, videoPath, 'Reviewed Level 2 video');
  await access(videoPath);
  const videoChecksum = prefixedSha(await readFile(videoPath));
  if (normalizeSha(preview.output?.checksum) !== normalizeSha(videoChecksum)) {
    throw new Error('Reviewed Level 2 video checksum no longer matches preview evidence.');
  }

  const layers = [];
  for (const layerId of EXPECTED_LAYER_IDS) {
    const manifestLayer = shot.layers?.find((item) => item.id === layerId);
    if (!manifestLayer?.path) throw new Error(`${layerId} is missing its canonical target path.`);
    if (!['planned', 'approved'].includes(manifestLayer.state)) {
      throw new Error(`${layerId} has unexpected manifest state ${manifestLayer.state}.`);
    }

    const record = preview.candidates.find((item) => item.layerId === layerId);
    if (!record) throw new Error(`Reviewed preview is missing ${layerId}.`);

    const runDirectory = resolveRequiredPath(
      record.candidateRunDirectory,
      `${layerId}.candidateRunDirectory`,
    );
    assertInside(CANDIDATE_ROOT, runDirectory, `${layerId} candidate run`);

    const candidatePath = resolveRequiredPath(record.candidatePath, `${layerId}.candidatePath`);
    assertInside(runDirectory, candidatePath, `${layerId} candidate PNG`);
    await access(candidatePath);

    const qaPath = resolveRequiredPath(record.qaPath, `${layerId}.qaPath`);
    assertInside(runDirectory, qaPath, `${layerId} QA evidence`);
    const qa = JSON.parse(await readFile(qaPath, 'utf8'));
    if (!(qa.pass === true || qa.qaStatus === 'PASS')) {
      throw new Error(`${layerId} QA evidence is not passing.`);
    }

    const candidateBytes = await readFile(candidatePath);
    const candidateChecksum = prefixedSha(candidateBytes);
    if (normalizeSha(record.candidateChecksum) !== normalizeSha(candidateChecksum)) {
      throw new Error(`${layerId} candidate checksum no longer matches reviewed evidence.`);
    }

    const targetPath = resolve(ASSET_ROOT, manifestLayer.path);
    assertInside(ASSET_ROOT, targetPath, `${layerId} canonical target`);

    layers.push({
      layerId,
      manifestLayer,
      candidatePath,
      candidateChecksum,
      qaPath,
      qaType: record.qaType ?? qa.type ?? qa.verificationType ?? 'layer QA',
      targetPath,
    });
  }

  printPlan({ previewDirectory, previewPath, videoPath, videoChecksum, layers });

  if (!options.apply) {
    console.log('');
    console.log('DRY RUN ONLY — no canonical asset or manifest was modified.');
    console.log('After watching and approving this exact MP4, run:');
    console.log(
      `node tools/scripts/shot03-level2-promote-reviewed.mjs --apply --preview-dir="${previewDirectory}" --confirm=${CONFIRMATION}`,
    );
    return;
  }

  if (!options.previewDir) {
    throw new Error('--apply requires an explicit --preview-dir so approval is tied to the exact watched MP4.');
  }
  if (options.confirm !== CONFIRMATION) {
    throw new Error(`Promotion requires explicit human confirmation: --confirm=${CONFIRMATION}`);
  }

  await applyPromotion({
    manifest,
    manifestBytes,
    shot,
    previewDirectory,
    previewPath,
    videoPath,
    videoChecksum,
    layers,
  });
}

function validatePreview(preview) {
  if (preview.previewType !== EXPECTED_PREVIEW_TYPE) {
    throw new Error(
      `Unexpected preview type ${preview.previewType ?? 'unknown'}; expected ${EXPECTED_PREVIEW_TYPE}.`,
    );
  }
  if (preview.sourceShotNumber !== 3) throw new Error('Reviewed preview is not Shot 3.');
  if (preview.approvalPolicy?.humanApprovalRequired !== true) {
    throw new Error('Level 2 preview does not require human approval.');
  }
  if (
    preview.approvalPolicy?.manifestMutated !== false ||
    preview.approvalPolicy?.candidatesPromoted !== false ||
    preview.approvalPolicy?.animationV1Modified !== false
  ) {
    throw new Error('Level 2 preview is not an immutable audition record.');
  }
  const ids = [...(preview.optionalCandidateLayerIds ?? [])].sort();
  const candidateIds = (preview.candidates ?? []).map((item) => item.layerId).sort();
  if (JSON.stringify(ids) !== JSON.stringify(EXPECTED_LAYER_IDS)) {
    throw new Error(`Reviewed optional layer set must be exactly: ${EXPECTED_LAYER_IDS.join(', ')}.`);
  }
  if (JSON.stringify(candidateIds) !== JSON.stringify(EXPECTED_LAYER_IDS)) {
    throw new Error(`Reviewed candidate set must be exactly: ${EXPECTED_LAYER_IDS.join(', ')}.`);
  }
}

async function applyPromotion({
  manifest,
  manifestBytes,
  shot,
  previewDirectory,
  previewPath,
  videoPath,
  videoChecksum,
  layers,
}) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const staged = [];
  try {
    for (const layer of layers) {
      await mkdir(dirname(layer.targetPath), { recursive: true });
      if (await exists(layer.targetPath)) {
        const existingChecksum = prefixedSha(await readFile(layer.targetPath));
        if (normalizeSha(existingChecksum) !== normalizeSha(layer.candidateChecksum)) {
          throw new Error(`${layer.layerId} canonical target exists with different bytes; refusing overwrite.`);
        }
        staged.push({ ...layer, tempPath: null });
        continue;
      }
      const tempPath = `${layer.targetPath}.level2-${stamp}.tmp`;
      await copyFile(layer.candidatePath, tempPath);
      const stagedChecksum = prefixedSha(await readFile(tempPath));
      if (normalizeSha(stagedChecksum) !== normalizeSha(layer.candidateChecksum)) {
        throw new Error(`${layer.layerId} staged checksum mismatch.`);
      }
      staged.push({ ...layer, tempPath });
    }

    for (const layer of staged) {
      if (layer.tempPath) await rename(layer.tempPath, layer.targetPath);
    }
  } finally {
    await Promise.all(
      staged.map(async (layer) => {
        if (layer.tempPath && (await exists(layer.tempPath))) await rm(layer.tempPath, { force: true });
      }),
    );
  }

  const approvedAt = new Date().toISOString();
  for (const layer of layers) {
    const notes = Array.isArray(layer.manifestLayer.review?.notes)
      ? layer.manifestLayer.review.notes
      : [];
    layer.manifestLayer.state = 'approved';
    layer.manifestLayer.sha256 = layer.candidateChecksum;
    layer.manifestLayer.review = {
      status: 'approved',
      notes: [
        ...notes,
        `Human-approved from Shot 3 Level 2 audition ${basename(previewDirectory)} at ${approvedAt}.`,
        `Reviewed MP4: ${videoPath}`,
        `${layer.qaType} PASS: ${layer.qaPath}`,
      ],
    };
  }
  shot.status = 'approved';

  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
  const manifestTempPath = `${MANIFEST_PATH}.level2-${stamp}.tmp`;
  await writeFile(manifestTempPath, manifestText, 'utf8');
  await rename(manifestTempPath, MANIFEST_PATH);

  await mkdir(PROMOTION_ROOT, { recursive: true });
  const receiptPath = join(PROMOTION_ROOT, `${stamp}.json`);
  await writeFile(
    receiptPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        type: 'shot03-level2-optional-layer-promotion',
        approvedAt,
        humanConfirmation: CONFIRMATION,
        previewDirectory,
        previewManifestPath: previewPath,
        reviewedVideoPath: videoPath,
        reviewedVideoChecksum: videoChecksum,
        manifestPath: MANIFEST_PATH,
        manifestBeforeChecksum: prefixedSha(manifestBytes),
        manifestAfterChecksum: prefixedSha(Buffer.from(manifestText, 'utf8')),
        layers: layers.map((layer) => ({
          layerId: layer.layerId,
          sourceCandidatePath: layer.candidatePath,
          sourceQaPath: layer.qaPath,
          sha256: layer.candidateChecksum,
          targetPath: layer.targetPath,
        })),
        policy: {
          editorialV1Modified: false,
          exactReviewedPreviewRequired: true,
          humanApprovalRequired: true,
          automaticPromotionAllowed: false,
        },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  console.log('');
  console.log('Shot 3 Level 2 optional-layer promotion complete.');
  for (const layer of layers) console.log(`[approved] ${layer.layerId} -> ${layer.targetPath}`);
  console.log(`Manifest: ${MANIFEST_PATH}`);
  console.log(`Promotion receipt: ${receiptPath}`);
  console.log('editorial-v1 was NOT modified.');
  console.log('Next: pnpm renderer:test && node tools/scripts/shot03-level2-dev-loop.mjs --skip-preview');
}

function printPlan({ previewDirectory, previewPath, videoPath, videoChecksum, layers }) {
  console.log('Shot 3 Level 2 reviewed promotion plan');
  console.log(`[ok] preview directory: ${previewDirectory}`);
  console.log(`[ok] preview manifest: ${previewPath}`);
  console.log(`[ok] reviewed video: ${videoPath}`);
  console.log(`[ok] reviewed video checksum: ${videoChecksum}`);
  console.log(`[ok] exact optional set: ${EXPECTED_LAYER_IDS.join(', ')}`);
  for (const layer of layers) {
    console.log(`[ok] ${layer.layerId}: QA PASS + checksum verified -> ${layer.targetPath}`);
  }
  console.log('[ok] human approval required; automatic promotion disabled');
}

async function newestCompletePreview() {
  let entries;
  try {
    entries = await readdir(PREVIEW_ROOT, { withFileTypes: true });
  } catch {
    throw new Error(`No Shot 3 Level 2 preview root found at ${PREVIEW_ROOT}.`);
  }
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(PREVIEW_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  for (const directory of directories) {
    try {
      const preview = JSON.parse(await readFile(join(directory, 'preview-manifest.json'), 'utf8'));
      if (preview.previewType !== EXPECTED_PREVIEW_TYPE) continue;
      const ids = [...(preview.optionalCandidateLayerIds ?? [])].sort();
      if (JSON.stringify(ids) !== JSON.stringify(EXPECTED_LAYER_IDS)) continue;
      await access(join(directory, 'shot03-level2-candidate-preview.mp4'));
      return directory;
    } catch {
      // Keep looking for the newest complete combined preview.
    }
  }
  throw new Error('No complete rigging + blink Level 2 preview is available for promotion planning.');
}

function parseOptions(args) {
  const result = { apply: false, previewDir: null, confirm: null };
  for (const arg of args) {
    if (arg === '--apply') result.apply = true;
    else if (arg.startsWith('--preview-dir=')) result.previewDir = arg.slice('--preview-dir='.length);
    else if (arg.startsWith('--confirm=')) result.confirm = arg.slice('--confirm='.length);
    else throw new Error(`Unknown option ${arg}`);
  }
  return result;
}

function resolveRequiredPath(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is missing.`);
  return isAbsolute(value) ? resolve(value) : resolve(value);
}

function normalizeSha(value) {
  return String(value ?? '').replace(/^sha256:/i, '').toLowerCase();
}

function prefixedSha(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function assertInside(parent, child, label) {
  const path = relative(resolve(parent), resolve(child));
  if (path.startsWith('..') || isAbsolute(path)) {
    throw new Error(`${label} must remain under ${parent}: ${child}`);
  }
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
