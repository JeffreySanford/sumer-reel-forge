export const CLOSED_EYE_SEMANTIC_MIN_CONFIDENCE = 0.65;

export function evaluateClosedEyeSemantic(
  review,
  { minConfidence = CLOSED_EYE_SEMANTIC_MIN_CONFIDENCE } = {},
) {
  const failures = [];
  const confidence = Number(review?.confidence ?? 0);

  if (review?.state !== 'closed') {
    failures.push(`semantic eye state is ${review?.state ?? 'missing'}, not closed`);
  }
  if (review?.bothEyesClosed !== true) {
    failures.push('semantic review does not confirm both eyes closed');
  }
  if (review?.irisOrPupilVisible !== false) {
    failures.push('semantic review still sees iris or pupil detail');
  }
  if (review?.scleraVisible !== false) {
    failures.push('semantic review still sees visible sclera/eye opening');
  }
  if (!Number.isFinite(confidence) || confidence < minConfidence) {
    failures.push(
      `semantic confidence ${Number.isFinite(confidence) ? confidence.toFixed(2) : 'invalid'} is below ${minConfidence.toFixed(2)}`,
    );
  }

  return {
    pass: failures.length === 0,
    failures,
    confidence: Number.isFinite(confidence) ? confidence : 0,
    state: review?.state ?? 'missing',
    bothEyesClosed: review?.bothEyesClosed === true,
    irisOrPupilVisible: review?.irisOrPupilVisible !== false,
    scleraVisible: review?.scleraVisible !== false,
    identityStable: review?.identityStable === true,
    patchSeamVisible: review?.patchSeamVisible === true,
    summary: String(review?.summary ?? ''),
  };
}
