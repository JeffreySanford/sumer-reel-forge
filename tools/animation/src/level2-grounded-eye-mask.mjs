const DEFAULT_THRESHOLD = 16;

export function buildGroundedEyeEditMask({
  eyeBoxes,
  dimensions,
  padXRatio = 0.08,
  padYRatio = 0.14,
}) {
  validateDimensions(dimensions);
  const boxes = normalizeEyeBoxes(eyeBoxes, dimensions);
  if (boxes.length !== 2) {
    throw new Error(`Grounded eye mask requires exactly two eye boxes; found ${boxes.length}.`);
  }

  const expandedBoxes = boxes.map((box) => expandBox(box, dimensions, padXRatio, padYRatio));
  assertPeerEyeGeometry(expandedBoxes);

  const mask = new Uint8Array(dimensions.width * dimensions.height);
  let selectedPixels = 0;
  for (const box of expandedBoxes) {
    const cx = box.x + (box.width - 1) / 2;
    const cy = box.y + (box.height - 1) / 2;
    const rx = Math.max(1, box.width / 2);
    const ry = Math.max(1, box.height / 2);
    for (let y = box.y; y < box.y + box.height; y += 1) {
      for (let x = box.x; x < box.x + box.width; x += 1) {
        const nx = (x - cx) / rx;
        const ny = (y - cy) / ry;
        // Superellipse-like shape: broader than an ellipse at the corners while
        // still keeping the edit tightly bounded to the grounded eye boxes.
        if (Math.pow(Math.abs(nx), 3.2) + Math.pow(Math.abs(ny), 3.2) > 1) continue;
        const pixel = y * dimensions.width + x;
        if (mask[pixel] === 0) {
          mask[pixel] = 255;
          selectedPixels += 1;
        }
      }
    }
  }

  if (!selectedPixels) throw new Error('Grounded eye edit mask is empty.');

  const boxArea = expandedBoxes.reduce((sum, box) => sum + box.width * box.height, 0);
  const bounds = unionBounds(expandedBoxes);
  return {
    mask,
    metrics: {
      selectedPixels,
      boxArea,
      fillRatio: selectedPixels / boxArea,
      eyeBoxes: boxes,
      expandedBoxes,
      bounds,
    },
  };
}

export function analyzeGroundedEyeState({
  referenceRgba,
  stateRgba,
  editMask,
  dimensions,
  boxArea,
  threshold = DEFAULT_THRESHOLD,
}) {
  const pixels = dimensions.width * dimensions.height;
  if (!(referenceRgba instanceof Uint8Array) || referenceRgba.length !== pixels * 4) {
    throw new Error('Grounded-eye proof reference RGBA has invalid dimensions.');
  }
  if (!(stateRgba instanceof Uint8Array) || stateRgba.length !== pixels * 4) {
    throw new Error('Grounded-eye proof state RGBA has invalid dimensions.');
  }
  if (!(editMask instanceof Uint8Array) || editMask.length !== pixels) {
    throw new Error('Grounded-eye proof edit mask has invalid dimensions.');
  }
  if (!(boxArea > 0)) throw new Error('Grounded-eye proof box area must be positive.');

  let alphaPixels = 0;
  let opaquePixels = 0;
  let outsideMaskAlphaPixels = 0;
  let changedPixels = 0;
  let strongChangedPixels = 0;
  let summedDiff = 0;

  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const offset = pixel * 4;
    const alpha = stateRgba[offset + 3];
    if (alpha <= threshold) continue;
    alphaPixels += 1;
    if (alpha >= 220) opaquePixels += 1;
    if (editMask[pixel] <= threshold) outsideMaskAlphaPixels += 1;

    const alphaWeight = alpha / 255;
    let diff = 0;
    for (let channel = 0; channel < 3; channel += 1) {
      const source = referenceRgba[offset + channel];
      const state = stateRgba[offset + channel];
      const composited = Math.round(state * alphaWeight + source * (1 - alphaWeight));
      diff += Math.abs(composited - source);
    }
    const meanDiff = diff / 3;
    summedDiff += meanDiff;
    if (meanDiff > 2) changedPixels += 1;
    if (meanDiff > 10) strongChangedPixels += 1;
  }

  const eyeBandFillRatio = alphaPixels / boxArea;
  const opaqueEyeBandFillRatio = opaquePixels / boxArea;
  const compositeChangedEyeBandRatio = changedPixels / boxArea;
  const strongChangedEyeBandRatio = strongChangedPixels / boxArea;
  const meanRgbDiff = alphaPixels ? summedDiff / alphaPixels : 0;
  const failures = [];

  if (outsideMaskAlphaPixels !== 0) {
    failures.push(`closed-eye state has ${outsideMaskAlphaPixels} alpha pixels outside the grounded edit mask`);
  }
  if (eyeBandFillRatio < 0.45) {
    failures.push(`closed-eye alpha coverage is too sparse; ${(eyeBandFillRatio * 100).toFixed(2)}% of grounded eye boxes`);
  }
  if (opaqueEyeBandFillRatio < 0.4) {
    failures.push(`closed-eye state lacks enough opaque eyelid area; ${(opaqueEyeBandFillRatio * 100).toFixed(2)}% of grounded eye boxes`);
  }
  if (compositeChangedEyeBandRatio < 0.08) {
    failures.push(`closed-eye composite changes too little of grounded eye boxes; ${(compositeChangedEyeBandRatio * 100).toFixed(2)}%`);
  }
  if (strongChangedEyeBandRatio < 0.04) {
    failures.push(`closed-eye composite lacks enough strong eye-region change; ${(strongChangedEyeBandRatio * 100).toFixed(2)}%`);
  }

  return {
    pass: failures.length === 0,
    failures,
    metrics: {
      alphaPixels,
      opaquePixels,
      outsideMaskAlphaPixels,
      changedPixels,
      strongChangedPixels,
      eyeBandFillRatio,
      opaqueEyeBandFillRatio,
      compositeChangedEyeBandRatio,
      strongChangedEyeBandRatio,
      meanRgbDiff,
    },
  };
}

