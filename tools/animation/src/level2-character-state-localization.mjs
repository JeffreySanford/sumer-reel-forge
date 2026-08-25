const DEFAULT_THRESHOLD = 16;
const ALIGNMENT = 8;
const DEFAULT_MIN_EYE_BAND_FILL = 0.01;
const DEFAULT_MAX_ADAPTIVE_RADIUS = 3;
const DEFAULT_MAX_EYE_COMPONENTS = 2;

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
  minEyeBandFill = DEFAULT_MIN_EYE_BAND_FILL,
  maxAdaptiveRadius = DEFAULT_MAX_ADAPTIVE_RADIUS,
  maxEyeComponents = DEFAULT_MAX_EYE_COMPONENTS,
}) {
  if (!Number.isInteger(radius) || radius < 0 || radius > 3) {
    throw new Error('Eye-mask dilation radius must be an integer from 0 to 3.');
  }
  if (
    !Number.isInteger(maxAdaptiveRadius) ||
    maxAdaptiveRadius < radius ||
    maxAdaptiveRadius > 3
  ) {
    throw new Error(
      'Eye-mask maxAdaptiveRadius must be an integer from radius through 3.',
    );
  }
  if (
    !Number.isFinite(minEyeBandFill) ||
    minEyeBandFill < 0 ||
    minEyeBandFill > 0.1
  ) {
    throw new Error('Eye-mask minEyeBandFill must be between 0 and 0.1.');
  }
  if (
    !Number.isInteger(maxEyeComponents) ||
    maxEyeComponents < 1 ||
    maxEyeComponents > 4
  ) {
    throw new Error('Eye-mask maxEyeComponents must be an integer from 1 through 4.');
  }
  if (radius === 0) return new Uint8Array(mask);

  let output = dilateAtRadius({
    mask,
    bodyRgba,
    dimensions,
    eyeBand,
    radius,
    threshold,
  });
  let fill = eyeBandFillRatio(output, dimensions, eyeBand, threshold);

  // First preserve the literal SAM shape and try only tiny isotropic growth.
  for (
    let adaptiveRadius = radius + 1;
    fill < minEyeBandFill && adaptiveRadius <= maxAdaptiveRadius;
    adaptiveRadius += 1
  ) {
    output = dilateAtRadius({
      mask,
      bodyRgba,
      dimensions,
      eyeBand,
      radius: adaptiveRadius,
      threshold,
    });
    fill = eyeBandFillRatio(output, dimensions, eyeBand, threshold);
  }

  // Real painted eyes can be only a few semantic pixels even when the allowed
  // eye band is comparatively large. If SAM found a valid in-band seed but the
  // fixed 1-3px growth is still too sparse, turn at most the strongest one/two
  // connected seed components into horizontally biased eyelid editing patches.
  // The approved Enki alpha and deterministic eye band remain hard boundaries,
  // and growth stops as soon as the existing minimum fill is reached.
  if (fill < minEyeBandFill) {
    output = growCompactEyeSeedComponents({
      seedMask: mask,
      baseMask: output,
      bodyRgba,
      dimensions,
      eyeBand,
      threshold,
      targetFill: minEyeBandFill,
      maxComponents: maxEyeComponents,
    });
  }

  return output;
}

export function eyeBandFillRatio(
  mask,
  dimensions,
  eyeBand,
  threshold = DEFAULT_THRESHOLD,
) {
  const area = eyeBandArea(eyeBand);
  if (area <= 0) return 1;
  let selected = 0;
  for (let y = eyeBand.minY; y <= eyeBand.maxY; y += 1) {
    for (let x = eyeBand.minX; x <= eyeBand.maxX; x += 1) {
      if (mask[y * dimensions.width + x] > threshold) selected += 1;
    }
  }
  return selected / area;
}

