const DEFAULT_THRESHOLD = 16;
const ALIGNMENT = 8;

export function deriveEnkiUpperFaceRoi({
  bodyRgba,
  dimensions,
  threshold = DEFAULT_THRESHOLD,
}) {
  const bodyBounds = alphaBounds(bodyRgba, dimensions, threshold);
  if (!bodyBounds) throw new Error('Approved Enki body alpha is empty.');

  const bodyHeight = bodyBounds.maxY - bodyBounds.minY + 1;
  const upperSliceMaxY = Math.min(
    bodyBounds.maxY,
    bodyBounds.minY + Math.max(12, Math.round(bodyHeight * 0.32)),
  );
  const headBounds = alphaBounds(bodyRgba, dimensions, threshold, {
    minY: bodyBounds.minY,
    maxY: upperSliceMaxY,
  });
  if (!headBounds) throw new Error('Could not derive Enki upper-face alpha bounds.');

  const headWidth = headBounds.maxX - headBounds.minX + 1;
  const headHeight = headBounds.maxY - headBounds.minY + 1;
  const paddingX = Math.max(12, Math.round(headWidth * 0.16));
  const paddingY = Math.max(8, Math.round(headHeight * 0.1));
  const crop = alignedCrop(
    {
      minX: Math.max(0, headBounds.minX - paddingX),
      minY: Math.max(0, headBounds.minY - paddingY),
      maxX: Math.min(dimensions.width - 1, headBounds.maxX + paddingX),
      maxY: Math.min(dimensions.height - 1, headBounds.maxY + paddingY),
    },
    dimensions,
  );

  const eyeBand = {
    minX: headBounds.minX,
    maxX: headBounds.maxX,
    minY: clampInt(
      Math.round(headBounds.minY + headHeight * 0.26),
      headBounds.minY,
      headBounds.maxY,
    ),
    maxY: clampInt(
      Math.round(headBounds.minY + headHeight * 0.58),
      headBounds.minY,
      headBounds.maxY,
    ),
  };

  return {
    bodyBounds,
    headBounds,
    crop,
    eyeBand,
    bodyHeight,
    headWidth,
    headHeight,
  };
}

export function constrainSamEyeMask({
  samRgba,
  samDimensions,
  crop,
  bodyRgba,
  dimensions,
  eyeBand,
  threshold = DEFAULT_THRESHOLD,
}) {
  if (
    samDimensions.width !== crop.width ||
    samDimensions.height !== crop.height
  ) {
    throw new Error(
      `SAM eye result ${samDimensions.width}x${samDimensions.height} does not match face crop ${crop.width}x${crop.height}.`,
    );
  }

  const fullMask = new Uint8Array(dimensions.width * dimensions.height);
  let samSelected = 0;
  let outsideBodyRejected = 0;
  let outsideBandRejected = 0;

  for (let y = 0; y < samDimensions.height; y += 1) {
    for (let x = 0; x < samDimensions.width; x += 1) {
      const cropPixel = y * samDimensions.width + x;
      if (samRgba[cropPixel * 4 + 3] <= threshold) continue;
      samSelected += 1;
      const fullX = crop.x + x;
      const fullY = crop.y + y;
      const fullPixel = fullY * dimensions.width + fullX;
      if (bodyRgba[fullPixel * 4 + 3] <= threshold) {
        outsideBodyRejected += 1;
        continue;
      }
      if (!insideBounds(fullX, fullY, eyeBand)) {
        outsideBandRejected += 1;
        continue;
      }
      fullMask[fullPixel] = 255;
    }
  }

  return {
    mask: fullMask,
    samSelected,
    outsideBodyRejected,
    outsideBandRejected,
  };
}

export function dilateEyeMaskWithinConstraints({
  mask,
  bodyRgba,
  dimensions,
  eyeBand,
  radius = 1,
  threshold = DEFAULT_THRESHOLD,
}) {
  if (!Number.isInteger(radius) || radius < 0 || radius > 3) {
    throw new Error('Eye-mask dilation radius must be an integer from 0 to 3.');
  }
  if (radius === 0) return new Uint8Array(mask);

  const output = new Uint8Array(mask);
  for (let y = eyeBand.minY; y <= eyeBand.maxY; y += 1) {
    for (let x = eyeBand.minX; x <= eyeBand.maxX; x += 1) {
      const pixel = y * dimensions.width + x;
      if (bodyRgba[pixel * 4 + 3] <= threshold) continue;
      let selected = false;
      for (let dy = -radius; dy <= radius && !selected; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const sx = x + dx;
          const sy = y + dy;
          if (
            sx < 0 ||
            sx >= dimensions.width ||
            sy < 0 ||
            sy >= dimensions.height
          ) {
            continue;
          }
          if (mask[sy * dimensions.width + sx] > threshold) {
            selected = true;
            break;
          }
        }
      }
      if (selected) output[pixel] = 255;
    }
  }
  return output;
}

export function analyzeGrayMask(mask, dimensions, threshold = DEFAULT_THRESHOLD) {
  let selected = 0;
  let minX = dimensions.width;
  let minY = dimensions.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < dimensions.height; y += 1) {
    for (let x = 0; x < dimensions.width; x += 1) {
      if (mask[y * dimensions.width + x] <= threshold) continue;
      selected += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return {
    selected,
    coverageRatio: selected / (dimensions.width * dimensions.height),
    bounds: selected ? { minX, minY, maxX, maxY } : null,
  };
}

function alphaBounds(rgba, dimensions, threshold, window = {}) {
  const minWindowY = window.minY ?? 0;
  const maxWindowY = window.maxY ?? dimensions.height - 1;
  let minX = dimensions.width;
  let minY = dimensions.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = minWindowY; y <= maxWindowY; y += 1) {
    for (let x = 0; x < dimensions.width; x += 1) {
      const pixel = y * dimensions.width + x;
      if (rgba[pixel * 4 + 3] <= threshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return maxX >= minX ? { minX, minY, maxX, maxY } : null;
}

function alignedCrop(bounds, dimensions) {
  const x0 = Math.max(0, Math.floor(bounds.minX / ALIGNMENT) * ALIGNMENT);
  const y0 = Math.max(0, Math.floor(bounds.minY / ALIGNMENT) * ALIGNMENT);
  const x1 = Math.min(
    dimensions.width,
    Math.ceil((bounds.maxX + 1) / ALIGNMENT) * ALIGNMENT,
  );
  const y1 = Math.min(
    dimensions.height,
    Math.ceil((bounds.maxY + 1) / ALIGNMENT) * ALIGNMENT,
  );
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

function insideBounds(x, y, bounds) {
  return (
    x >= bounds.minX &&
    x <= bounds.maxX &&
    y >= bounds.minY &&
    y <= bounds.maxY
  );
}

function clampInt(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
