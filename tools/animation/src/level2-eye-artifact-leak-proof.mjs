const DEFAULT_ALPHA_THRESHOLD = 16;

export const EYE_ARTIFACT_LIMITS = Object.freeze({
  maxCyanLikeRatio: 0.22,
  maxDominantQuantizedRatio: 0.58,
  maxFlatChannelStdDev: 18,
  maxFlatNeighborDelta: 7.5,
});

export function analyzeTransparentEyeLayerAppearance({
  stateRgba,
  dimensions,
  editMask = null,
  alphaThreshold = DEFAULT_ALPHA_THRESHOLD,
  limits = EYE_ARTIFACT_LIMITS,
}) {
  validateRgba(stateRgba, dimensions, 'transparent eye layer');
  if (editMask && (!(editMask instanceof Uint8Array) || editMask.length !== dimensions.width * dimensions.height)) {
    throw new Error('Eye artifact proof edit mask has invalid dimensions.');
  }

  const selected = new Uint8Array(dimensions.width * dimensions.height);
  for (let pixel = 0; pixel < selected.length; pixel += 1) {
    if (stateRgba[pixel * 4 + 3] <= alphaThreshold) continue;
    if (editMask && editMask[pixel] <= alphaThreshold) continue;
    selected[pixel] = 1;
  }

  return analyzeSelectedRgb({
    rgba: stateRgba,
    dimensions,
    selected,
    limits,
    label: 'candidate eye layer',
  });
}

export function analyzeRenderedEyeBoxes({
  rgba,
  dimensions,
  eyeBoxes,
  limits = EYE_ARTIFACT_LIMITS,
}) {
  validateRgba(rgba, dimensions, 'rendered eye frame');
  if (!Array.isArray(eyeBoxes) || eyeBoxes.length !== 2) {
    throw new Error('Rendered eye artifact proof requires exactly two eye boxes.');
  }

  const selected = new Uint8Array(dimensions.width * dimensions.height);
  for (const raw of eyeBoxes) {
    const box = clampBox(raw, dimensions);
    for (let y = box.y; y < box.y + box.height; y += 1) {
      for (let x = box.x; x < box.x + box.width; x += 1) {
        selected[y * dimensions.width + x] = 1;
      }
    }
  }

  return analyzeSelectedRgb({
    rgba,
    dimensions,
    selected,
    limits,
    label: 'rendered eye boxes',
  });
}

export function mapSourceEyeBoxesToRender({
  eyeBoxes,
  sourceDimensions,
  renderDimensions,
  padRatio = 0.18,
}) {
  if (!Array.isArray(eyeBoxes) || eyeBoxes.length !== 2) {
    throw new Error('Rendered eye mapping requires exactly two source eye boxes.');
  }
  const insetX = renderDimensions.width * 0.03;
  const insetY = renderDimensions.height * 0.03;
  const containerWidth = renderDimensions.width + insetX * 2;
  const containerHeight = renderDimensions.height + insetY * 2;
  const imageScale = Math.max(
    containerWidth / sourceDimensions.width,
    containerHeight / sourceDimensions.height,
  );
  const imageWidth = sourceDimensions.width * imageScale;
  const imageHeight = sourceDimensions.height * imageScale;
  const imageX = -insetX + (containerWidth - imageWidth) / 2;
  const imageY = -insetY + (containerHeight - imageHeight) / 2;

  return eyeBoxes.map((sourceBox) => {
    const mapped = {
      x: imageX + Number(sourceBox.x) * imageScale,
      y: imageY + Number(sourceBox.y) * imageScale,
      width: Number(sourceBox.width) * imageScale,
      height: Number(sourceBox.height) * imageScale,
    };
    const padX = mapped.width * padRatio;
    const padY = mapped.height * padRatio;
    return clampBox(
      {
        x: Math.floor(mapped.x - padX),
        y: Math.floor(mapped.y - padY),
        width: Math.ceil(mapped.width + padX * 2),
        height: Math.ceil(mapped.height + padY * 2),
      },
      renderDimensions,
    );
  });
}

