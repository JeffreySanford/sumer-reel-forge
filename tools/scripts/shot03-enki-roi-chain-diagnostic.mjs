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
const sourceInfo = printFile('ROI SOURCE CROP', cropSourcePath);
const candidateInfo = printFile('SAM CANDIDATE', cropCandidatePath);
const registeredInfo = printFile('REGISTERED SOURCE', registeredPath);
console.log('');
console.log('[INTERPRETATION]');
const roiIsFullFrame = accepted.roi?.x === 0 && accepted.roi?.y === 0 &&
  accepted.roi?.width === report.sourceDimensions?.width &&
  accepted.roi?.height === report.sourceDimensions?.height;
console.log(`ROI full-frame: ${roiIsFullFrame ? 'YES' : 'no'}`);
if (roiIsFullFrame) {
  console.log('- The accepted ROI search never isolated Enki spatially before SAM; 15% padding expanded the Enki locator to the complete source frame.');
}
if (candidateInfo.alpha?.min >= 254.5) {
  console.log('- The SAM candidate alpha plane is effectively fully opaque; JoinImageWithAlpha did not produce a useful subject mask in this output.');
}
if (!roiIsFullFrame && candidateInfo.probe.width === report.sourceDimensions?.width && candidateInfo.probe.height === report.sourceDimensions?.height) {
  console.log('- Candidate dimensions unexpectedly expanded back to full source dimensions; inspect generator/workflow registration semantics.');
}
if (!sourceInfo.alpha) {
  console.log('- The ROI source crop has no alpha plane, which is expected for an editorial RGB crop and is not itself an error.');
}
if (candidateInfo.alpha && registeredInfo.alpha && candidateInfo.alpha.min >= 254.5 && registeredInfo.alpha.min >= 254.5) {
  console.log('- Registration is not the first alpha-loss point; the candidate was already effectively opaque before registration.');
}
console.log('[NEXT] Reuse the exact pre-padding Enki locator box as a source-faithful vision crop; do not rerun SAM or infer alpha from this candidate.');
console.log('[STOP] Diagnostic only. No source/model/canonical mutation.');

function printFile(label, path) {
  const p = probe(path);
  const a = alphaStats(path, p.pixFmt);
  console.log(`[${label}]`);
  console.log(`  path=${path}`);
  console.log(`  ${p.width}x${p.height} · pix_fmt=${p.pixFmt}`);
  if (a) {
    console.log(`  alpha min=${a.min.toFixed(3)} max=${a.max.toFixed(3)} avg=${a.avg.toFixed(3)}`);
  } else {
    console.log('  alpha=N/A (pixel format has no alpha plane)');
  }
  return { probe: p, alpha: a };
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

function alphaStats(path, pixFmt) {
  if (!hasAlphaPixelFormat(pixFmt)) return null;
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', path,
    '-vf', 'alphaextract,signalstats,metadata=print:file=-',
    '-frames:v', '1', '-f', 'null', '-',
  ], { cwd: ROOT, encoding: 'utf8', windowsHide: true, shell: false });
  if (result.error) throw result.error;
  const text = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (result.status !== 0) return null;
  const pick = (key) => {
    const match = text.match(new RegExp(`lavfi\\.signalstats\\.${key}=([0-9.]+)`));
    return match ? Number(match[1]) : null;
  };
  const min = pick('YMIN');
  const max = pick('YMAX');
  const avg = pick('YAVG');
  return [min, max, avg].every(Number.isFinite) ? { min, max, avg } : null;
}

function hasAlphaPixelFormat(pixFmt) {
  return /(^|_)(rgba|bgra|argb|abgr|ya|yuva|gbrap|pal8)/i.test(String(pixFmt));
}
