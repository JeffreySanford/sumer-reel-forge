# Review, Approval and Promotion Workflow

Status: **planning contract**

This document defines the human/machine review state machine for assets, rigs, scenes, simulations and rendered animation. It generalizes the explicit-promotion discipline already used in Reel 1 and makes it reusable for V3.

## 1. Core principle

No subsystem may promote its own output merely because its internal tests pass.

Promotion requires evidence from outside the producing subsystem and explicit human approval for visual production output.

## 2. Universal state machine

```text
DRAFT
  ↓
CANDIDATE
  ↓
AUTOMATED_QA
  ├─→ QA_BLOCKED
  └─→ QA_PASSED
          ↓
     HUMAN_REVIEW
       ├─→ REJECTED
       ├─→ REVISION_REQUESTED
       └─→ APPROVED
                ↓
             PROMOTED
                ↓
            SUPERSEDED
```

State transitions are explicit events with receipts.

## 3. Candidate creation

Candidate receipt records:

```text
candidate ID
creator/tool
commit
source hashes
scene/asset revision
runtime/model version
parameters/seed
output hash
created timestamp for audit only
```

Timestamp is not animation state.

## 4. Automated QA

QA is composed from independent gates appropriate to the asset.

Possible gates:

- structural/schema;
- checksum/source binding;
- bounds/containment;
- identity/fidelity;
- frame determinism;
- runtime capability;
- rendered artifact leakage;
- motion existence;
- semantic action;
- accessibility/motion safety;
- historical/source validation;
- performance budget.

QA produces a machine-readable result with individual gate verdicts.

## 5. QA blocked

`QA_BLOCKED` is informative, not a dead end.

Required fields:

```text
blocking gate IDs
metrics
failure reasons
proof artifact paths/IDs
suggested diagnostic category
```

The system should distinguish:

```text
SOURCE_FAILURE
RUNTIME_FAILURE
RENDER_FAILURE
SEMANTIC_FAILURE
PERFORMANCE_FAILURE
PROVENANCE_FAILURE
```

## 6. Human review package

A human reviewer should not hunt through `tmp` manually.

Review package concept:

```text
summary.json
source-reference.png
candidate-reference.png
proof-contact-sheet.png
normal-speed-preview.mp4
qa-report.json
provenance-summary.json
runtime-trace.json
```

Not every asset needs every artifact.

## 7. Review questions by asset class

### hero character motion

- still looks like canonical character;
- action unmistakably reads correctly;
- motion natural at normal speed;
- no local patch/artifact;
- clean return/settling where expected;
- no distracting source drift.

### material motion

- material reads naturally;
- bounded deformation;
- independent timing visible;
- no repeated mechanical loop unless intended;
- no safe-zone/face intrusion.

### spatial scene

- camera move improves composition;
- no invented hidden geometry exposed unexpectedly;
- occlusion/depth believable;
- painterly visual language retained.

### crowd/herd

- no synchronized clones;
- density believable;
- role/path variation readable;
- hero action remains legible.

### historical reconstruction

- visual choice is consistent with declared evidence class;
- speculation is not visually presented as documentary certainty when avoidable;
- intentional anachronism is known and deliberate.

## 8. Human review outcomes

### APPROVED

Visual/semantic result accepted for promotion.

### REJECTED

Candidate should not be promoted and is not expected to be revised in place.

### REVISION_REQUESTED

Candidate concept is viable but requires a new revision/candidate.

Never mutate the reviewed candidate bytes after review. A revision is a new candidate hash.

## 9. Approval receipt

```ts
interface HumanReviewReceipt {
  reviewVersion: number;
  candidateId: string;
  candidateHash: string;
  sceneId?: string;
  resolvedSceneHash?: string;
  reviewerDecision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';
  criteria: Record<string, 'PASS' | 'FAIL' | 'N/A'>;
  notes?: string[];
  reviewedProofHashes: string[];
}
```

Reviewer identity implementation can remain local/project-specific; the important contract is binding decision to exact bytes/proofs.

## 10. Promotion preconditions

Promotion command must verify:

- candidate lifecycle state is QA_PASSED;
- human approval exists where required;
- approval candidate hash matches current candidate;
- source hashes still current;
- Scene V3 revision still current;
- resolved scene hash still current where scene-bound;
- runtime versions have not changed since proof unless policy allows;
- staged asset bytes equal candidate bytes;
- target canonical location/revision is explicit;
- editorial source is not writable target.

## 11. Explicit confirmation

Consequential promotion requires a deliberate confirmation token or UI action.

