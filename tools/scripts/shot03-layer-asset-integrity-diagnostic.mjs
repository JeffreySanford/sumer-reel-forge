import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const FFMPEG = process.env.FFMPEG_COMMAND ?? 'ffmpeg';
const ROOT = resolve('.');
const SHOT_ROOT = join(
  ROOT,
  'assets/blessings-of-sumer/chapter-01/reel-01/animation-v1/shot-03',
);
const EDITORIAL = join(
  ROOT,
  'assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-03.png',
);
const BACKGROUND = join(SHOT_ROOT, 'background.png');
const LAYERS = [
  ['water', join(SHOT_ROOT, 'water.png')],
  ['vessel', join(SHOT_ROOT, 'vessel.png')],
  ['enki-body', join(SHOT_ROOT, 'character/enki-body.png')],
  ['enki-eyes-closed', join(SHOT_ROOT, 'character/enki-eyes-closed.png')],
  ['rigging', join(SHOT_ROOT, 'foreground/rigging.png')],
];
const PIXEL_CHANGE_THRESHOLD = 2;
const ALPHA_MEANINGFUL = 16;
const ALPHA_STRONG = 128;

main();

function main() {
  for (const path of [EDITORIAL, BACKGROUND, ...LAYERS.map(([, path]) => path)]) {
    if (!existsSync(path)) throw new Error(`Missing Shot 3 asset: ${path}`);
  }

  const dimensions = readPngDimensions(EDITORIAL);
  for (const [label, path] of [['background', BACKGROUND], ...LAYERS]) {
    const actual = readPngDimensions(path);
    if (actual.width !== dimensions.width || actual.height !== dimensions.height) {
      throw new Error(`${label} is ${actual.width}x${actual.height}; expected ${dimensions.width}x${dimensions.height}.`);
    }
  }

  const pixels = dimensions.width * dimensions.height;
  const editorial = decode(EDITORIAL, 'rgb24', pixels * 3);
  const background = decode(BACKGROUND, 'rgb24', pixels * 3);
  const backgroundMetrics = compareRgb(editorial, background, pixels);

  console.log('Shot 3 promoted-layer asset integrity diagnostic');
  console.log(`Dimensions: ${dimensions.width}x${dimensions.height} · ${pixels.toLocaleString()} pixels`);
  console.log(
    `[BACKGROUND] changed>${PIXEL_CHANGE_THRESHOLD}: ${pct(backgroundMetrics.changedRatio)} · mean RGB delta: ${backgroundMetrics.meanDifference.toFixed(3)}`,
  );
  console.log('');

  const layerReports = [];
  for (const [id, path] of LAYERS) {
    const rgba = decode(path, 'rgba', pixels * 4);
    const report = inspectLayer(id, rgba, editorial, background, dimensions);
    layerReports.push(report);
    console.log(
      `[${id}] alpha>16 ${pct(report.alpha.meaningfulRatio)} · alpha>128 ${pct(report.alpha.strongRatio)} · weighted ${pct(report.alpha.weightedRatio)}`,
    );
    console.log(
      `  bbox ${report.alpha.boundingBox ? `${report.alpha.boundingBox.x},${report.alpha.boundingBox.y} ${report.alpha.boundingBox.width}x${report.alpha.boundingBox.height}` : '<none>'} · edge-alpha ${pct(report.alpha.edgeStrongRatio)}`,
    );
    console.log(
      `  background matches editorial under strong alpha: ${pct(report.backgroundUnderLayer.matchesEditorialRatio)} · mean delta ${report.backgroundUnderLayer.meanDifference.toFixed(3)} · duplicate-risk ${report.backgroundUnderLayer.duplicateRisk}`,
    );
    console.log(
      `  layer RGB vs editorial under strong alpha: mean delta ${report.layerAgainstEditorial.meanDifference.toFixed(3)} · coverage ${report.alpha.coverageClass}`,
    );
  }

  const severe = layerReports.filter(
    (report) => report.backgroundUnderLayer.duplicateRisk === 'HIGH',
  );
  const sparse = layerReports.filter((report) => report.alpha.coverageClass === 'SPARSE');
  console.log('');
  console.log(
    `[SUMMARY] sparse layers: ${sparse.length ? sparse.map((item) => item.id).join(', ') : 'none'}`,
  );
  console.log(
    `[SUMMARY] high static-duplicate risk: ${severe.length ? severe.map((item) => item.id).join(', ') : 'none'}`,
  );

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDirectory = resolve(
    'tmp/animation-previews/shot03-layer-asset-integrity',
    stamp,
  );
  mkdirSync(outputDirectory, { recursive: true });
  const reportPath = join(outputDirectory, 'shot03-layer-asset-integrity.json');
  writeFileSync(
    reportPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        diagnosticType: 'shot03-layer-asset-integrity',
        generatedAt: new Date().toISOString(),
        dimensions,
        thresholds: {
          pixelChangeThreshold: PIXEL_CHANGE_THRESHOLD,
          alphaMeaningful: ALPHA_MEANINGFUL,
          alphaStrong: ALPHA_STRONG,
          duplicateRiskHighMatchRatio: 0.8,
        },
        background: backgroundMetrics,
        layers: layerReports,
        interpretation: {
          sparse:
            'SPARSE means the promoted layer contains less than 0.5% strong-alpha canvas coverage. Moving it can change hashes without moving the intended subject visibly.',
          duplicateRisk:
            'HIGH means more than 80% of strong-alpha layer pixels sit over background pixels that still match the editorial source within the RGB threshold. This strongly suggests the supposedly removed subject remains baked into the background plate.',
        },
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  console.log(`[INFO] report: ${reportPath}`);
  console.log(
    '[NEXT] Do not tune motion until sparse extraction and static-background duplication are ruled out.',
  );
}

function inspectLayer(id, rgba, editorial, background, dimensions) {
  const { width, height } = dimensions;
  const pixels = width * height;
  let meaningful = 0;
  let strong = 0;
  let weighted = 0;
  let strongEdge = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let backgroundDifferenceSum = 0;
  let backgroundMatches = 0;
  let layerDifferenceSum = 0;

  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const rgbaOffset = pixel * 4;
    const rgbOffset = pixel * 3;
    const alpha = rgba[rgbaOffset + 3];
    weighted += alpha / 255;
    if (alpha > ALPHA_MEANINGFUL) {
      meaningful += 1;
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    if (alpha <= ALPHA_STRONG) continue;

    strong += 1;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x < 3 || y < 3 || x >= width - 3 || y >= height - 3) strongEdge += 1;

    const backgroundDifference = rgbDifference(background, editorial, rgbOffset);
    backgroundDifferenceSum += backgroundDifference;
    if (backgroundDifference <= PIXEL_CHANGE_THRESHOLD) backgroundMatches += 1;

    layerDifferenceSum +=
      (Math.abs(rgba[rgbaOffset] - editorial[rgbOffset]) +
        Math.abs(rgba[rgbaOffset + 1] - editorial[rgbOffset + 1]) +
        Math.abs(rgba[rgbaOffset + 2] - editorial[rgbOffset + 2])) /
      3;
  }

  const strongRatio = strong / pixels;
  const matchesEditorialRatio = strong ? backgroundMatches / strong : 0;
  return {
    id,
    alpha: {
      meaningfulPixels: meaningful,
      meaningfulRatio: meaningful / pixels,
      strongPixels: strong,
      strongRatio,
      weightedRatio: weighted / pixels,
      edgeStrongPixels: strongEdge,
      edgeStrongRatio: strong ? strongEdge / strong : 0,
      coverageClass: strongRatio < 0.005 ? 'SPARSE' : strongRatio < 0.05 ? 'PARTIAL' : 'BROAD',
      boundingBox:
        maxX >= minX && maxY >= minY
          ? {
              x: minX,
              y: minY,
              width: maxX - minX + 1,
              height: maxY - minY + 1,
              canvasAreaRatio: ((maxX - minX + 1) * (maxY - minY + 1)) / pixels,
            }
          : null,
    },
    backgroundUnderLayer: {
      sampledStrongPixels: strong,
      meanDifference: strong ? backgroundDifferenceSum / strong : 0,
      matchesEditorialPixels: backgroundMatches,
      matchesEditorialRatio,
      duplicateRisk:
        strong === 0 ? 'NO_ALPHA' : matchesEditorialRatio > 0.8 ? 'HIGH' : matchesEditorialRatio > 0.5 ? 'MEDIUM' : 'LOW',
    },
    layerAgainstEditorial: {
      sampledStrongPixels: strong,
      meanDifference: strong ? layerDifferenceSum / strong : 0,
    },
  };
}

