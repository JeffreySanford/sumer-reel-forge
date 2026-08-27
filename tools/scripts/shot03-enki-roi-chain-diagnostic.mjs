import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

const ROOT = resolve('.');
const ACTOR_PREP_ROOT = resolve('tmp/animation-assets/actor-prep/enki/v1');

const workspace = latestWorkspace();
const sourceReceipt = JSON.parse(
  readFileSync(join(workspace, 'evidence', 'source-receipt.json'), 'utf8'),
);
const registeredPath = resolve(sourceReceipt.sourcePath);
const variantDirectory = dirname(registeredPath);
const runDirectory = dirname(variantDirectory);
const reportPath = join(runDirectory, 'shot03-roi-segmentation-search.json');
if (!existsSync(reportPath)) throw new Error(`Missing ROI report: ${reportPath}`);
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const accepted = (report.results ?? []).find(
  (item) => item.target === 'enki' && resolve(item.registeredPath) === registeredPath,
);
if (!accepted) throw new Error('Accepted Enki result not found in ROI report.');

const located = report.locator?.targets?.find((item) => item.target === 'enki') ?? null;
const cropSourcePath = resolve(accepted.cropPath);
const cropCandidatePath = resolve(accepted.cropCandidatePath);
for (const path of [cropSourcePath, cropCandidatePath, registeredPath]) {
  if (!existsSync(path)) throw new Error(`Expected diagnostic input missing: ${path}`);
}

console.log('Shot 3 Enki ROI chain diagnostic');
console.log(`ROI report: ${reportPath}`);
console.log(`Locator normalized: ${located?.bboxNormalized ? JSON.stringify(located.bboxNormalized) : '(missing)'}`);
console.log(`Locator pixels: ${located?.bboxPixels ? JSON.stringify(located.bboxPixels) : '(missing)'}`);
console.log(`Accepted padding: ${accepted.padding}`);
console.log(`Accepted ROI: ${JSON.stringify(accepted.roi)}`);
console.log('');
printFile('ROI SOURCE CROP', cropSourcePath);
printFile('SAM CANDIDATE', cropCandidatePath);
printFile('REGISTERED SOURCE', registeredPath);
console.log('');
console.log('[INTERPRETATION]');
const roiIsFullFrame = accepted.roi?.x === 0 && accepted.roi?.y === 0 &&
  accepted.roi?.width === report.sourceDimensions?.width &&
  accepted.roi?.height === report.sourceDimensions?.height;
console.log(`ROI full-frame: ${roiIsFullFrame ? 'YES' : 'no'}`);
const cropProbe = probe(cropCandidatePath);
const cropAlpha = alphaStats(cropCandidatePath);
if (roiIsFullFrame) {
  console.log('- The accepted ROI search never isolated Enki spatially before SAM; the candidate generator received the complete source frame.');
}
if (cropAlpha.min >= 254.5) {
  console.log('- The SAM candidate alpha plane is effectively fully opaque; JoinImageWithAlpha did not produce a useful subject mask in this output.');
}
if (!roiIsFullFrame && cropProbe.width === report.sourceDimensions?.width && cropProbe.height === report.sourceDimensions?.height) {
  console.log('- Candidate dimensions unexpectedly expanded back to full source dimensions; inspect generator/workflow registration semantics.');
}
console.log('[STOP] Diagnostic only. No source/model/canonical mutation.');

function printFile(label, path) {
  const p = probe(path);
  const a = alphaStats(path);
  console.log(`[${label}]`);
  console.log(`  path=${path}`);
  console.log(`  ${p.width}x${p.height} · pix_fmt=${p.pixFmt}`);
  console.log(`  alpha min=${a.min.toFixed(3)} max=${a.max.toFixed(3)} avg=${a.avg.toFixed(3)}`);
}

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
      // continue
    }
  }
  throw new Error('No passing actor-prep workspace is available.');
}

function probe(path) {
  const result = spawnSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,pix_fmt', '-of', 'json', path,
  ], { cwd: ROOT, encoding: 'utf8', windowsHide: true, shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffprobe failed for ${path}: ${result.stderr || result.status}`);
  const stream = JSON.parse(result.stdout || '{}').streams?.[0];
  if (!stream) throw new Error(`No video stream for ${path}`);
  return { width: Number(stream.width), height: Number(stream.height), pixFmt: String(stream.pix_fmt ?? '') };
}

function alphaStats(path) {
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', path,
    '-vf', 'alphaextract,signalstats,metadata=print:file=-',
    '-frames:v', '1', '-f', 'null', '-',
  ], { cwd: ROOT, encoding: 'utf8', windowsHide: true, shell: false });
  if (result.error) throw result.error;
  const text = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const pick = (key) => {
    const match = text.match(new RegExp(`lavfi\\.signalstats\\.${key}=([0-9.]+)`));
    if (!match) throw new Error(`Could not read alpha ${key} for ${path}. Output: ${text.slice(-2000)}`);
    return Number(match[1]);
  };
  return { min: pick('YMIN'), max: pick('YMAX'), avg: pick('YAVG') };
}
