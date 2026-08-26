import { spawnSync } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { maybeOpenReviewArtifacts } from './open-review-artifacts.mjs';

const ROOT = resolve('.');
const REVIEW_ROOT = resolve('tmp/animation-assets/resegmentation/shot03');
const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const WIDTH = 941;
const HEIGHT = 1672;
const PIXELS = WIDTH * HEIGHT;
const STRONG_ALPHA = 128;

await main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const runDirectory = await latestGeneratedRun();
  const sourceReportPath = join(runDirectory, 'shot03-core-resegmentation.json');
  const sourceReport = JSON.parse(await readFile(sourceReportPath, 'utf8'));
  const results = Array.isArray(sourceReport.results) ? sourceReport.results : [];
  if (!results.length) throw new Error(`No generated candidates found in ${sourceReportPath}.`);

  console.log('Shot 3 resegmentation structural review');
  console.log(`Source report: ${sourceReportPath}`);
  console.log(`Candidates: ${results.length}`);
  console.log('Metric: 8-connected strong-alpha components (alpha > 128)');
  console.log('Policy: analysis only; no canonical asset or manifest is modified.');
  console.log('');

  const reviewed = [];
  for (const item of results) {
    const alpha = decodeAlpha(resolve(item.candidatePath));
    const analysis = analyzeComponents(alpha);
    const review = {
      target: item.target,
      layerId: item.layerId,
      threshold: item.threshold,
      candidatePath: resolve(item.candidatePath),
      ...analysis,
    };
    reviewed.push(review);
    printReview(review);
  }

  const maskSheetPath = join(runDirectory, 'shot03-core-resegmentation-alpha-contact-sheet.png');
  createAlphaContactSheet(reviewed, maskSheetPath);

  const ranked = rankByTarget(reviewed);
  const reportPath = join(runDirectory, 'shot03-core-resegmentation-structural-review.json');
  const report = {
    schemaVersion: 1,
    type: 'shot03-core-resegmentation-structural-review',
    generatedAt: new Date().toISOString(),
    sourceReportPath,
    alphaThreshold: STRONG_ALPHA,
    connectivity: 8,
    candidates: reviewed,
    ranked,
    artifacts: { alphaContactSheet: maskSheetPath },
    interpretation:
      'A complete extraction should concentrate nearly all strong alpha in one dominant subject component. Edge-touching or many substantial secondary components remain human-review warnings. This report does not approve or promote any candidate.',
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log('');
  console.log('[RANKING] dominant-component structure');
  for (const [target, items] of Object.entries(ranked)) {
    console.log(`  ${target}:`);
    for (const item of items) {
      console.log(
        `    t=${item.threshold.toFixed(2)} · largest ${(item.largestComponentShare * 100).toFixed(2)}% · significant components ${item.significantComponentCount} · largest bbox ${formatBbox(item.largestComponentBbox)}${item.largestTouchesEdge ? ' · TOUCHES EDGE' : ''}`,
      );
    }
  }
  console.log('');
  console.log(`[REVIEW] alpha contact sheet: ${maskSheetPath}`);
  console.log(`[INFO] structural report: ${reportPath}`);
  console.log('[STOP] Do not rebuild the background until the dominant vessel and Enki silhouettes are visually confirmed complete.');
  await maybeOpenReviewArtifacts([maskSheetPath], { delayMs: 120 });
}

async function latestGeneratedRun() {
  let entries;
  try {
    entries = await readdir(REVIEW_ROOT, { withFileTypes: true });
  } catch {
    throw new Error(`No resegmentation runs found under ${REVIEW_ROOT}.`);
  }
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(REVIEW_ROOT, entry.name))
    .sort((a, b) => basename(b).localeCompare(basename(a)));

  for (const directory of directories) {
    try {
      const report = JSON.parse(await readFile(join(directory, 'shot03-core-resegmentation.json'), 'utf8'));
      if (report.command === 'generate' && Array.isArray(report.results) && report.results.length) return directory;
    } catch {
      // Ignore incomplete/preflight-only runs.
    }
  }
  throw new Error('No completed Shot 3 core resegmentation generation report was found.');
}