Examples:

```text
APPROVE_ENKI_RIG_V1
PROMOTE_SCENE_CH01_R01_S03_V3
```

No hidden default `--yes` in production scripts.

## 12. Promotion transaction

Conceptual transaction:

```text
preflight
  ↓
lock/verify target revision
  ↓
copy exact candidate bytes
  ↓
verify destination hash
  ↓
write/update manifest/registry record
  ↓
write promotion receipt
  ↓
post-verify canonical resolution
```

If any step fails, target should remain old canonical state or be clearly recoverable.

## 13. Promotion receipt

Required fields:

```text
promotion ID
candidate ID/hash
source hashes
old canonical revision/hash if replacing
new canonical revision/hash
scene revision/hash if applicable
runtime versions
QA receipt ID/hash
human approval receipt ID/hash
commit
supersedes relationship
```

## 14. Superseding an approved asset

Use explicit replacement flow:

```text
old canonical remains immutable history
new candidate generated
new QA
new human review
new promotion
new canonical says supersedes old revision
```

Do not silently overwrite the old file and update checksum.

## 15. Scene promotion

A Scene V3 promotion should bind more than JSON:

- authoring scene revision;
- resolved scene hash;
- source registry revision;
- asset revisions/hashes;
- runtime versions;
- physics bake hashes;
- proof receipt;
- human review receipt.

This makes a scene reproducible as a release artifact.

## 16. Proof invalidation/staleness

Approval becomes stale when an input affecting reviewed output changes.

Hard stale examples:

- candidate bytes changed;
- scene revision changed;
- asset revision changed;
- physics bake changed;
- runtime version changed in a visually relevant path;
- source asset changed.

Potential soft stale/review examples:

- provenance text metadata changed without visual effect;
- non-rendering Studio UI changed.

Staleness must be reasoned, not global.

## 17. Storybook review stories

Required generic workflow stories:

```text
Review/Candidate/QAInProgress
Review/Candidate/QABlocked
Review/Candidate/QAPassed
Review/Human/Ready
Review/Human/Approved
Review/Human/Rejected
Review/Promotion/Preflight
Review/Promotion/StaleApproval
Review/Promotion/Success
Review/Promotion/FailureRollback
```

## 18. Storybook interaction tests

- inspect QA details;
- keyboard navigate evidence;
- approve/reject button semantics;
- confirmation dialog focus trap/return;
- stale approval disables promotion;
- success status announced.

## 19. E2E promotion scenarios

### E2E-PROMO-001 happy path

1. load QA-passed fixture;
2. inspect proof;
3. approve;
4. promote;
5. reload;
6. verify canonical revision/hash.

### E2E-PROMO-002 stale candidate

1. approve candidate A;
2. change fixture to candidate B hash;
3. attempt promotion;
4. promotion blocked.

### E2E-PROMO-003 debug leak

Attempt to promote a `DEBUG_ARTIFACT`; must block before write.

### E2E-PROMO-004 interrupted promotion

Inject write failure after preflight; verify old canonical remains intact and recovery state is explicit.

### E2E-PROMO-005 keyboard-only

Complete review/approval workflow without pointer for core controls.

## 20. Unit tests

- legal/illegal state transitions;
- approval binds exact candidate hash;
- stale input invalidates approval;
- candidate cannot self-promote;
- debug/proof artifact cannot become canonical;
- promotion receipt complete;
- supersedes chain valid;
- promotion transaction rollback model.

## 21. Local-first gate

Any change to promotion logic requires locally:

```text
unit
lint
build
Storybook workflow stories/tests
promotion E2E
failure-injection promotion E2E
```

GitHub Actions independently re-runs deterministic portions.

Human visual approval is not recreated by CI; CI verifies receipt integrity.

## 22. Rendered animation promotion

For visual motion specifically, promotion requires:

```text
source/candidate QA
  + staged/resolved asset binding
  + rendered motion proof
  + semantic proof if applicable
  + normal-speed human review
```

Internal runtime state alone is insufficient.

## 23. Publication distinction

`PROMOTED` means approved canonical production input. It does not automatically mean published externally.

Future publication/release state can be separate:

```text
CANONICAL
REEL_ASSEMBLED
RELEASE_CANDIDATE
PUBLISHED
```

This keeps animation approval separate from distribution.

## 24. Exit criterion

The generic workflow is production-ready when positive and negative fixtures prove that exact-byte approved candidates can be promoted transactionally while stale, debug, unapproved and mismatched candidates cannot alter canonical production state.
