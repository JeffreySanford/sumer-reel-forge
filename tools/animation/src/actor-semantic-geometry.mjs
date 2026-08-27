export const ACTOR_REGION_IDS = Object.freeze([
  'region:enki:head',
  'region:enki:face',
  'region:enki:hair-beard',
  'region:enki:eye-left',
  'region:enki:eye-right',
  'region:enki:crown',
  'region:enki:torso-robe',
  'region:enki:upper-arm-left',
  'region:enki:upper-arm-right',
  'region:enki:forearm-left',
  'region:enki:forearm-right',
  'region:enki:hand-left',
  'region:enki:hand-right',
]);

export const ACTOR_ANCHOR_IDS = Object.freeze([
  'anchor:enki:hand-left',
  'anchor:enki:hand-right',
  'anchor:enki:gaze-origin',
  'anchor:enki:head-center',
  'anchor:enki:torso-root',
  'anchor:enki:seat-or-stance-root',
]);

const CORE_REGION_IDS = Object.freeze([
  'region:enki:head',
  'region:enki:face',
  'region:enki:crown',
  'region:enki:torso-robe',
]);

const FACIAL_REGION_IDS = Object.freeze([
  'region:enki:face',
  'region:enki:eye-left',
  'region:enki:eye-right',
]);

const HAND_REGION_IDS = Object.freeze([
  'region:enki:hand-left',
  'region:enki:hand-right',
]);

export function normalizeDiscoveryRun(run) {
  const regions = new Map((run?.regions ?? []).map((item) => [item.id, item]));
  const anchors = new Map((run?.anchors ?? []).map((item) => [item.id, item]));
  return { ...run, regions, anchors };
}

export function buildSemanticConsensus(runA, runB) {
  const a = normalizeDiscoveryRun(runA);
  const b = normalizeDiscoveryRun(runB);

  const regions = ACTOR_REGION_IDS.map((id) => {
    const left = a.regions.get(id);
    const right = b.regions.get(id);
    if (!left || !right) {
      return missingRegion(id, 'missing from one or both discovery passes');
    }
    if (left.status === 'not-visible' && right.status === 'not-visible') {
      return missingRegion(id, 'both discovery passes report not visible', Math.min(left.confidence, right.confidence));
    }
    if (left.status !== 'found' || right.status !== 'found') {
      return {
        id,
        status: 'uncertain',
        confidence: Math.min(left.confidence, right.confidence),
        bbox: averageBox(left.bbox, right.bbox),
        agreement: { iou: safeIou(left.bbox, right.bbox), stable: false },
        notes: `pass disagreement: ${left.status} vs ${right.status}`,
      };
    }
    const iou = safeIou(left.bbox, right.bbox);
    return {
      id,
      status: iou >= 0.55 ? 'found' : 'uncertain',
      confidence: Math.min(left.confidence, right.confidence),
      bbox: averageBox(left.bbox, right.bbox),
      agreement: { iou, stable: iou >= 0.55 },
      notes: iou >= 0.55 ? 'two-pass spatial agreement' : 'two-pass boxes disagree',
    };
  });

  const anchors = ACTOR_ANCHOR_IDS.map((id) => {
    const left = a.anchors.get(id);
    const right = b.anchors.get(id);
    if (!left || !right) {
      return missingAnchor(id, 'missing from one or both discovery passes');
    }
    if (left.status === 'not-visible' && right.status === 'not-visible') {
      return missingAnchor(id, 'both discovery passes report not visible', Math.min(left.confidence, right.confidence));
    }
    if (left.status !== 'found' || right.status !== 'found') {
      return {
        id,
        status: 'uncertain',
        confidence: Math.min(left.confidence, right.confidence),
        point: averagePoint(left.point, right.point),
        agreement: { distance: pointDistance(left.point, right.point), stable: false },
        notes: `pass disagreement: ${left.status} vs ${right.status}`,
      };
    }
    const distance = pointDistance(left.point, right.point);
    return {
      id,
      status: distance <= 0.06 ? 'found' : 'uncertain',
      confidence: Math.min(left.confidence, right.confidence),
      point: averagePoint(left.point, right.point),
      agreement: { distance, stable: distance <= 0.06 },
      notes: distance <= 0.06 ? 'two-pass spatial agreement' : 'two-pass anchor positions disagree',
    };
  });

  return {
    schemaVersion: 1,
    type: 'actor-semantic-discovery-consensus',
    regions,
    anchors,
  };
}

