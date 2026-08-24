export function promotionPreviewRejectionReason(preview, expectedPreviewType) {
  if (!preview || typeof preview !== 'object') return 'preview manifest is missing';
  if (preview.previewType !== expectedPreviewType) {
    return `unexpected preview type ${preview.previewType ?? 'unknown'}`;
  }
  if (preview.previewPurpose === 'canonical-approved-retrospective-audit') {
    return 'canonical retrospective audit previews cannot be promoted';
  }
  if (preview.humanReview?.required !== true) {
    return 'promotion requires a candidate preview with humanReview.required=true';
  }
  if (preview.approvalPolicy?.humanApprovalRequired !== true) {
    return 'promotion requires approvalPolicy.humanApprovalRequired=true';
  }
  if (preview.approvalPolicy?.priorHumanApprovalPreserved === true) {
    return 'prior-approved retrospective evidence cannot be promoted as a new candidate';
  }
  const candidates = Array.isArray(preview.candidates) ? preview.candidates : [];
  if (!candidates.length) return 'candidate preview contains no candidate records';
  if (candidates.some((candidate) => candidate?.sourceMode === 'canonical-approved')) {
    return 'canonical-approved candidate records cannot be promoted';
  }
  return null;
}

export function selectNewestPromotablePreview(records, expectedPreviewType) {
  for (const record of records) {
    if (promotionPreviewRejectionReason(record.preview, expectedPreviewType)) continue;
    const review = record.review;
    if (
      review?.deterministic?.pass === true &&
      review?.ai?.status &&
      review.ai.status !== 'SKIPPED'
    ) {
      return record.directory;
    }
  }
  return null;
}