function analyzeSelectedRgb({ rgba, dimensions, selected, limits, label }) {
  const channels = [[], [], []];
  const bucketCounts = new Map();
  let selectedPixels = 0;
  let cyanLikePixels = 0;
  let neighborPairs = 0;
  let neighborDeltaSum = 0;

  for (let y = 0; y < dimensions.height; y += 1) {
    for (let x = 0; x < dimensions.width; x += 1) {
      const pixel = y * dimensions.width + x;
      if (!selected[pixel]) continue;
      selectedPixels += 1;
      const offset = pixel * 4;
      const r = rgba[offset];
      const g = rgba[offset + 1];
      const b = rgba[offset + 2];
      channels[0].push(r);
      channels[1].push(g);
      channels[2].push(b);
      if (g >= 105 && b >= 105 && g - r >= 18 && b - r >= 18) cyanLikePixels += 1;
      const key = `${r >> 5}:${g >> 5}:${b >> 5}`;
      bucketCounts.set(key, (bucketCounts.get(key) ?? 0) + 1);

      if (x + 1 < dimensions.width && selected[pixel + 1]) {
        neighborPairs += 1;
        neighborDeltaSum += rgbDelta(rgba, pixel, pixel + 1);
      }
      if (y + 1 < dimensions.height && selected[pixel + dimensions.width]) {
        neighborPairs += 1;
        neighborDeltaSum += rgbDelta(rgba, pixel, pixel + dimensions.width);
      }
    }
  }

  if (!selectedPixels) {
    return {
      pass: false,
      failures: [`${label} contains no selected pixels`],
      metrics: emptyMetrics(),
    };
  }

  const means = channels.map(mean);
  const stddevs = channels.map((items, index) => stddev(items, means[index]));
  const meanChannelStdDev = mean(stddevs);
  const dominantQuantizedPixels = Math.max(...bucketCounts.values());
  const dominantQuantizedRatio = dominantQuantizedPixels / selectedPixels;
  const cyanLikeRatio = cyanLikePixels / selectedPixels;
  const meanNeighborDelta = neighborPairs ? neighborDeltaSum / neighborPairs : 0;
  const cyanLeak = cyanLikeRatio > limits.maxCyanLikeRatio;
  const flatLeak =
    dominantQuantizedRatio > limits.maxDominantQuantizedRatio &&
    meanChannelStdDev < limits.maxFlatChannelStdDev &&
    meanNeighborDelta < limits.maxFlatNeighborDelta;
  const failures = [];
  if (cyanLeak) {
    failures.push(
      `${label} is dominated by cyan/debug-like pixels; ${(cyanLikeRatio * 100).toFixed(1)}% exceeds ${(limits.maxCyanLikeRatio * 100).toFixed(1)}%`,
    );
  }
  if (flatLeak) {
    failures.push(
      `${label} is near-uniform/flat; dominant quantized color ${(dominantQuantizedRatio * 100).toFixed(1)}%, channel stddev ${meanChannelStdDev.toFixed(1)}, neighbor delta ${meanNeighborDelta.toFixed(1)}`,
    );
  }

  return {
    pass: failures.length === 0,
    failures,
    metrics: {
      selectedPixels,
      meanRgb: means,
      channelStdDev: stddevs,
      meanChannelStdDev,
      cyanLikePixels,
      cyanLikeRatio,
      dominantQuantizedPixels,
      dominantQuantizedRatio,
      neighborPairs,
      meanNeighborDelta,
      cyanLeak,
      flatLeak,
    },
  };
}

function rgbDelta(rgba, aPixel, bPixel) {
  const a = aPixel * 4;
  const b = bPixel * 4;
  return (
    Math.abs(rgba[a] - rgba[b]) +
    Math.abs(rgba[a + 1] - rgba[b + 1]) +
    Math.abs(rgba[a + 2] - rgba[b + 2])
  ) / 3;
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stddev(values, average) {
  if (!values.length) return 0;
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function clampBox(raw, dimensions) {
  const x = clampInt(Math.floor(Number(raw.x)), 0, dimensions.width - 1);
  const y = clampInt(Math.floor(Number(raw.y)), 0, dimensions.height - 1);
  const width = clampInt(Math.ceil(Number(raw.width)), 1, dimensions.width - x);
  const height = clampInt(Math.ceil(Number(raw.height)), 1, dimensions.height - y);
  return { x, y, width, height };
}

function validateRgba(rgba, dimensions, label) {
  const expected = dimensions.width * dimensions.height * 4;
  if (!(rgba instanceof Uint8Array) || rgba.length !== expected) {
    throw new Error(`${label} RGBA has ${rgba?.length ?? 0} bytes; expected ${expected}.`);
  }
}

function emptyMetrics() {
  return {
    selectedPixels: 0,
    meanRgb: [0, 0, 0],
    channelStdDev: [0, 0, 0],
    meanChannelStdDev: 0,
    cyanLikePixels: 0,
    cyanLikeRatio: 0,
    dominantQuantizedPixels: 0,
    dominantQuantizedRatio: 0,
    neighborPairs: 0,
    meanNeighborDelta: 0,
    cyanLeak: false,
    flatLeak: false,
  };
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
