import { analyzeEyeSeedComponents } from './level2-character-state-localization.mjs';

const DEFAULT_THRESHOLD = 16;

export const DETERMINISTIC_CLOSED_EYE_STYLES = Object.freeze({
  soft: Object.freeze({ id: 'soft', skinAboveWeight: 0.62, seamStrength: 0.18, seamThickness: 1, seamCurve: 1 }),
  balanced: Object.freeze({ id: 'balanced', skinAboveWeight: 0.66, seamStrength: 0.26, seamThickness: 1, seamCurve: 1 }),
  defined: Object.freeze({ id: 'defined', skinAboveWeight: 0.70, seamStrength: 0.34, seamThickness: 2, seamCurve: 2 }),
});

export function synthesizeDeterministicClosedEyeState({
  referenceRgba,
  seedMask,
  editMask,
  dimensions,
  eyeBand,
  style = 'balanced',
  threshold = DEFAULT_THRESHOLD,
}) {
  validate({ referenceRgba, seedMask, editMask, dimensions, eyeBand });
  const preset = typeof style === 'string' ? DETERMINISTIC_CLOSED_EYE_STYLES[style] : style;
  if (!preset) throw new Error(`Unknown deterministic closed-eye style ${style}.`);

  const eyeGroups = deriveEyeGroups(seedMask, dimensions, eyeBand, threshold);
  if (!eyeGroups.length || eyeGroups.length > 2) {
    throw new Error(`Deterministic closed-eye synthesis requires one or two trusted eye groups; found ${eyeGroups.length}.`);
  }

  const samplingByGroup = new Map(
    eyeGroups.map((group) => [
      group,
      deriveCleanSamplingRows(group, eyeBand),
    ]),
  );

  const output = new Uint8Array(referenceRgba.length);
  let selected = 0;
  for (let y = eyeBand.minY; y <= eyeBand.maxY; y += 1) {
    for (let x = eyeBand.minX; x <= eyeBand.maxX; x += 1) {
      const pixel = y * dimensions.width + x;
      if (editMask[pixel] <= threshold) continue;
      selected += 1;
      const group = nearestGroup(x, y, eyeGroups);
      const sampling = samplingByGroup.get(group);
      const above = rgbaAt(referenceRgba, dimensions, x, sampling.aboveY);
      const below = rgbaAt(referenceRgba, dimensions, x, sampling.belowY);
      const verticalProgress = normalizedBetween(y, group.bounds.minY, group.bounds.maxY);
      const dynamicAboveWeight = clamp(
        preset.skinAboveWeight + (0.5 - verticalProgress) * 0.16,
        0.5,
        0.82,
      );
      const skin = blendRgb(above, below, dynamicAboveWeight);
      writeRgba(output, pixel, skin, 255);
    }
  }

  if (!selected) throw new Error('Deterministic closed-eye edit mask is empty.');

  let seamPixels = 0;
  for (const group of eyeGroups) {
    const halfWidth = clamp(Math.round(Math.max(8, group.width * 0.72)), 8, 30);
    const centerY = Math.round(group.centerY);
    for (let dx = -halfWidth; dx <= halfWidth; dx += 1) {
      const x = Math.round(group.centerX + dx);
      if (x < eyeBand.minX || x > eyeBand.maxX) continue;
      const nx = halfWidth ? dx / halfWidth : 0;
      const curve = Math.round(preset.seamCurve * (1 - nx * nx));
      const seamY = centerY + curve;
      for (let dy = -preset.seamThickness + 1; dy <= preset.seamThickness - 1; dy += 1) {
        const y = seamY + dy;
        if (y < eyeBand.minY || y > eyeBand.maxY) continue;
        const pixel = y * dimensions.width + x;
        if (editMask[pixel] <= threshold) continue;
        const current = output[pixel * 4 + 3] > 0
          ? rgbaAt(output, dimensions, x, y)
          : rgbaAt(referenceRgba, dimensions, x, y);
        const source = rgbaAt(referenceRgba, dimensions, x, y);
        const sourceLum = luminance(source);
        const currentLum = luminance(current);
        const targetLum = Math.min(currentLum, sourceLum) * (1 - preset.seamStrength);
        const scale = currentLum > 0 ? targetLum / currentLum : 1;
        const seam = current.slice(0, 3).map((value) => clampByte(Math.round(value * scale)));
        writeRgba(output, pixel, seam, 255);
        seamPixels += 1;
      }
    }
  }

  return {
    rgba: output,
    metrics: {
      selectedPixels: selected,
      seamPixels,
      eyeGroupCount: eyeGroups.length,
      eyeGroups,
      samplingRows: eyeGroups.map((group) => ({
        centerX: group.centerX,
        centerY: group.centerY,
        ...samplingByGroup.get(group),
      })),
      style: preset.id,
    },
  };
}

