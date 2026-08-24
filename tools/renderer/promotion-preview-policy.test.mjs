import assert from 'node:assert/strict';
import test from 'node:test';
import {
  promotionPreviewRejectionReason,
  selectNewestPromotablePreview,
} from './promotion-preview-policy.mjs';

const previewType = 'shot06-layered-candidate-preview';

function candidatePreview(overrides = {}) {
  return {
    previewType,
    humanReview: { required: true },
    approvalPolicy: { humanApprovalRequired: true },
    candidates: [
      {
        layerId: 'shot06-practical-symbols-v1',
        candidateRunDirectory: 'tmp/animation-assets/candidates/run-1',
      },
    ],
    ...overrides,
  };
}

function reviewed() {
  return {
    deterministic: { pass: true },
    ai: { status: 'PASS_ADVISORY' },
  };
}

test('newer canonical retrospective audit cannot outrank an older genuine candidate preview', () => {
  const selected = selectNewestPromotablePreview(
    [
      {
        directory: 'newer-audit',
        preview: candidatePreview({
          previewPurpose: 'canonical-approved-retrospective-audit',
          humanReview: { required: false, priorApprovalPreserved: true },
          approvalPolicy: {
            humanApprovalRequired: false,
            priorHumanApprovalPreserved: true,
          },
          candidates: [
            {
              layerId: 'shot06-practical-symbols-v1',
              sourceMode: 'canonical-approved',
            },
          ],
        }),
        review: reviewed(),
      },
      {
        directory: 'older-real-candidate',
        preview: candidatePreview(),
        review: reviewed(),
      },
    ],
    previewType,
  );

  assert.equal(selected, 'older-real-candidate');
});

test('explicit canonical retrospective audit preview is rejected', () => {
  const reason = promotionPreviewRejectionReason(
    candidatePreview({
      previewPurpose: 'canonical-approved-retrospective-audit',
      humanReview: { required: false, priorApprovalPreserved: true },
      approvalPolicy: {
        humanApprovalRequired: false,
        priorHumanApprovalPreserved: true,
      },
    }),
    previewType,
  );
  assert.match(reason ?? '', /retrospective audit/);
});

test('canonical-approved candidate records are rejected even without previewPurpose marker', () => {
  const reason = promotionPreviewRejectionReason(
    candidatePreview({
      candidates: [
        {
          layerId: 'shot06-practical-symbols-v1',
          sourceMode: 'canonical-approved',
        },
      ],
    }),
    previewType,
  );
  assert.match(reason ?? '', /canonical-approved candidate records/);
});
