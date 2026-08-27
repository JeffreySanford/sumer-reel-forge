import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

const ROOT = resolve('.');
const ACTOR_PREP_ROOT = resolve('tmp/animation-assets/actor-prep/enki/v1');
const THRESHOLDS = Object.freeze([1, 8, 24, 48, 96, 160, 224]);

const workspace = latestWorkspace();
const sourceReceipt = JSON.parse(
  readFileSync(join(workspace, 'evidence', 'source-receipt.json'), 'utf8'),
);
const registeredPath = resolve(sourceReceipt.sourcePath);
if (!existsSync(registeredPath)) {
  throw new Error(`Accepted registered Enki source is missing: ${registeredPath}`);
}

const variantDirectory = dirname(registeredPath);
const runDirectory = dirname(variantDirectory);
const reportPath = join(runDirectory, 'shot03-roi-segmentation-search.json');
if (!existsSync(reportPath)) {
  throw new Error(`ROI search report is missing beside accepted Enki source: ${reportPath}`);
}
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const accepted = (report.results ?? []).find(
  (item) => item.target === 'enki' && resolve(item.registeredPath) === registeredPath,
);
if (!accepted?.cropCandidatePath) {
  throw new Error('Could not resolve the original Enki crop candidate from the ROI search receipt.');
}
const cropCandidatePath = resolve(accepted.cropCandidatePath);
if (!existsSync(cropCandidatePath)) {
  throw new Error(`Original Enki crop candidate is missing: ${cropCandidatePath}`);
}

console.log('Shot 3 Enki registration alpha diagnostic');
console.log(`ROI report: ${reportPath}`);
console.log(`Crop candidate: ${cropCandidatePath}`);
console.log(`Registered accepted source: ${registeredPath}`);
console.log('');

const cropProbe = probe(cropCandidatePath);
const registeredProbe = probe(registeredPath);
printProbe('CROP CANDIDATE', cropProbe);
printProbe('REGISTERED SOURCE', registeredProbe);

console.log('');
console.log('[ALPHA BBOX PROFILE — crop candidate]');
printProfile(cropCandidatePath, cropProbe.width, cropProbe.height);
console.log('');
console.log('[ALPHA BBOX PROFILE — registered source]');
printProfile(registeredPath, registeredProbe.width, registeredProbe.height);

const cropHasAlpha = hasAlphaPixelFormat(cropProbe.pixFmt);
const registeredHasAlpha = hasAlphaPixelFormat(registeredProbe.pixFmt);
console.log('');
if (cropHasAlpha && !registeredHasAlpha) {
  console.log('[ROOT-CAUSE CANDIDATE] The SAM crop has an alpha-capable pixel format but registration dropped alpha.');
  console.log('[NEXT] Repair registration deterministically from this exact crop candidate; do not rerun SAM.');
} else if (cropHasAlpha && registeredHasAlpha) {
  console.log('[INFO] Both files have alpha-capable pixel formats; compare their alpha bbox profiles to determine whether registration forced alpha opaque.');
} else {
  console.log('[INFO] The crop candidate itself is not alpha-capable; registration is not the first alpha-loss point.');
  console.log('[NEXT] Diagnose the candidate-generation representation rather than changing semantic thresholds.');
}
console.log('[STOP] Diagnostic only. No files were mutated and no model was invoked.');

function latestWorkspace() {
  if (!existsSync(ACTOR_PREP_ROOT)) throw new Error(`Missing actor-prep root: ${ACTOR_PREP_ROOT}`);
  const entries = readdirSync(ACTOR_PREP_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(ACTOR_PREP_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));
  for (const candidate of entries) {
    const packetReceiptPath = join(candidate, 'evidence', 'packet-receipt.json');
    const sourceReceiptPath = join(candidate, 'evidence', 'source-receipt.json');
    if (!existsSync(packetReceiptPath) || !existsSync(sourceReceiptPath)) continue;
    try {
      const receipt = JSON.parse(readFileSync(packetReceiptPath, 'utf8'));
      if (receipt.pass === true) return candidate;
    } catch {
      // continue to older workspace
    }
  }
  throw new Error('No passing actor-prep workspace is available.');
}

function probe(path) {
  const result = spawnSync(
    'ffprobe',
    [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,pix_fmt,color_range,color_space',
      '-of', 'json',
      path,
    ],
    { cwd: ROOT, encoding: 'utf8', windowsHide: true, shell: false },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffprobe failed for ${path}: ${result.stderr || result.status}`);
  const parsed = JSON.parse(result.stdout || '{}');
  const stream = parsed.streams?.[0];
  if (!stream) throw new Error(`ffprobe returned no video stream for ${path}`);
  return {
    width: Number(stream.width),
    height: Number(stream.height),
    pixFmt: String(stream.pix_fmt ?? ''),
    colorRange: stream.color_range ?? null,
    colorSpace: stream.color_space ?? null,
  };
}

function printProbe(label, probe) {
  console.log(`[${label}] ${probe.width}x${probe.height} · pix_fmt=${probe.pixFmt || '(unknown)'} · alpha-capable=${hasAlphaPixelFormat(probe.pixFmt) ? 'YES' : 'no'}`);
}

function printProfile(path, width, height) {
  for (const threshold of THRESHOLDS) {
    const bounds = detectBounds(path, threshold);
    if (!bounds) {
      console.log(`alpha>=${String(threshold).padStart(3)} · no surviving pixels`);
      continue;
    }
    const coverage = (bounds.width * bounds.height) / (width * height);
    console.log(`alpha>=${String(threshold).padStart(3)} · bbox x=${bounds.x}, y=${bounds.y}, ${bounds.width}x${bounds.height} · bbox coverage ${(coverage * 100).toFixed(2)}%`);
  }
}

function detectBounds(path, threshold) {
  const result = spawnSync(
    'ffmpeg',
    [
      '-hide_banner', '-loglevel', 'info', '-i', path,
      '-vf', `alphaextract,bbox=min_val=${threshold}`,
      '-frames:v', '1', '-f', 'null', '-',
    ],
    { cwd: ROOT, encoding: 'utf8', windowsHide: true, shell: false },
  );
  if (result.error) throw result.error;
  const text = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const matches = [...text.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)];
  if (!matches.length) return null;
  const [, w, h, x, y] = matches.at(-1);
  return { x: Number(x), y: Number(y), width: Number(w), height: Number(h) };
}

function hasAlphaPixelFormat(pixFmt) {
  return /(^|_)(rgba|bgra|argb|abgr|ya|yuva|gbrap|pal8)/i.test(String(pixFmt));
}
