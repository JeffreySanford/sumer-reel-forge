const DEFAULT_THRESHOLD = 16;

export function expandTrustedEyeSeedMask({
  seedMask,
  dimensions,
  eyeBand,
  threshold = DEFAULT_THRESHOLD,
  targetFillRatio = 0.015,
  maxFillRatio = 0.03,
  minSeedInBandRatio = 0.98,
  maxHorizontalRadius = 24,
  maxVerticalRadius = 10,
}) {
  validateInputs({
    seedMask,
    dimensions,
    eyeBand,
    targetFillRatio,
    maxFillRatio,
    minSeedInBandRatio,
    maxHorizontalRadius,
    maxVerticalRadius,
  });

  const eyeBandArea = boundsArea(eyeBand);
  const seedPoints = [];
  let totalSeedPixels = 0;
  let inBandSeedPixels = 0;
  let minX = dimensions.width;
  let minY = dimensions.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < dimensions.height; y += 1) {
    for (let x = 0; x < dimensions.width; x += 1) {
      const pixel = y * dimensions.width + x;
      if (seedMask[pixel] <= threshold) continue;
      totalSeedPixels += 1;
      if (!insideBounds(x, y, eyeBand)) continue;
      inBandSeedPixels += 1;
      seedPoints.push({ x, y });
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (!totalSeedPixels || !inBandSeedPixels) {
    throw new Error('Trusted eye replacement seed is empty inside the eye band.');
  }

  const seedInBandRatio = inBandSeedPixels / totalSeedPixels;
  if (seedInBandRatio < minSeedInBandRatio) {
    throw new Error(
      `Trusted eye replacement seed escaped the eye band: ${(seedInBandRatio * 100).toFixed(2)}% in-band.`,
    );
  }

  const targetSelected = Math.ceil(eyeBandArea * targetFillRatio);
  const maxSelected = Math.floor(eyeBandArea * maxFillRatio);
  const output = new Uint8Array(seedMask.length);
  for (const point of seedPoints) {
    output[point.y * dimensions.width + point.x] = 255;
  }

  let selected = countSelected(output, dimensions, eyeBand, threshold);
  let usedHorizontalRadius = 0;
  let usedVerticalRadius = 0;

  for (let step = 1; selected < targetSelected; step += 1) {
    const radiusX = Math.min(maxHorizontalRadius, 2 + step * 2);
    const radiusY = Math.min(maxVerticalRadius, 1 + Math.floor(step / 2));
    paintSeedEnvelope({
      output,
      seedPoints,
      dimensions,
      eyeBand,
      radiusX,
      radiusY,
    });
    selected = countSelected(output, dimensions, eyeBand, threshold);
    usedHorizontalRadius = radiusX;
    usedVerticalRadius = radiusY;

    if (selected > maxSelected) {
      throw new Error(
        `Trusted eye replacement mask exceeded ${(maxFillRatio * 100).toFixed(2)}% of the eye band while growing.`,
      );
    }

    if (
      radiusX >= maxHorizontalRadius &&
      radiusY >= maxVerticalRadius &&
      selected < targetSelected
    ) {
      break;
    }
  }

  const fillRatio = selected / eyeBandArea;
  if (selected < targetSelected) {
    throw new Error(
      `Trusted eye replacement mask could only reach ${(fillRatio * 100).toFixed(3)}% of the eye band; target ${(targetFillRatio * 100).toFixed(2)}%.`,
    );
  }

  return {
    mask: output,
    metrics: {
      eyeBandArea,
      totalSeedPixels,
      inBandSeedPixels,
      seedInBandRatio,
      seedBounds: { minX, minY, maxX, maxY },
      selectedPixels: selected,
      fillRatio,
      targetFillRatio,
      maxFillRatio,
      usedHorizontalRadius,
      usedVerticalRadius,
    },
  };
}

function paintSeedEnvelope({
  output,
  seedPoints,
  dimensions,
  eyeBand,
  radiusX,
  radiusY,
}) {
  for (const point of seedPoints) {
    const minX = Math.max(eyeBand.minX, point.x - radiusX);
    const maxX = Math.min(eyeBand.maxX, point.x + radiusX);
    const minY = Math.max(eyeBand.minY, point.y - radiusY);
    const maxY = Math.min(eyeBand.maxY, point.y + radiusY);

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const dx = radiusX ? (x - point.x) / radiusX : 0;
        const dy = radiusY ? (y - point.y) / radiusY : 0;
        if (dx * dx + dy * dy > 1) continue;
        output[y * dimensions.width + x] = 255;
      }
    }
  }
}

function countSelected(mask, dimensions, bounds, threshold) {
  let selected = 0;
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      if (mask[y * dimensions.width + x] > threshold) selected += 1;
    }
  }
  return selected;
}

function validateInputs({
  seedMask,
  dimensions,
  eyeBand,
  targetFillRatio,
  maxFillRatio,
  minSeedInBandRatio,
  maxHorizontalRadius,
  maxVerticalRadius,
}) {
  if (!(seedMask instanceof Uint8Array)) {
    throw new Error('Trusted eye replacement seed must be a Uint8Array.');
  }
  const expected = dimensions.width * dimensions.height;
  if (seedMask.length !== expected) {
    throw new Error(
      `Trusted eye replacement seed has ${seedMask.length} pixels; expected ${expected}.`,
    );
  }
  if (boundsArea(eyeBand) <= 0) {
    throw new Error('Trusted eye replacement eye band is empty.');
  }
  if (!(targetFillRatio > 0 && targetFillRatio < maxFillRatio)) {
    throw new Error('Trusted eye replacement target fill must be positive and below max fill.');
  }
  if (!(maxFillRatio <= 0.05)) {
    throw new Error('Trusted eye replacement max fill may not exceed 5% of the eye band.');
  }
  if (!(minSeedInBandRatio >= 0.9 && minSeedInBandRatio <= 1)) {
    throw new Error('Trusted eye replacement in-band seed ratio must be between 0.9 and 1.');
  }
  if (!Number.isInteger(maxHorizontalRadius) || maxHorizontalRadius < 1) {
    throw new Error('Trusted eye replacement maxHorizontalRadius must be a positive integer.');
  }
  if (!Number.isInteger(maxVerticalRadius) || maxVerticalRadius < 1) {
    throw new Error('Trusted eye replacement maxVerticalRadius must be a positive integer.');
  }
}

function insideBounds(x, y, bounds) {
  return (
    x >= bounds.minX &&
    x <= bounds.maxX &&
    y >= bounds.minY &&
    y <= bounds.maxY
  );
}

function boundsArea(bounds) {
  return Math.max(0, bounds.maxX - bounds.minX + 1) *
    Math.max(0, bounds.maxY - bounds.minY + 1);
}