export function evaluateSemanticDiscovery(consensus) {
  const issues = [];
  const advisories = [];
  const regions = new Map((consensus?.regions ?? []).map((item) => [item.id, item]));
  const anchors = new Map((consensus?.anchors ?? []).map((item) => [item.id, item]));

  for (const id of ACTOR_REGION_IDS) {
    const region = regions.get(id);
    if (!region) {
      issues.push(`${id} is missing from consensus.`);
      continue;
    }
    validateRegionGeometry(region, issues);
    if (region.status !== 'found') advisories.push(`${id} is ${region.status}.`);
  }

  for (const id of ACTOR_ANCHOR_IDS) {
    const anchor = anchors.get(id);
    if (!anchor) {
      issues.push(`${id} is missing from consensus.`);
      continue;
    }
    validateAnchorGeometry(anchor, issues);
    if (anchor.status !== 'found') advisories.push(`${id} is ${anchor.status}.`);
  }

  for (const id of CORE_REGION_IDS) {
    if (regions.get(id)?.status !== 'found') {
      issues.push(`Core semantic region ${id} is not stably found.`);
    }
  }

  const head = foundBox(regions, 'region:enki:head');
  const face = foundBox(regions, 'region:enki:face');
  const eyeLeft = foundBox(regions, 'region:enki:eye-left');
  const eyeRight = foundBox(regions, 'region:enki:eye-right');
  const crown = foundBox(regions, 'region:enki:crown');
  const torso = foundBox(regions, 'region:enki:torso-robe');

  if (head && face && containmentRatio(face, head) < 0.78) {
    issues.push('Face is not sufficiently contained by the discovered head region.');
  }
  if (face && eyeLeft && containmentRatio(eyeLeft, face) < 0.85) {
    issues.push('Left eye is not sufficiently contained by the discovered face region.');
  }
  if (face && eyeRight && containmentRatio(eyeRight, face) < 0.85) {
    issues.push('Right eye is not sufficiently contained by the discovered face region.');
  }
  if (head && crown && !crownIsPlausiblyAttached(crown, head)) {
    issues.push('Crown is spatially disconnected from the discovered head region.');
  }

  validateAnchorInsideRegion(anchors, regions, 'anchor:enki:head-center', 'region:enki:head', issues);
  validateAnchorInsideRegion(anchors, regions, 'anchor:enki:gaze-origin', 'region:enki:face', issues);
  validateAnchorInsideRegion(anchors, regions, 'anchor:enki:torso-root', 'region:enki:torso-robe', issues);
  validateAnchorInsideRegion(anchors, regions, 'anchor:enki:hand-left', 'region:enki:hand-left', issues);
  validateAnchorInsideRegion(anchors, regions, 'anchor:enki:hand-right', 'region:enki:hand-right', issues);

  const facialLocalizationReady = FACIAL_REGION_IDS.every((id) => regions.get(id)?.status === 'found') &&
    ['anchor:enki:gaze-origin', 'anchor:enki:head-center'].every((id) => anchors.get(id)?.status === 'found');
  const handContactLocalizationReady = HAND_REGION_IDS.every((id) => regions.get(id)?.status === 'found') &&
    ['anchor:enki:hand-left', 'anchor:enki:hand-right'].every((id) => anchors.get(id)?.status === 'found');
  const torsoLocalizationReady = Boolean(torso && anchors.get('anchor:enki:torso-root')?.status === 'found');

  return {
    schemaVersion: 1,
    type: 'actor-semantic-geometry-qa',
    structuralPass: issues.length === 0,
    humanReviewRequired: true,
    promotionAllowed: false,
    issues,
    advisories,
    capabilities: {
      facialLocalizationReady,
      handContactLocalizationReady,
      torsoLocalizationReady,
    },
  };
}

export function boxIou(a, b) {
  if (!validBox(a) || !validBox(b)) return 0;
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.width * a.height + b.width * b.height - intersection;
  return union > 0 ? boundedRatio(intersection / union) : 0;
}

function safeIou(a, b) {
  return boxIou(a, b);
}