function compareRgb(left, right, pixels) {
  let differenceSum = 0;
  let changed = 0;
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const offset = pixel * 3;
    const difference = rgbDifference(left, right, offset);
    differenceSum += difference;
    if (difference > PIXEL_CHANGE_THRESHOLD) changed += 1;
  }
  return {
    meanDifference: differenceSum / pixels,
    changedPixels: changed,
    changedRatio: changed / pixels,
  };
}

function rgbDifference(left, right, offset) {
  return (
    Math.abs(left[offset] - right[offset]) +
    Math.abs(left[offset + 1] - right[offset + 1]) +
    Math.abs(left[offset + 2] - right[offset + 2])
  ) / 3;
}

function readPngDimensions(path) {
  const buffer = readFileSync(path);
  if (
    buffer.length < 24 ||
    buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
    buffer.subarray(12, 16).toString('ascii') !== 'IHDR'
  ) {
    throw new Error(`Expected PNG: ${path}`);
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function decode(path, pixelFormat, expectedBytes) {
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
      pixelFormat,
      'pipe:1',
    ],
    {
      cwd: ROOT,
      env: process.env,
      encoding: null,
      maxBuffer: Math.max(32 * 1024 * 1024, expectedBytes + 1024),
      windowsHide: true,
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg could not decode ${path}: ${String(result.stderr ?? '').trim()}`);
  }
  if (!Buffer.isBuffer(result.stdout) || result.stdout.length !== expectedBytes) {
    throw new Error(`${path} decoded to ${result.stdout?.length ?? 0} bytes; expected ${expectedBytes}.`);
  }
  return result.stdout;
}

function pct(value) {
  return `${(value * 100).toFixed(3)}%`;
}
