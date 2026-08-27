export function evaluateNormalizedRiggingBox(box, { maxArea = 0.35, minArea = 0.0005 } = {}) {
  const values = box
    ? [box.xMin, box.yMin, box.xMax, box.yMax].map((value) =>
        typeof value === 'string' && value.trim() !== '' ? Number(value) : value,
      )
    : [];

  if (
    values.length !== 4 ||
    values.some((value) => !Number.isFinite(value) || value < 0 || value > 1)
  ) {
    return {
      ok: false,
      reason: 'bounds must be finite normalized decimals between 0 and 1',
      box: null,
      area: null,
    };
  }

  const [xMin, yMin, xMax, yMax] = values;
  if (xMax <= xMin || yMax <= yMin) {
    return {
      ok: false,
      reason: 'bounds must have positive width and height',
      box: null,
      area: null,
    };
  }

  const normalized = { xMin, yMin, xMax, yMax };
  const area = (xMax - xMin) * (yMax - yMin);
  if (area > maxArea) {
    return {
      ok: false,
      reason: `box covers ${(area * 100).toFixed(1)}% of the frame; maximum is ${(maxArea * 100).toFixed(1)}%`,
      box: normalized,
      area,
    };
  }
  if (area < minArea) {
    return {
      ok: false,
      reason: `box covers only ${(area * 100).toFixed(3)}% of the frame; minimum is ${(minArea * 100).toFixed(3)}%`,
      box: normalized,
      area,
    };
  }

  return { ok: true, reason: null, box: normalized, area };
}

export function isRiggingLocatorRequest(body) {
  return Boolean(
    body?.format?.properties?.target?.properties?.bboxNormalized &&
      Array.isArray(body?.messages) &&
      body.messages.some((message) =>
        String(message?.content ?? '').toLowerCase().includes('rigging-cluster'),
      ),
  );
}
