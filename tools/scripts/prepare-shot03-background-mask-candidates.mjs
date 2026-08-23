import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const CANDIDATE_ROOT = resolve(
  'tmp/animation-assets/candidates/chapter-01-reel-01-animation-v1',
);
const ALPHA_THRESHOLD = 32;
const MIN_COMPONENT_PIXELS = 6;
const MIN_COMPONENT_FRACTION_OF_LARGEST = 0.002;
const TARGET_COMBINED_COVERAGE = 0.006;
const MAX_DILATION_PASSES = 10;

export function prepareBackgroundMaskCandidates(inputs) {
  if (!Array.isArray(inputs) || inputs.length !== 2) {
    throw new Error('Background mask sanitation expects Enki and vessel inputs.');
  }

  const decoded = inputs.map((input) => decodeCandidate(input));
  const dimensions = decoded[0].dimensions;
  for (const item of decoded.slice(1)) {
    if (
      item.dimensions.width !== dimensions.width ||
      item.dimensions.height !== dimensions.height
    ) {
      throw new Error(
        `Foreground candidates must share dimensions. Found ${dimensions.width}x${dimensions.height} and ${item.dimensions.width}x${item.dimensions.height}.`,
      );
    }
  }

  for (const item of decoded) {
    item.mask = retainMeaningfulComponents(
      item.alpha,
      dimensions.width,
      dimensions.height,
    );
  }

  let dilationPasses = 0;
  let coverage = combinedCoverage(decoded.map((item) => item.mask));
  while (
    coverage < TARGET_COMBINED_COVERAGE &&
    dilationPasses < MAX_DILATION_PASSES
  ) {
    for (const item of decoded) {
      item.mask = dilateMask(item.mask, dimensions.width, dimensions.height);
    }
    dilationPasses += 1;
    coverage = combinedCoverage(decoded.map((item) => item.mask));
  }

  if (coverage < 0.001) {
    throw new Error(
      `Foreground alpha sanitation produced only ${(coverage * 100).toFixed(3)}% combined coverage; the Enki/vessel masks are too sparse for safe background reconstruction.`,
    );
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const root = join(CANDIDATE_ROOT, `_background-mask-${stamp}`);
  const prepared = decoded.map((item) => {
    const candidateRunDirectory = join(root, item.input.layerId);
    const shotDirectory = join(candidateRunDirectory, 'shot-03');
    const outputPath = join(shotDirectory, `${item.input.layerId}.png`);
    mkdirSync(shotDirectory, { recursive: true });

    const rgba = Buffer.from(item.rgba);
    for (let pixel = 0; pixel < item.mask.length; pixel += 1) {
      rgba[pixel * 4 + 3] = item.mask[pixel] ? 255 : 0;
    }
    encodeRgbaPng(
      rgba,
      dimensions.width,
      dimensions.height,
      outputPath,
    );

    return {
      ...item.input,
      originalCandidateRunDirectory: item.input.candidateRunDirectory,
      originalCandidatePath: item.input.candidatePath,
      candidateRunDirectory,
      candidatePath: outputPath,
      originalCoverage: item.originalCoverage,
      thresholdCoverage: item.thresholdCoverage,
      cleanedCoverage: countMask(item.mask) / item.mask.length,
      retainedComponents: item.retainedComponents,
    };
  });

  const report = {
    schemaVersion: 1,
    type: 'shot03-background-mask-sanitization',
    generatedAt: new Date().toISOString(),
    dimensions,
    alphaThreshold: ALPHA_THRESHOLD,
    minComponentPixels: MIN_COMPONENT_PIXELS,
    minComponentFractionOfLargest: MIN_COMPONENT_FRACTION_OF_LARGEST,
    targetCombinedCoverage: TARGET_COMBINED_COVERAGE,
    combinedCoverage: coverage,
    dilationPasses,
    inputs: prepared.map((item) => ({
      layerId: item.layerId,
      originalCandidatePath: item.originalCandidatePath,
      sanitizedCandidatePath: item.candidatePath,
      originalCoverage: item.originalCoverage,
      thresholdCoverage: item.thresholdCoverage,
      cleanedCoverage: item.cleanedCoverage,
      retainedComponents: item.retainedComponents,
    })),
    policy: {
      productionCandidatesMutated: false,
      temporaryMaskDerivativeOnly: true,
      removeDisconnectedAlphaNoise: true,
      safetyDilateRetainedSilhouettes: true,
    },
  };
  writeFileSync(
    join(root, 'mask-sanitization.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );

  console.log('Background mask sanitation');
  for (const item of prepared) {
    console.log(
      `[ok] ${item.label}: ${(item.originalCoverage * 100).toFixed(3)}% raw → ${(item.cleanedCoverage * 100).toFixed(3)}% sanitized · ${item.retainedComponents} retained component(s)`,
    );
  }
  console.log(
    `[ok] Combined sanitized coverage: ${(coverage * 100).toFixed(3)}% · dilation ${dilationPasses}px`,
  );
  console.log(`[ok] Temporary mask derivatives: ${root}`);
  console.log('');

  return {
    root,
    report,
    prepared,
    enki: prepared.find((item) => item.layerId === 'shot03-enki-body-v1'),
    vessel: prepared.find((item) => item.layerId === 'shot03-vessel-v1'),
  };
}

function decodeCandidate(input) {
  const dimensions = readPngDimensions(input.candidatePath);
  const expectedBytes = dimensions.width * dimensions.height * 4;
  const result = spawnSync(
    process.env.FFMPEG_COMMAND ?? 'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      input.candidatePath,
      '-frames:v',
      '1',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgba',
      'pipe:1',
    ],
    {
      cwd: process.cwd(),
      env: process.env,
      encoding: null,
      maxBuffer: Math.max(16 * 1024 * 1024, expectedBytes + 1024),
      windowsHide: true,
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `ffmpeg could not decode ${input.layerId}: ${String(result.stderr ?? '').trim()}`,
    );
  }
  if (!Buffer.isBuffer(result.stdout) || result.stdout.length !== expectedBytes) {
    throw new Error(
      `${input.layerId} decoded to ${result.stdout?.length ?? 0} bytes; expected ${expectedBytes}.`,
    );
  }

  const rgba = result.stdout;
  const alpha = new Uint8Array(dimensions.width * dimensions.height);
  let nonZero = 0;
  let thresholded = 0;
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    const value = rgba[pixel * 4 + 3];
    alpha[pixel] = value;
    if (value > 0) nonZero += 1;
    if (value >= ALPHA_THRESHOLD) thresholded += 1;
  }

  return {
    input,
    dimensions,
    rgba,
    alpha,
    originalCoverage: nonZero / alpha.length,
    thresholdCoverage: thresholded / alpha.length,
    retainedComponents: 0,
    mask: null,
  };
}

function retainMeaningfulComponents(alpha, width, height) {
  const pixels = width * height;
  const visited = new Uint8Array(pixels);
  const components = [];
  const queue = new Int32Array(pixels);

  for (let start = 0; start < pixels; start += 1) {
    if (visited[start] || alpha[start] < ALPHA_THRESHOLD) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    const members = [];

    while (head < tail) {
      const index = queue[head++];
      members.push(index);
      const x = index % width;
      const y = Math.floor(index / width);

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const next = ny * width + nx;
          if (visited[next] || alpha[next] < ALPHA_THRESHOLD) continue;
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
    }

    components.push({ area: members.length, members });
  }

  components.sort((a, b) => b.area - a.area);
  const largest = components[0]?.area ?? 0;
  if (!largest) {
    throw new Error('Candidate alpha contains no pixels above the sanitation threshold.');
  }
  const minimumArea = Math.max(
    MIN_COMPONENT_PIXELS,
    Math.floor(largest * MIN_COMPONENT_FRACTION_OF_LARGEST),
  );
  const retained = components.filter((component) => component.area >= minimumArea);
  const mask = new Uint8Array(pixels);
  for (const component of retained) {
    for (const index of component.members) mask[index] = 1;
  }
  mask.retainedComponents = retained.length;
  return mask;
}

function dilateMask(mask, width, height) {
  const expanded = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!mask[index]) continue;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          expanded[ny * width + nx] = 1;
        }
      }
    }
  }
  return expanded;
}

