export function materialPromotionRejectionReason({ shotNumber, material, review }) {
  if (!material || typeof material !== 'object') {
    return 'material-local QA report is missing';
  }
  if (Number(material.sourceShotNumber) !== Number(shotNumber)) {
    return `material-local QA is for Shot ${material.sourceShotNumber ?? 'unknown'}, not Shot ${shotNumber}`;
  }
  if (material.verificationType !== 'same-camera-frozen-layer-material-motion') {
    return `unexpected material-local verification type ${material.verificationType ?? 'unknown'}`;
  }

  const reviewedGate = review?.deterministic?.materialLocalMotion;
  if (reviewedGate?.pass !== true) {
    return 'reviewed calibrated material-local gate is not passing';
  }
  if (reviewedGate.calibratedGate?.pass !== true) {
    return 'recorded material calibration gate is not passing';
  }

  // The raw differential uses provisional thresholds. For a new, uncalibrated
  // material/preset it is evidence for human review, not a production gate.
  // If the raw verifier was explicitly enforced, however, a failure remains blocking.
  if (material.enforced === true && material.pass !== true) {
    return 'enforced material-local differential QA has not passed';
  }

  return null;
}