export function analyzeEyeSeedComponents(
  mask,
  dimensions,
  eyeBand,
  threshold = DEFAULT_THRESHOLD,
) {
  const visited = new Uint8Array(dimensions.width * dimensions.height);
  const components = [];
  const neighbors = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];

  for (let y = eyeBand.minY; y <= eyeBand.maxY; y += 1) {
    for (let x = eyeBand.minX; x <= eyeBand.maxX; x += 1) {
      const start = y * dimensions.width + x;
      if (visited[start] || mask[start] <= threshold) continue;

      const queue = [start];
      visited[start] = 1;
      let cursor = 0;
      let selected = 0;
      let sumX = 0;
      let sumY = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;

      while (cursor < queue.length) {
        const pixel = queue[cursor++];
        const px = pixel % dimensions.width;
        const py = Math.floor(pixel / dimensions.width);
        selected += 1;
        sumX += px;
        sumY += py;
        minX = Math.min(minX, px);
        maxX = Math.max(maxX, px);
        minY = Math.min(minY, py);
        maxY = Math.max(maxY, py);

        for (const [dx, dy] of neighbors) {
          const nx = px + dx;
          const ny = py + dy;
          if (!insideBounds(nx, ny, eyeBand)) continue;
          const next = ny * dimensions.width + nx;
          if (visited[next] || mask[next] <= threshold) continue;
          visited[next] = 1;
          queue.push(next);
        }
      }

      components.push({
        selected,
        centerX: sumX / selected,
        centerY: sumY / selected,
        bounds: { minX, minY, maxX, maxY },
        width: maxX - minX + 1,
        height: maxY - minY + 1,
      });
    }
  }

  return components.sort((a, b) => b.selected - a.selected);
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

function growCompactEyeSeedComponents({
  seedMask,
  baseMask,
  bodyRgba,
  dimensions,
  eyeBand,
  threshold,
  targetFill,
  maxComponents,
}) {
  const components = analyzeEyeSeedComponents(
    seedMask,
    dimensions,
    eyeBand,
    threshold,
  ).slice(0, maxComponents);
  if (!components.length) return new Uint8Array(baseMask);

  const output = new Uint8Array(baseMask);
  const bandWidth = eyeBand.maxX - eyeBand.minX + 1;
  const bandHeight = eyeBand.maxY - eyeBand.minY + 1;
  const maxHalfWidth = Math.max(3, Math.min(18, Math.round(bandWidth * 0.14)));
  const maxHalfHeight = Math.max(2, Math.min(8, Math.round(bandHeight * 0.22)));
  const targetSelected = Math.ceil(eyeBandArea(eyeBand) * targetFill);

  for (let step = 1; step <= Math.max(maxHalfWidth, maxHalfHeight); step += 1) {
    const halfWidth = Math.min(maxHalfWidth, 2 + step);
    const halfHeight = Math.min(maxHalfHeight, 1 + Math.floor(step / 3));
    for (const component of components) {
      paintConstrainedEllipse({
        output,
        bodyRgba,
        dimensions,
        eyeBand,
        centerX: Math.round(component.centerX),
        centerY: Math.round(component.centerY),
        halfWidth,
        halfHeight,
        threshold,
      });
    }
    if (
      countSelectedInBand(output, dimensions, eyeBand, threshold) >=
      targetSelected
    ) {
      break;
    }
  }

  return output;
}

function paintConstrainedEllipse({
  output,
  bodyRgba,
  dimensions,
  eyeBand,
  centerX,
  centerY,
  halfWidth,
  halfHeight,
  threshold,
}) {
  const minX = Math.max(eyeBand.minX, centerX - halfWidth);
  const maxX = Math.min(eyeBand.maxX, centerX + halfWidth);
  const minY = Math.max(eyeBand.minY, centerY - halfHeight);
  const maxY = Math.min(eyeBand.maxY, centerY + halfHeight);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = halfWidth ? (x - centerX) / halfWidth : 0;
      const dy = halfHeight ? (y - centerY) / halfHeight : 0;
      if (dx * dx + dy * dy > 1) continue;
      const pixel = y * dimensions.width + x;
      if (bodyRgba[pixel * 4 + 3] <= threshold) continue;
      output[pixel] = 255;
    }
  }
}

function dilateAtRadius({
  mask,
  bodyRgba,
  dimensions,
  eyeBand,
  radius,
  threshold,
}) {
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

function countSelectedInBand(mask, dimensions, eyeBand, threshold) {
  let selected = 0;
  for (let y = eyeBand.minY; y <= eyeBand.maxY; y += 1) {
    for (let x = eyeBand.minX; x <= eyeBand.maxX; x += 1) {
      if (mask[y * dimensions.width + x] > threshold) selected += 1;
    }
  }
  return selected;
}

function eyeBandArea(eyeBand) {
  return (
    (eyeBand.maxX - eyeBand.minX + 1) *
    (eyeBand.maxY - eyeBand.minY + 1)
  );
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
