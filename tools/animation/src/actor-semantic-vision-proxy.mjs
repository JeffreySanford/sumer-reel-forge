export function isEnkiSemanticDiscoveryRequest(body) {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const text = messages.map((message) => String(message?.content ?? '')).join('\n');
  return text.includes('semantic actor locator for Sumer Reel Forge') &&
    text.includes('Locate exactly the requested Enki semantic regions and anchors');
}

export function expandPixelBounds(bounds, source, paddingFraction = 0.18) {
  if (!validPixelBounds(bounds) || !validSource(source)) {
    throw new Error('Valid alpha bounds and source dimensions are required.');
  }
  if (!Number.isFinite(paddingFraction) || paddingFraction < 0 || paddingFraction > 1) {
    throw new Error('paddingFraction must be in 0..1.');
  }

  const padX = Math.max(8, Math.round(bounds.width * paddingFraction));
  const padY = Math.max(8, Math.round(bounds.height * paddingFraction));
  const x = Math.max(0, bounds.x - padX);
  const y = Math.max(0, bounds.y - padY);
  const right = Math.min(source.width, bounds.x + bounds.width + padX);
  const bottom = Math.min(source.height, bounds.y + bounds.height + padY);

  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
}

export function mapProxyBoxToSource(box, metadata) {
  if (isZeroBox(box)) return zeroBox();
  if (!validNormalizedBox(box)) throw new Error('Proxy bbox must be normalized to 0..1.');
  const { source, crop } = validateMetadata(metadata);
  return clampNormalizedBox({
    x: (crop.x + box.x * crop.width) / source.width,
    y: (crop.y + box.y * crop.height) / source.height,
    width: (box.width * crop.width) / source.width,
    height: (box.height * crop.height) / source.height,
  });
}

export function mapProxyPointToSource(point, metadata) {
  if (isZeroPoint(point)) return zeroPoint();
  if (!validNormalizedPoint(point)) throw new Error('Proxy point must be normalized to 0..1.');
  const { source, crop } = validateMetadata(metadata);
  return {
    x: clamp01((crop.x + point.x * crop.width) / source.width),
    y: clamp01((crop.y + point.y * crop.height) / source.height),
  };
}

export function mapDiscoveryFromProxyToSource(discovery, metadata) {
  const regions = (discovery?.regions ?? []).map((region) => ({
    ...region,
    bbox: region?.status === 'not-visible'
      ? zeroBox()
      : mapProxyBoxToSource(region?.bbox, metadata),
    notes: appendNote(region?.notes, 'localized on deterministic alpha-crop vision proxy; coordinates remapped to registered source frame'),
  }));
  const anchors = (discovery?.anchors ?? []).map((anchor) => ({
    ...anchor,
    point: anchor?.status === 'not-visible'
      ? zeroPoint()
      : mapProxyPointToSource(anchor?.point, metadata),
    notes: appendNote(anchor?.notes, 'localized on deterministic alpha-crop vision proxy; coordinates remapped to registered source frame'),
  }));
  return { ...discovery, regions, anchors };
}

export function proxyInstruction(metadata) {
  const { source, crop } = validateMetadata(metadata);
  return [
    'VISION-PROXY CONTRACT:',
    'The attached image is a deterministic crop of the accepted registered Enki RGBA source, composited onto a neutral matte only to make visible source pixels easier to inspect.',
    'Return all bbox/point coordinates normalized to THIS ATTACHED PROXY IMAGE, not the original source frame.',
    'Do not compensate for the crop yourself; the host will map proxy coordinates back to the original registered source frame.',
    `Original source is ${source.width}x${source.height}; proxy crop in source pixels is x=${crop.x}, y=${crop.y}, width=${crop.width}, height=${crop.height}.`,
    'The matte contains no semantic content. Locate only Enki pixels; do not include matte background.',
  ].join(' ');
}

function validateMetadata(metadata) {
  const source = metadata?.source;
  const crop = metadata?.crop;
  if (!validSource(source) || !validPixelBounds(crop)) {
    throw new Error('Vision-proxy metadata requires valid source and crop dimensions.');
  }
  if (crop.x + crop.width > source.width || crop.y + crop.height > source.height) {
    throw new Error('Vision-proxy crop exceeds source bounds.');
  }
  return { source, crop };
}

function validSource(source) {
  return Boolean(source && Number.isInteger(source.width) && Number.isInteger(source.height) && source.width > 0 && source.height > 0);
}

function validPixelBounds(bounds) {
  return Boolean(
    bounds &&
    Number.isInteger(bounds.x) && Number.isInteger(bounds.y) &&
    Number.isInteger(bounds.width) && Number.isInteger(bounds.height) &&
    bounds.x >= 0 && bounds.y >= 0 && bounds.width > 0 && bounds.height > 0,
  );
}

function validNormalizedBox(box) {
  return Boolean(
    box && [box.x, box.y, box.width, box.height].every(Number.isFinite) &&
    box.x >= 0 && box.y >= 0 && box.width > 0 && box.height > 0 &&
    box.x <= 1 && box.y <= 1 && box.x + box.width <= 1.000001 && box.y + box.height <= 1.000001,
  );
}

function validNormalizedPoint(point) {
  return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1);
}

function clampNormalizedBox(box) {
  const x = clamp01(box.x);
  const y = clamp01(box.y);
  const right = clamp01(box.x + box.width);
  const bottom = clamp01(box.y + box.height);
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function isZeroBox(box) {
  return Boolean(box && box.x === 0 && box.y === 0 && box.width === 0 && box.height === 0);
}

function isZeroPoint(point) {
  return Boolean(point && point.x === 0 && point.y === 0);
}

function zeroBox() {
  return { x: 0, y: 0, width: 0, height: 0 };
}

function zeroPoint() {
  return { x: 0, y: 0 };
}

function appendNote(note, suffix) {
  const base = String(note ?? '').trim();
  return base ? `${base} [${suffix}]` : `[${suffix}]`;
}