function combinedCoverage(masks) {
  if (!masks.length) return 0;
  let selected = 0;
  for (let pixel = 0; pixel < masks[0].length; pixel += 1) {
    if (masks.some((mask) => mask[pixel])) selected += 1;
  }
  return selected / masks[0].length;
}

function countMask(mask) {
  let count = 0;
  for (const value of mask) if (value) count += 1;
  return count;
}

function encodeRgbaPng(rgba, width, height, outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  const result = spawnSync(
    process.env.FFMPEG_COMMAND ?? 'ffmpeg',
    [
      '-y',
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgba',
      '-s',
      `${width}x${height}`,
      '-i',
      'pipe:0',
      '-frames:v',
      '1',
      outputPath,
    ],
    {
      cwd: process.cwd(),
      env: process.env,
      input: rgba,
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `ffmpeg could not encode sanitized alpha candidate: ${String(result.stderr ?? '').trim()}`,
    );
  }
}

function readPngDimensions(path) {
  const result = spawnSync(
    process.env.FFPROBE_COMMAND ?? 'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=width,height',
      '-of',
      'json',
      path,
    ],
    {
      cwd: process.cwd(),
      env: process.env,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
      windowsHide: true,
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffprobe could not inspect ${path}: ${String(result.stderr ?? '').trim()}`);
  }
  const stream = JSON.parse(result.stdout)?.streams?.[0];
  const width = Number(stream?.width);
  const height = Number(stream?.height);
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new Error(`Could not read PNG dimensions for ${path}.`);
  }
  return { width, height };
}
