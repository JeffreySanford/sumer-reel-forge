export const RIGGING_REFINED_THRESHOLDS = Object.freeze({
  minStrongAlphaPixels: 150,
  preferredStrongAlphaPixels: 500,
  maxCropCoverage: 0.35,
  preferredMaxCropCoverage: 0.2,
  maxStrongBboxFill: 0.45,
  preferredMaxStrongBboxFill: 0.25,
  maxSignificantComponents: 16,
  preferredMaxSignificantComponents: 8,
  minTopEightComponentShare: 0.8,
  preferredTopEightComponentShare: 0.92,
  maxSourceMismatchRatio: 0.005,
});

export function classifyRiggingBoundaryContact({ roi, cropAnalysis, sourceWidth, sourceHeight }) {
  const bbox = cropAnalysis?.strongBbox ?? null;
  if (!roi || !bbox || !sourceWidth || !sourceHeight) {
    return Object.freeze({
      touchedSides: Object.freeze([]),
      sourceBoundarySides: Object.freeze([]),
      interiorTouchedSides: Object.freeze([]),
    });
  }

  const touchedSides = [];
  if (bbox.x <= 0) touchedSides.push('left');
  if (bbox.y <= 0) touchedSides.push('top');
  if (bbox.x + bbox.width >= cropAnalysis.width) touchedSides.push('right');
  if (bbox.y + bbox.height >= cropAnalysis.height) touchedSides.push('bottom');

  const sourceBoundarySides = [];
  if (roi.x <= 0) sourceBoundarySides.push('left');
  if (roi.y <= 0) sourceBoundarySides.push('top');
  if (roi.x + roi.width >= sourceWidth) sourceBoundarySides.push('right');
  if (roi.y + roi.height >= sourceHeight) sourceBoundarySides.push('bottom');

  const sourceSet = new Set(sourceBoundarySides);
  const interiorTouchedSides = touchedSides.filter((side) => !sourceSet.has(side));

  return Object.freeze({
    touchedSides: Object.freeze(touchedSides),
    sourceBoundarySides: Object.freeze(sourceBoundarySides),
    interiorTouchedSides: Object.freeze(interiorTouchedSides),
  });
}

export function evaluateRiggingRoiCandidateSourceAware(
  { roi, cropAnalysis, sourceFidelity, sourceWidth, sourceHeight },
  thresholds = RIGGING_REFINED_THRESHOLDS,
) {
  const boundary = classifyRiggingBoundaryContact({
    roi,
    cropAnalysis,
    sourceWidth,
    sourceHeight,
  });
  const failures = [];
  const advisories = [];

  if (!cropAnalysis || !Number.isFinite(cropAnalysis.strongAlphaPixels)) {
    failures.push('missing crop alpha analysis');
  } else {
    if (cropAnalysis.strongAlphaPixels < thresholds.minStrongAlphaPixels) {
      failures.push(
        `rigging selection is too sparse: ${cropAnalysis.strongAlphaPixels} strong-alpha pixels`,
      );
    }
    if (boundary.interiorTouchedSides.length) {
      failures.push(
        `rigging selection touches interior ROI edge(s): ${boundary.interiorTouchedSides.join(', ')}`,
      );
    }
    if (cropAnalysis.strongCoverage > thresholds.maxCropCoverage) {
      failures.push(
        `rigging selection covers too much of its ROI: ${(cropAnalysis.strongCoverage * 100).toFixed(2)}%`,
      );
    }
    if (cropAnalysis.strongBboxFill > thresholds.maxStrongBboxFill) {
      failures.push(
        `rigging selection is too blob-like inside its aggregate bbox: ${(cropAnalysis.strongBboxFill * 100).toFixed(2)}% fill`,
      );
    }
    if (cropAnalysis.significantComponentCount > thresholds.maxSignificantComponents) {
      failures.push(
        `rigging selection is too fragmented: ${cropAnalysis.significantComponentCount} significant components`,
      );
    }
    if (cropAnalysis.topEightComponentShare < thresholds.minTopEightComponentShare) {
      failures.push(
        `rigging selection has too much scattered alpha: top-eight components contain ${(cropAnalysis.topEightComponentShare * 100).toFixed(2)}%`,
      );
    }

    if (boundary.touchedSides.length && !boundary.interiorTouchedSides.length) {
      advisories.push(
        `rigging touches source-frame boundary only: ${boundary.touchedSides.join(', ')}`,
      );
    }
    if (cropAnalysis.strongAlphaPixels < thresholds.preferredStrongAlphaPixels) {
      advisories.push('rigging alpha is usable but below the preferred readable-pixel count');
    }
    if (cropAnalysis.strongCoverage > thresholds.preferredMaxCropCoverage) {
      advisories.push('rigging ROI coverage is above the preferred thin-overlay range');
    }
    if (cropAnalysis.strongBboxFill > thresholds.preferredMaxStrongBboxFill) {
      advisories.push('rigging aggregate bbox is denser than preferred for a rope cluster');
    }
    if (cropAnalysis.significantComponentCount > thresholds.preferredMaxSignificantComponents) {
      advisories.push('rigging cluster has more significant components than preferred');
    }
    if (cropAnalysis.topEightComponentShare < thresholds.preferredTopEightComponentShare) {
      advisories.push('rigging alpha has more secondary fragments than preferred');
    }
  }

  if (!sourceFidelity || !Number.isFinite(sourceFidelity.strongMismatchRatio)) {
    failures.push('missing source-fidelity analysis');
  } else if (sourceFidelity.strongMismatchRatio > thresholds.maxSourceMismatchRatio) {
    failures.push(
      `selected rigging pixels do not preserve source RGB: ${(sourceFidelity.strongMismatchRatio * 100).toFixed(3)}% mismatch`,
    );
  }

  const risk = failures.length ? 'HIGH' : advisories.length ? 'MEDIUM' : 'LOW';
  return Object.freeze({
    pass: failures.length === 0,
    risk,
    boundary,
    failures: Object.freeze(failures),
    advisories: Object.freeze(advisories),
  });
}