export function deriveEyeGroups(seedMask, dimensions, eyeBand, threshold = DEFAULT_THRESHOLD) {
  const components = analyzeEyeSeedComponents(seedMask, dimensions, eyeBand, threshold);
  if (!components.length) return [];
  const totalSelected = components.reduce((sum, item) => sum + item.selected, 0);
  const meaningfulFloor = Math.max(2, Math.floor(totalSelected * 0.04));
  const meaningful = components.filter((item) => item.selected >= meaningfulFloor).slice(0, 2);
  if (meaningful.length === 2) return meaningful;

  const strongest = meaningful[0] ?? components[0];
  if (strongest.width < 24) return [strongest];

  const points = [];
  for (let y = strongest.bounds.minY; y <= strongest.bounds.maxY; y += 1) {
    for (let x = strongest.bounds.minX; x <= strongest.bounds.maxX; x += 1) {
      const pixel = y * dimensions.width + x;
      if (seedMask[pixel] > threshold) points.push({ x, y });
    }
  }
  if (points.length < 4) return [strongest];
  const splitX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const left = summarize(points.filter((point) => point.x <= splitX));
  const right = summarize(points.filter((point) => point.x > splitX));
  if (!left || !right || Math.abs(left.centerX - right.centerX) < 6) return [strongest];
  return [left, right].sort((a, b) => a.centerX - b.centerX);
}

export function deriveCleanSamplingRows(group, eyeBand) {
  const groupHeight = Math.max(1, group.bounds.maxY - group.bounds.minY + 1);
  const margin = clamp(Math.round(groupHeight * 0.2), 3, 8);
  let aboveY = group.bounds.minY - margin;
  let belowY = group.bounds.maxY + margin;

  if (aboveY < eyeBand.minY) aboveY = group.bounds.minY - 1;
  if (belowY > eyeBand.maxY) belowY = group.bounds.maxY + 1;

  aboveY = clamp(aboveY, eyeBand.minY, eyeBand.maxY);
  belowY = clamp(belowY, eyeBand.minY, eyeBand.maxY);

  const aboveEscapes = aboveY < group.bounds.minY;
  const belowEscapes = belowY > group.bounds.maxY;
  if (!aboveEscapes && !belowEscapes) {
    throw new Error(
      `Deterministic closed-eye sampler cannot escape trusted eye bounds ${group.bounds.minY}-${group.bounds.maxY} inside eye band ${eyeBand.minY}-${eyeBand.maxY}.`,
    );
  }
  if (!aboveEscapes) aboveY = belowY;
  if (!belowEscapes) belowY = aboveY;

  return { aboveY, belowY, margin };
}

function summarize(points) {
  if (!points.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let sumX = 0;
  let sumY = 0;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
    sumX += point.x;
    sumY += point.y;
  }
  return {
    selected: points.length,
    centerX: sumX / points.length,
    centerY: sumY / points.length,
    bounds: { minX, minY, maxX, maxY },
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function nearestGroup(x, y, groups) {
  let best = groups[0];
  let bestDistance = Infinity;
  for (const group of groups) {
    const dx = x - group.centerX;
    const dy = (y - group.centerY) * 1.7;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      best = group;
      bestDistance = distance;
    }
  }
  return best;
}

function rgbaAt(rgba, dimensions, x, y) {
  const pixel = y * dimensions.width + x;
  const offset = pixel * 4;
  return [rgba[offset], rgba[offset + 1], rgba[offset + 2], rgba[offset + 3]];
}

function writeRgba(output, pixel, rgb, alpha) {
  const offset = pixel * 4;
  output[offset] = rgb[0];
  output[offset + 1] = rgb[1];
  output[offset + 2] = rgb[2];
  output[offset + 3] = alpha;
}

function blendRgb(a, b, aWeight) {
  return [0, 1, 2].map((channel) =>
    clampByte(Math.round(a[channel] * aWeight + b[channel] * (1 - aWeight))),
  );
}

function normalizedBetween(value, min, max) {
  if (max <= min) return 0.5;
  return clamp((value - min) / (max - min), 0, 1);
}

function luminance(rgb) {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function validate({ referenceRgba, seedMask, editMask, dimensions, eyeBand }) {
  const pixels = dimensions.width * dimensions.height;
  if (!(referenceRgba instanceof Uint8Array) || referenceRgba.length !== pixels * 4) {
    throw new Error('Deterministic closed-eye reference RGBA has invalid dimensions.');
  }
  if (!(seedMask instanceof Uint8Array) || seedMask.length !== pixels) {
    throw new Error('Deterministic closed-eye seed mask has invalid dimensions.');
  }
  if (!(editMask instanceof Uint8Array) || editMask.length !== pixels) {
    throw new Error('Deterministic closed-eye edit mask has invalid dimensions.');
  }
  if (eyeBand.minX < 0 || eyeBand.minY < 0 || eyeBand.maxX >= dimensions.width || eyeBand.maxY >= dimensions.height) {
    throw new Error('Deterministic closed-eye eye band is outside the image.');
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampByte(value) {
  return clamp(value, 0, 255);
}
