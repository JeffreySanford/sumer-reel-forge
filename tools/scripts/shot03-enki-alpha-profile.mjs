import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const ROOT = resolve('.');
const ACTOR_PREP_ROOT = resolve('tmp/animation-assets/actor-prep/enki/v1');
const THRESHOLDS = Object.freeze([1, 8, 24, 48, 96, 160, 224]);

void main();

function main() {
  const workspace = latestActorPrepWorkspace();
  const actorPrepPath = join(workspace, 'actor-prep.json');
  const sourcePath = join(workspace, 'source', 'reference-enki.png');
  const actorPrep = JSON.parse(readFileSync(actorPrepPath, 'utf8'));
  const width = Number(actorPrep?.source?.width);
  const height = Number(actorPrep?.source?.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('Actor prep source dimensions are invalid.');
  }

  const outputDir = join(workspace, 'alpha-profile');
  mkdirSync(outputDir, { recursive: true });
  const rows = [];

  for (const threshold of THRESHOLDS) {
    const bounds = detectAlphaBounds(sourcePath, threshold);
    const area = bounds ? bounds.width * bounds.height : 0;
    const bboxCoverage = area / (width * height);
    const mattePath = join(outputDir, `alpha-threshold-${String(threshold).padStart(3, '0')}-matte.png`);
    renderThresholdMatte({ sourcePath, mattePath, threshold });
    rows.push({ threshold, bounds, bboxCoverage, mattePath });
  }

  const reportPath = join(outputDir, 'enki-alpha-profile.json');
  const report = {
    schemaVersion: 1,
    type: 'enki-alpha-profile',
    workspace,
    sourcePath,
    source: { width, height },
    thresholds: rows,
    interpretation: {
      purpose: 'diagnose whether low-alpha residue prevents actor-only vision cropping',
      noSourceMutation: true,
      noSemanticThresholdChanges: true,
      noModelInvocation: true,
    },
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log('Shot 3 Enki alpha profile');
  console.log(`Source: ${sourcePath}`);
  console.log(`Dimensions: ${width}x${height}`);
  console.log('');
  for (const row of rows) {
    if (!row.bounds) {
      console.log(`alpha>=${String(row.threshold).padStart(3)} · no surviving pixels`);
      continue;
    }
    console.log(
      `alpha>=${String(row.threshold).padStart(3)} · bbox x=${row.bounds.x}, y=${row.bounds.y}, ${row.bounds.width}x${row.bounds.height} · bbox coverage ${(row.bboxCoverage * 100).toFixed(2)}%`,
    );
  }
  console.log('');
  console.log(`Report: ${reportPath}`);
  console.log(`[REVIEW] matte previews: ${outputDir}`);
  console.log('[STOP] Diagnostic only. Do not change semantic thresholds or rerun segmentation from this report alone.');
}

function latestActorPrepWorkspace() {
  if (!existsSync(ACTOR_PREP_ROOT)) throw new Error(`Actor-prep root does not exist: ${ACTOR_PREP_ROOT}`);
  const candidates = readdirSync(ACTOR_PREP_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(ACTOR_PREP_ROOT, entry.name))
    .sort((left, right) => basename(right).localeCompare(basename(left)));
  for (const workspace of candidates) {
    const actorPrepPath = join(workspace, 'actor-prep.json');
    const sourcePath = join(workspace, 'source', 'reference-enki.png');
    const packetReceiptPath = join(workspace, 'evidence', 'packet-receipt.json');
    if (!existsSync(actorPrepPath) || !existsSync(sourcePath) || !existsSync(packetReceiptPath)) continue;
    try {
      const receipt = JSON.parse(readFileSync(packetReceiptPath, 'utf8'));
      if (receipt.pass === true) return workspace;
    } catch {
      // try older workspace
    }
  }
  throw new Error('No passing Enki actor-prep workspace is available.');
}

function detectAlphaBounds(sourcePath, threshold) {
  const result = spawnSync(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel', 'info',
      '-i', sourcePath,
      '-vf', `alphaextract,bbox=min_val=${threshold}`,
      '-frames:v', '1',
      '-f', 'null',
      '-',
    ],
    { cwd: ROOT, encoding: 'utf8', windowsHide: true, shell: false },
  );
  if (result.error) throw result.error;
  const text = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const matches = [...text.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)];
  if (!matches.length) return null;
  const [, width, height, x, y] = matches.at(-1);
  return { x: Number(x), y: Number(y), width: Number(width), height: Number(height) };
}

function renderThresholdMatte({ sourcePath, mattePath, threshold }) {
  const alphaExpr = `if(gte(a,${threshold}/255),1,0)`;
  const filter = [
    '[0:v]format=rgba,split=2[src][masksrc]',
    `[masksrc]lutrgb=a='${alphaExpr}'[mask]`,
    'color=c=0xD8D8D8:s=941x1672:d=1,format=rgba[bg]',
    '[bg][mask]overlay=0:0:format=auto[out]',
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
      mattePath,
    ],
    { cwd: ROOT, encoding: 'utf8', windowsHide: true, shell: false },
  );
  if (result.error) throw result.error;
  if (result.status !== 0 || !existsSync(mattePath)) {
    throw new Error(`FFmpeg threshold matte render failed at alpha ${threshold}: ${result.stderr || `exit ${result.status}`}`);
  }
}
