export function normalizedBoxToPixels(box, dimensions) {
  assertNormalizedBox(box, 'normalized box');
  const x1 = clampInt(Math.floor((box.x1 / 1000) * dimensions.width), 0, dimensions.width - 1);
  const y1 = clampInt(Math.floor((box.y1 / 1000) * dimensions.height), 0, dimensions.height - 1);
  const x2 = clampInt(Math.ceil((box.x2 / 1000) * dimensions.width), x1 + 1, dimensions.width);
  const y2 = clampInt(Math.ceil((box.y2 / 1000) * dimensions.height), y1 + 1, dimensions.height);
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

export function paddedPixelCrop(box, dimensions, { padXRatio = 0.18, padYRatio = 0.14 } = {}) {
  const padX = Math.max(4, Math.round(box.width * padXRatio));
  const padY = Math.max(4, Math.round(box.height * padYRatio));
  const x = clampInt(box.x - padX, 0, dimensions.width - 1);
  const y = clampInt(box.y - padY, 0, dimensions.height - 1);
  const x2 = clampInt(box.x + box.width + padX, x + 1, dimensions.width);
  const y2 = clampInt(box.y + box.height + padY, y + 1, dimensions.height);
  return { x, y, width: x2 - x, height: y2 - y };
}

export function mapCropBoxToFrame(normalizedBox, crop) {
  assertNormalizedBox(normalizedBox, 'crop-normalized eye box');
  const local = normalizedBoxToPixels(normalizedBox, { width: crop.width, height: crop.height });
  return {
    x: crop.x + local.x,
    y: crop.y + local.y,
    width: local.width,
    height: local.height,
  };
}

export function validateEyeGrounding({ faceBox, eyeBoxes, frameDimensions, faceCrop }) {
  const failures = [];
  if (!faceBox || !Array.isArray(eyeBoxes) || eyeBoxes.length !== 2) {
    return { pass: false, failures: ['face box and exactly two eye boxes are required'] };
  }
  try {
    assertNormalizedBox(faceBox, 'face box');
    for (const [index, eye] of eyeBoxes.entries()) assertNormalizedBox(eye, `eye box ${index + 1}`);
  } catch (error) {
    return { pass: false, failures: [error instanceof Error ? error.message : String(error)] };
  }

  const frameFace = normalizedBoxToPixels(faceBox, frameDimensions);
  const mappedEyes = eyeBoxes
    .map((eye) => mapCropBoxToFrame(eye, faceCrop))
    .sort((a, b) => centerX(a) - centerX(b));

  const faceAreaRatio = (frameFace.width * frameFace.height) / (frameDimensions.width * frameDimensions.height);
  if (faceAreaRatio < 0.003 || faceAreaRatio > 0.3) {
    failures.push(`face box area ${(faceAreaRatio * 100).toFixed(2)}% is implausible`);
  }

  for (const [index, eye] of mappedEyes.entries()) {
    const localWidthRatio = eye.width / faceCrop.width;
    const localHeightRatio = eye.height / faceCrop.height;
    if (localWidthRatio < 0.015 || localWidthRatio > 0.32) {
      failures.push(`eye ${index + 1} width ratio ${localWidthRatio.toFixed(3)} is implausible`);
    }
    if (localHeightRatio < 0.01 || localHeightRatio > 0.28) {
      failures.push(`eye ${index + 1} height ratio ${localHeightRatio.toFixed(3)} is implausible`);
    }
  }

  const verticalDelta = Math.abs(centerY(mappedEyes[0]) - centerY(mappedEyes[1])) / faceCrop.height;
  const horizontalSeparation = Math.abs(centerX(mappedEyes[1]) - centerX(mappedEyes[0])) / faceCrop.width;
  if (verticalDelta > 0.18) failures.push(`eye vertical-center delta ${verticalDelta.toFixed(3)} is too large`);
  if (horizontalSeparation < 0.08 || horizontalSeparation > 0.7) {
    failures.push(`eye horizontal separation ${horizontalSeparation.toFixed(3)} is implausible`);
  }

  return {
    pass: failures.length === 0,
    failures,
    frameFace,
    mappedEyes,
    metrics: { faceAreaRatio, verticalDelta, horizontalSeparation },
  };
}

export function assertNormalizedBox(box, label = 'box') {
  for (const key of ['x1', 'y1', 'x2', 'y2']) {
    if (!Number.isFinite(Number(box?.[key]))) throw new Error(`${label} ${key} is missing or invalid`);
    if (Number(box[key]) < 0 || Number(box[key]) > 1000) throw new Error(`${label} ${key} must be within 0..1000`);
  }
  if (!(Number(box.x2) > Number(box.x1) && Number(box.y2) > Number(box.y1))) {
    throw new Error(`${label} must have positive width and height`);
  }
}

function centerX(box) { return box.x + box.width / 2; }
function centerY(box) { return box.y + box.height / 2; }
function clampInt(value, min, max) { return Math.max(min, Math.min(max, Math.round(value))); }
