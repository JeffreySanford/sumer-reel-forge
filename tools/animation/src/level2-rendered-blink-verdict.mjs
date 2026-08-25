export function evaluateRenderedBlinkVerdict({
  frameAnalyses,
  semanticReview,
  minConfidence = 0.7,
}) {
  const failures = [];
  const activeFrames = (frameAnalyses ?? []).filter((item) => item.activeBlink === true);
  const leakingFrames = activeFrames.filter((item) => item.appearance?.pass !== true);

  if (!activeFrames.length) failures.push('rendered blink proof has no active blink frames');
  if (leakingFrames.length) {
    failures.push(
      `rendered blink contains ${leakingFrames.length} active frame(s) with cyan/flat mask leakage`,
    );
  }
  if (semanticReview?.naturalBlinkVisible !== true) {
    failures.push('rendered sequence does not visibly contain a natural blink');
  }
  if (!Array.isArray(semanticReview?.closedFrameIndexes) || semanticReview.closedFrameIndexes.length < 1) {
    failures.push('rendered sequence has no semantically confirmed closed-eye frame');
  }
  if (semanticReview?.cyanPatchVisible === true) {
    failures.push('rendered sequence visibly contains a cyan/debug eye patch');
  }
  if (semanticReview?.flatMaskLeakVisible === true) {
    failures.push('rendered sequence visibly contains a flat mask/proof overlay');
  }
  if (semanticReview?.bothEyesCloseTogether !== true) {
    failures.push('rendered sequence does not show both eyes closing together');
  }
  if (semanticReview?.returnsOpen !== true) {
    failures.push('rendered sequence does not cleanly return to the open-eye source state');
  }
  const confidence = Number(semanticReview?.confidence ?? 0);
  if (!Number.isFinite(confidence) || confidence < minConfidence) {
    failures.push(
      `rendered blink semantic confidence ${Number.isFinite(confidence) ? confidence.toFixed(2) : 'invalid'} is below ${minConfidence.toFixed(2)}`,
    );
  }

  return {
    pass: failures.length === 0,
    failures,
    metrics: {
      activeFrameCount: activeFrames.length,
      leakingFrameCount: leakingFrames.length,
      closedFrameCount: Array.isArray(semanticReview?.closedFrameIndexes)
        ? semanticReview.closedFrameIndexes.length
        : 0,
      confidence: Number.isFinite(confidence) ? confidence : 0,
    },
  };
}
