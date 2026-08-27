export const RIGGING_ROI_THRESHOLDS = Object.freeze({
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

export function evaluateRiggingRoiCandidate(
  {
    cropAnalysis,
    sourceFidelity,
  },
  thresholds = RIGGING_ROI_THRESHOLDS,
) {
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
    if (cropAnalysis.anyStrongTouchesEdge) {
      failures.push('rigging selection touches the ROI edge and may be clipped');
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
    if (
      cropAnalysis.significantComponentCount > thresholds.maxSignificantComponents
    ) {
      failures.push(
        `rigging selection is too fragmented: ${cropAnalysis.significantComponentCount} significant components`,
      );
    }
    if (cropAnalysis.topEightComponentShare < thresholds.minTopEightComponentShare) {
      failures.push(
        `rigging selection has too much scattered alpha: top-eight components contain ${(cropAnalysis.topEightComponentShare * 100).toFixed(2)}%`,
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
    if (
      cropAnalysis.significantComponentCount >
      thresholds.preferredMaxSignificantComponents
    ) {
      advisories.push('rigging cluster has more significant components than preferred');
    }
    if (
      cropAnalysis.topEightComponentShare <
      thresholds.preferredTopEightComponentShare
    ) {
      advisories.push('rigging alpha has more secondary fragments than preferred');
    }
  }

  if (!sourceFidelity || !Number.isFinite(sourceFidelity.strongMismatchRatio)) {
    failures.push('missing source-fidelity analysis');
  } else if (
    sourceFidelity.strongMismatchRatio > thresholds.maxSourceMismatchRatio
  ) {
    failures.push(
      `selected rigging pixels do not preserve source RGB: ${(sourceFidelity.strongMismatchRatio * 100).toFixed(3)}% mismatch`,
    );
  }

  const risk = failures.length
    ? 'HIGH'
    : advisories.length
      ? 'MEDIUM'
      : 'LOW';

  return Object.freeze({
    pass: failures.length === 0,
    risk,
    failures: Object.freeze(failures),
    advisories: Object.freeze(advisories),
    score: riggingStructuralScore({
      risk,
      cropAnalysis,
      sourceFidelity,
    }),
  });
}

export function riggingStructuralScore({ risk, cropAnalysis, sourceFidelity }) {
  const riskPenalty = { LOW: 0, MEDIUM: 100, HIGH: 500 }[risk] ?? 1000;
  const edgePenalty = cropAnalysis?.anyStrongTouchesEdge ? 250 : 0;
  const fragmentPenalty = Math.max(
    0,
    Number(cropAnalysis?.significantComponentCount ?? 0) - 1,
  ) * 3;
  const scatterPenalty =
    (1 - Number(cropAnalysis?.topEightComponentShare ?? 0)) * 100;
  const densityPenalty = Math.max(
    0,
    Number(cropAnalysis?.strongBboxFill ?? 0) - 0.15,
  ) * 200;
  const sourcePenalty =
    Number(sourceFidelity?.strongMismatchRatio ?? 1) * 1000;
  return (
    riskPenalty +
    edgePenalty +
    fragmentPenalty +
    scatterPenalty +
    densityPenalty +
    sourcePenalty
  );
}