export function normalizeEyeBoxes(eyeBoxes, dimensions) {
  if (!Array.isArray(eyeBoxes)) return [];
  return eyeBoxes
    .map((box) => ({
      x: clampInt(Number(box?.x), 0, dimensions.width - 1),
      y: clampInt(Number(box?.y), 0, dimensions.height - 1),
      width: clampInt(Number(box?.width), 1, dimensions.width),
      height: clampInt(Number(box?.height), 1, dimensions.height),
    }))
    .map((box) => ({
      ...box,
      width: Math.min(box.width, dimensions.width - box.x),
      height: Math.min(box.height, dimensions.height - box.y),
    }))
    .sort((a, b) => (a.x + a.width / 2) - (b.x + b.width / 2));
}

function assertPeerEyeGeometry(boxes) {
  const [left, right] = boxes;
  const leftCenterY = left.y + left.height / 2;
  const rightCenterY = right.y + right.height / 2;
  const meanHeight = (left.height + right.height) / 2;
  const centerGap = (right.x + right.width / 2) - (left.x + left.width / 2);
  const widthRatio = Math.max(left.width, right.width) / Math.min(left.width, right.width);
  const heightRatio = Math.max(left.height, right.height) / Math.min(left.height, right.height);
  if (Math.abs(leftCenterY - rightCenterY) > Math.max(6, meanHeight * 0.35)) {
    throw new Error('Grounded eye boxes are too vertically separated to be peer eyes.');
  }
  if (centerGap <= Math.max(left.width, right.width) * 0.75) {
    throw new Error('Grounded eye boxes are not sufficiently horizontally separated.');
  }
  if (widthRatio > 1.6 || heightRatio > 1.6) {
    throw new Error('Grounded eye boxes differ too much in size.');
  }
}

function expandBox(box, dimensions, padXRatio, padYRatio) {
  const padX = Math.max(1, Math.round(box.width * padXRatio));
  const padY = Math.max(1, Math.round(box.height * padYRatio));
  const x0 = Math.max(0, box.x - padX);
  const y0 = Math.max(0, box.y - padY);
  const x1 = Math.min(dimensions.width, box.x + box.width + padX);
  const y1 = Math.min(dimensions.height, box.y + box.height + padY);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

function unionBounds(boxes) {
  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width - 1));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height - 1));
  return { minX, minY, maxX, maxY };
}

function validateDimensions(dimensions) {
  if (!Number.isInteger(dimensions?.width) || dimensions.width < 1) {
    throw new Error('Grounded eye mask width must be a positive integer.');
  }
  if (!Number.isInteger(dimensions?.height) || dimensions.height < 1) {
    throw new Error('Grounded eye mask height must be a positive integer.');
  }
}

function clampInt(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}