function validateRegionGeometry(region, issues) {
  if (!['found', 'uncertain', 'not-visible'].includes(region.status)) {
    issues.push(`${region.id} has invalid status ${String(region.status)}.`);
    return;
  }
  if (!unitInterval(region.confidence)) issues.push(`${region.id} confidence must be 0..1.`);
  if (region.status === 'not-visible') return;
  if (!validBox(region.bbox)) issues.push(`${region.id} has an invalid normalized bbox.`);
}

function validateAnchorGeometry(anchor, issues) {
  if (!['found', 'uncertain', 'not-visible'].includes(anchor.status)) {
    issues.push(`${anchor.id} has invalid status ${String(anchor.status)}.`);
    return;
  }
  if (!unitInterval(anchor.confidence)) issues.push(`${anchor.id} confidence must be 0..1.`);
  if (anchor.status === 'not-visible') return;
  if (!validPoint(anchor.point)) issues.push(`${anchor.id} has an invalid normalized point.`);
}

function validateAnchorInsideRegion(anchors, regions, anchorId, regionId, issues) {
  const anchor = anchors.get(anchorId);
  const region = regions.get(regionId);
  if (anchor?.status !== 'found' || region?.status !== 'found') return;
  if (!pointInsideBox(anchor.point, region.bbox, 0.025)) {
    issues.push(`${anchorId} is outside ${regionId}.`);
  }
}

function crownIsPlausiblyAttached(crown, head) {
  const overlapX = Math.max(0, Math.min(crown.x + crown.width, head.x + head.width) - Math.max(crown.x, head.x));
  const horizontalShare = overlapX / Math.max(Math.min(crown.width, head.width), 1e-9);
  const crownBottom = crown.y + crown.height;
  const verticalGap = Math.max(0, head.y - crownBottom);
  return horizontalShare >= 0.3 && verticalGap <= 0.06;
}

function containmentRatio(inner, outer) {
  if (!validBox(inner) || !validBox(outer)) return 0;
  const x1 = Math.max(inner.x, outer.x);
  const y1 = Math.max(inner.y, outer.y);
  const x2 = Math.min(inner.x + inner.width, outer.x + outer.width);
  const y2 = Math.min(inner.y + inner.height, outer.y + outer.height);
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const area = inner.width * inner.height;
  return area > 0 ? boundedRatio(intersection / area) : 0;
}

function foundBox(regions, id) {
  const region = regions.get(id);
  return region?.status === 'found' && validBox(region.bbox) ? region.bbox : null;
}

function validBox(box) {
  return Boolean(
    box &&
      finite(box.x) && finite(box.y) && finite(box.width) && finite(box.height) &&
      box.x >= 0 && box.y >= 0 && box.width > 0 && box.height > 0 &&
      box.x <= 1 && box.y <= 1 && box.x + box.width <= 1.000001 && box.y + box.height <= 1.000001,
  );
}

function validPoint(point) {
  return Boolean(point && unitInterval(point.x) && unitInterval(point.y));
}

function pointInsideBox(point, box, tolerance = 0) {
  if (!validPoint(point) || !validBox(box)) return false;
  return point.x >= box.x - tolerance && point.x <= box.x + box.width + tolerance &&
    point.y >= box.y - tolerance && point.y <= box.y + box.height + tolerance;
}

function averageBox(a, b) {
  if (!validBox(a)) return validBox(b) ? { ...b } : { x: 0, y: 0, width: 0, height: 0 };
  if (!validBox(b)) return { ...a };
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    width: (a.width + b.width) / 2,
    height: (a.height + b.height) / 2,
  };
}

function averagePoint(a, b) {
  if (!validPoint(a)) return validPoint(b) ? { ...b } : { x: 0, y: 0 };
  if (!validPoint(b)) return { ...a };
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function pointDistance(a, b) {
  if (!validPoint(a) || !validPoint(b)) return Number.POSITIVE_INFINITY;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function missingRegion(id, notes, confidence = 0) {
  return {
    id,
    status: 'not-visible',
    confidence,
    bbox: { x: 0, y: 0, width: 0, height: 0 },
    agreement: { iou: 0, stable: false },
    notes,
  };
}

function missingAnchor(id, notes, confidence = 0) {
  return {
    id,
    status: 'not-visible',
    confidence,
    point: { x: 0, y: 0 },
    agreement: { distance: null, stable: false },
    notes,
  };
}

function boundedRatio(value) {
  if (!finite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function unitInterval(value) {
  return finite(value) && value >= 0 && value <= 1;
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}