function decodeAlpha(path) {
  const result = spawnSync(
    FFMPEG,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      path,
      '-frames:v',
      '1',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgba',
      'pipe:1',
    ],
    {
      cwd: ROOT,
      encoding: null,
      maxBuffer: 32 * 1024 * 1024,
      windowsHide: true,
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg could not decode ${path}: ${String(result.stderr ?? '').trim()}`);
  }
  const expected = PIXELS * 4;
  if (!Buffer.isBuffer(result.stdout) || result.stdout.length !== expected) {
    throw new Error(`${path} decoded to ${result.stdout?.length ?? 0} bytes; expected ${expected}.`);
  }
  const alpha = new Uint8Array(PIXELS);
  for (let pixel = 0; pixel < PIXELS; pixel += 1) alpha[pixel] = result.stdout[pixel * 4 + 3];
  return alpha;
}

function analyzeComponents(alpha) {
  const visited = new Uint8Array(PIXELS);
  const stack = new Int32Array(PIXELS);
  const components = [];
  let strongAlphaPixels = 0;

  for (let index = 0; index < PIXELS; index += 1) {
    if (alpha[index] > STRONG_ALPHA) strongAlphaPixels += 1;
  }

  for (let seed = 0; seed < PIXELS; seed += 1) {
    if (visited[seed] || alpha[seed] <= STRONG_ALPHA) continue;
    let top = 0;
    stack[top++] = seed;
    visited[seed] = 1;
    let count = 0;
    let minX = WIDTH;
    let minY = HEIGHT;
    let maxX = -1;
    let maxY = -1;
    let touchesEdge = false;

    while (top > 0) {
      const index = stack[--top];
      count += 1;
      const x = index % WIDTH;
      const y = Math.floor(index / WIDTH);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x === 0 || x === WIDTH - 1 || y === 0 || y === HEIGHT - 1) touchesEdge = true;

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= WIDTH || ny < 0 || ny >= HEIGHT) continue;
          const neighbor = ny * WIDTH + nx;
          if (visited[neighbor] || alpha[neighbor] <= STRONG_ALPHA) continue;
          visited[neighbor] = 1;
          stack[top++] = neighbor;
        }
      }
    }

    components.push({
      pixels: count,
      bbox: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
      touchesEdge,
    });
  }

  components.sort((a, b) => b.pixels - a.pixels);
  const largest = components[0] ?? null;
  const second = components[1] ?? null;
  const significant = components.filter((component) => component.pixels >= Math.max(50, strongAlphaPixels * 0.001));
  const largestShare = largest && strongAlphaPixels ? largest.pixels / strongAlphaPixels : 0;
  const secondShare = second && strongAlphaPixels ? second.pixels / strongAlphaPixels : 0;
  const largestBboxArea = largest ? largest.bbox.width * largest.bbox.height : 0;

  return {
    strongAlphaPixels,
    componentCount: components.length,
    significantComponentCount: significant.length,
    largestComponentPixels: largest?.pixels ?? 0,
    largestComponentShare: largestShare,
    secondComponentShare: secondShare,
    largestComponentBbox: largest?.bbox ?? null,
    largestComponentBboxFill: largestBboxArea ? (largest?.pixels ?? 0) / largestBboxArea : 0,
    largestTouchesEdge: Boolean(largest?.touchesEdge),
    topComponents: components.slice(0, 10),
    structuralRisk:
      largestShare >= 0.95 && significant.length <= 2
        ? 'LOW'
        : largestShare >= 0.85 && significant.length <= 4
          ? 'MEDIUM'
          : 'HIGH',
  };
}

function createAlphaContactSheet(items, outputPath) {
  if (items.length !== 6) {
    console.warn(`[WARN] expected 6 candidates for contact sheet; found ${items.length}. Skipping sheet.`);
    return;
  }
  const args = ['-y', '-hide_banner', '-loglevel', 'error'];
  for (const item of items) args.push('-i', item.candidatePath);
  const filters = [];
  for (let index = 0; index < items.length; index += 1) {
    filters.push(`[${index}:v]alphaextract,scale=282:502:flags=neighbor,format=gray[m${index}]`);
  }
  filters.push('[m0][m1][m2]hstack=inputs=3[row0]');
  filters.push('[m3][m4][m5]hstack=inputs=3[row1]');
  filters.push('[row0][row1]vstack=inputs=2[sheet]');
  args.push('-filter_complex', filters.join(';'), '-map', '[sheet]', '-frames:v', '1', outputPath);
  const result = spawnSync(FFMPEG, args, {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffmpeg could not create alpha contact sheet: ${String(result.stderr ?? '').trim()}`);
}

function rankByTarget(items) {
  const output = {};
  for (const target of [...new Set(items.map((item) => item.target))]) {
    output[target] = items
      .filter((item) => item.target === target)
      .sort((a, b) => {
        const risk = { LOW: 0, MEDIUM: 1, HIGH: 2 };
        return (
          risk[a.structuralRisk] - risk[b.structuralRisk] ||
          b.largestComponentShare - a.largestComponentShare ||
          b.largestComponentBboxFill - a.largestComponentBboxFill
        );
      });
  }
  return output;
}

function printReview(item) {
  console.log(
    `[${item.target} t=${item.threshold.toFixed(2)}] strong=${item.strongAlphaPixels} · components=${item.componentCount} · significant=${item.significantComponentCount} · largest ${(item.largestComponentShare * 100).toFixed(2)}% · second ${(item.secondComponentShare * 100).toFixed(2)}% · risk=${item.structuralRisk}`,
  );
  console.log(
    `  largest bbox ${formatBbox(item.largestComponentBbox)} · fill ${(item.largestComponentBboxFill * 100).toFixed(2)}%${item.largestTouchesEdge ? ' · TOUCHES EDGE' : ''}`,
  );
}

function formatBbox(bbox) {
  return bbox ? `${bbox.x},${bbox.y} ${bbox.width}x${bbox.height}` : '<none>';
}
