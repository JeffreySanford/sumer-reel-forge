export function containedWaterRefractionSettle(progress) {
  if (progress <= 0.88) return 1;
  return Math.max(0.55, 1 - (progress - 0.88) / 0.12);
}

export function containedWaterTerminalRippleFade(progress) {
  if (progress <= 0.9) return 1;
  if (progress >= 1) return 0;
  return Math.max(0, 1 - (progress - 0.9) / 0.1);
}

export function containedWaterReadableRippleSettle(progress) {
  return (
    containedWaterRefractionSettle(progress) *
    containedWaterTerminalRippleFade(progress)
  );
}

export function buildMaterialMotionStateEvidence(materialQa) {
  const states = [];
  for (const target of materialQa?.targets ?? []) {
    for (const comparison of target.comparisons ?? []) {
      const progress = Number(comparison.progress);
      const state = {
        layerId: target.layerId,
        material: target.material ?? target.role ?? null,
        id: comparison.id ?? null,
        frame: Number(comparison.frame),
        progress: Number.isFinite(progress) ? progress : null,
        meanAbsoluteDifference: Number(comparison.meanAbsoluteDifference ?? 0),
        changedPixelRatio: Number(comparison.changedPixelRatio ?? 0),
        normalPath: comparison.normalPath ?? null,
        frozenPath: comparison.frozenPath ?? null,
        differencePath: comparison.differencePath ?? null,
      };
      if (
        target.material === 'water' &&
        Number.isFinite(progress)
      ) {
        state.water = {
          broadRippleWeight: containedWaterReadableRippleSettle(progress),
          refractionWeight: containedWaterRefractionSettle(progress),
          terminalRippleFade: containedWaterTerminalRippleFade(progress),
        };
      }
      states.push(state);
    }
  }
  return states;
}

export function selectFocusedMaterialEvidence(materialQa) {
  const targets = materialQa?.targets ?? [];
  const target = targets.find((item) => (item.comparisons ?? []).length);
  if (!target) return null;
  const comparisons = [...(target.comparisons ?? [])].sort(
    (a, b) => Number(a.progress ?? 0) - Number(b.progress ?? 0),
  );
  if (!comparisons.length) return null;
  const terminal = comparisons[comparisons.length - 1];
  const middle = comparisons[Math.floor(comparisons.length / 2)];
  return { target, middle, terminal };
}

export function reconcileFindingWithMotionState(finding, motionStates) {
  const text = [finding?.category, finding?.description, finding?.evidence]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const frameMatch = text.match(/\bframe\s+(\d+)\b/);
  if (!frameMatch) return null;
  const frame = Number(frameMatch[1]);
  const state = (motionStates ?? []).find(
    (candidate) =>
      candidate.layerId === finding?.layerId && Number(candidate.frame) === frame,
  );
  if (!state?.water) return null;

  const broadPatternClaim =
    /(ripple|wave)/.test(text) &&
    /(uniform|repeating|circular|broad|concentric|ring)/.test(text);
  if (!broadPatternClaim || state.water.broadRippleWeight > 1e-9) return null;

  return {
    ...finding,
    originalSeverity: finding.severity,
    severity: 'low',
    effectiveCategory: 'perceptual_texture_pattern',
    deterministicReconciliation: {
      status: 'DISPUTED_BY_RUNTIME_MOTION_STATE',
      gate: 'material-motion-runtime-state',
      layerId: finding.layerId,
      frame,
      progress: state.progress,
      broadRippleWeight: state.water.broadRippleWeight,
      refractionWeight: state.water.refractionWeight,
      rule:
        'The broad readable ripple is deterministically zero at this review beat. A circular/repeating-ripple claim cannot remain a literal broad-ripple defect; retain it only as a low perceptual texture advisory because fine refraction or source texture may still look patterned.',
    },
  };
}
