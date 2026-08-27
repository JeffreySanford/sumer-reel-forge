import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve('.');
const ACTOR_PREP_ROOT = resolve('tmp/animation-assets/actor-prep/enki/v1');

const workspace = latestWorkspace();
const actorPrep = JSON.parse(readFileSync(join(workspace, 'actor-prep.json'), 'utf8'));
const sourceReceipt = JSON.parse(readFileSync(join(workspace, 'evidence', 'source-receipt.json'), 'utf8'));
const source = {
  width: Number(actorPrep?.source?.width),
  height: Number(actorPrep?.source?.height),
};
if (!Number.isInteger(source.width) || !Number.isInteger(source.height) || source.width <= 0 || source.height <= 0) {
  throw new Error('Actor-prep source dimensions are invalid.');
}

const acceptedRegisteredPath = resolve(sourceReceipt.sourcePath);
const variantDirectory = dirname(acceptedRegisteredPath);
const runDirectory = dirname(variantDirectory);
const reportPath = join(runDirectory, 'shot03-roi-segmentation-search.json');
if (!existsSync(reportPath)) throw new Error(`Missing original ROI-search report: ${reportPath}`);
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const located = report.locator?.targets?.find((item) => item.target === 'enki');
if (!located?.found || !located?.bboxPixels) {
  throw new Error('Original ROI-search report does not contain a found Enki locator box.');
}
const crop = normalizePixelBox(located.bboxPixels, source);
const cropAreaShare = (crop.width * crop.height) / (source.width * source.height);
if (cropAreaShare >= 0.9) {
  throw new Error(`Exact Enki locator crop still covers ${(cropAreaShare * 100).toFixed(2)}% of the frame; refusing near-full-frame proxy.`);
}

const guidePath = resolve(report.sourcePath);
if (!existsSync(guidePath)) throw new Error(`Immutable editorial vision guide is missing: ${guidePath}`);

const archivedAttempt = archiveExistingDiscovery(workspace);
const discoveryDirectory = join(workspace, 'semantic-discovery');
mkdirSync(discoveryDirectory, { recursive: true });
const proxyPath = join(discoveryDirectory, 'semantic-locator-crop.png');
const metadataPath = join(discoveryDirectory, 'semantic-vision-proxy.json');
renderExactCrop(guidePath, proxyPath, crop);

const metadata = {
  schemaVersion: 1,
  type: 'actor-semantic-vision-proxy',
  proxyKind: 'locator-crop',
  source,
  crop,
  cropAreaShare,
  actorPrepSourceSha256: actorPrep.source.sha256,
  actorPrepSourcePath: resolve(sourceReceipt.referencePath),
  visionGuidePath: guidePath,
  visionGuideRole: 'immutable editorial source from the original accepted ROI-search receipt',
  locatorReportPath: reportPath,
  locatorNormalized: located.bboxNormalized,
  locatorPixels: located.bboxPixels,
  locatorConfidence: located.confidence,
  paddingFraction: 0,
  priorAttemptArchive: archivedAttempt,
  sourcePixelsMutated: false,
  generatedSemanticPixels: false,
  samInvocations: 0,
  modelLocatorInvocations: 0,
  coordinatePolicy: 'reuse exact recorded Enki locator pixels; model returns crop-normalized semantic coordinates; hook remaps to original registered source frame',
};
writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');

console.log('Shot 3 Enki exact-locator semantic discovery autopilot');
console.log('Policy: reuse the exact original Enki locator box before the old 15% padding expanded it to full frame.');
console.log(`Workspace: ${workspace}`);
if (archivedAttempt) console.log(`Archived prior discovery evidence: ${archivedAttempt}`);
console.log(`Original locator: ${JSON.stringify(located.bboxPixels)} · confidence ${Math.round(Number(located.confidence ?? 0) * 100)}%`);
console.log(`Vision crop: x=${crop.x}, y=${crop.y}, ${crop.width}x${crop.height} · ${(cropAreaShare * 100).toFixed(2)}% of source`);
console.log(`Vision guide: ${guidePath}`);
console.log(`Vision crop file: ${proxyPath}`);
console.log('No locator rerun, no SAM, no alpha inference, no semantic threshold changes, no canonical mutation.');
console.log('');

const hook = pathToFileURL(resolve('tools/scripts/enki-semantic-vision-proxy-hook.mjs')).href;
const target = resolve('tools/scripts/shot03-enki-semantic-discovery.mjs');
const result = spawnSync(
  process.execPath,
  ['--import', hook, target, '--workspace', workspace, ...process.argv.slice(2)],
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

function latestWorkspace() {
  if (!existsSync(ACTOR_PREP_ROOT)) throw new Error(`Missing actor-prep root: ${ACTOR_PREP_ROOT}`);
  const candidates = readdirSync(ACTOR_PREP_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(ACTOR_PREP_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  for (const candidate of candidates) {
    const packetReceiptPath = join(candidate, 'evidence', 'packet-receipt.json');
    const sourceReceiptPath = join(candidate, 'evidence', 'source-receipt.json');
    if (!existsSync(packetReceiptPath) || !existsSync(sourceReceiptPath)) continue;
    try {
      const receipt = JSON.parse(readFileSync(packetReceiptPath, 'utf8'));
      if (receipt.pass === true) return candidate;
    } catch {
      // continue to older candidate
    }
  }
  throw new Error('No passing Enki actor-prep workspace is available.');
}

function normalizePixelBox(box, sourceSize) {
  const x = Number(box.x);
  const y = Number(box.y);
  const width = Number(box.width);
  const height = Number(box.height);
  if (![x, y, width, height].every(Number.isInteger) || x < 0 || y < 0 || width <= 0 || height <= 0) {
    throw new Error(`Invalid recorded Enki locator pixels: ${JSON.stringify(box)}`);
  }
  if (x + width > sourceSize.width || y + height > sourceSize.height) {
    throw new Error('Recorded Enki locator crop exceeds actor-prep source registration.');
  }
  return { x, y, width, height };
}

function archiveExistingDiscovery(actorWorkspace) {
  const current = join(actorWorkspace, 'semantic-discovery');
  if (!existsSync(current) || readdirSync(current).length === 0) return null;
  const historyRoot = join(actorWorkspace, 'semantic-discovery-history');
  mkdirSync(historyRoot, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archive = join(historyRoot, `${stamp}-pre-locator-crop`);
  renameSync(current, archive);
  return archive;
}

function renderExactCrop(inputPath, outputPath, box) {
  const result = spawnSync(
    'ffmpeg',
    [
      '-y', '-hide_banner', '-loglevel', 'error', '-i', inputPath,
      '-vf', `crop=${box.width}:${box.height}:${box.x}:${box.y}`,
      '-frames:v', '1', '-update', '1', outputPath,
    ],
    { cwd: ROOT, encoding: 'utf8', windowsHide: true, shell: false },
  );
  if (result.error) throw result.error;
  if (result.status !== 0 || !existsSync(outputPath)) {
    throw new Error(`FFmpeg exact-locator crop failed: ${result.stderr || `exit ${result.status}`}`);
  }
}
