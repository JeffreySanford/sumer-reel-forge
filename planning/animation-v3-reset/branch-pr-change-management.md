# Branch, Pull Request and Change-Management Plan

Status: **planning contract**

This document defines how V3 work is divided so architecture remains reviewable, GitHub Actions usage remains bounded, and local quality evidence is clear.

## 1. Branch categories

Use semantic branch classes:

```text
plan/*
feat/*
fix/*
spike/*
chore/*
```

Examples:

```text
plan/animation-v3-reset
feat/historical-source-registry-v3
feat/scene-v3-contracts
feat/animation-frame-kernel
spike/rive-enki-rig
spike/pixi-water
fix/scene-v3-hash-windows-linux
```

## 2. Planning branches

Planning branches may contain documentation, diagrams and decision records only.

Rules:

- no hidden production code;
- docs-only commits should be coherent batches;
- planning may be merged without animation proof;
- lint/docs checks only as repository policy requires.

## 3. Foundation feature branches

Foundation code should be capability-sized, not phase-sized mega-branches.

Good:

```text
Scene V3 contracts
FrameContext + deterministic seed
runtime registry + fake adapter
scene compiler
fixture library + V2 adapter
```

Bad:

```text
"implement all of V3"
```

## 4. Spike branches

A runtime dependency enters through a bounded spike first.

Spike must answer written adoption questions:

- can runtime obey exact-frame authority?
- can it preserve source identity?
- does it work in Storybook/browser?
- does it render through Remotion?
- what are license/version requirements?
- what is iteration/render cost?
- what failure/debug evidence exists?

A spike is not automatically production architecture.

## 5. Spike outcomes

```text
KEEP
KEEP_WITH_CONSTRAINTS
DEFER
REJECT
```

Outcome becomes ADR/package-adoption update.

If rejected, remove dependency from critical path rather than leaving unused foundational coupling.

## 6. Commit strategy

Prefer coherent commits that each express one reasoned change.

Avoid:

- dozens of 1-line push commits that trigger repeated CI;
- mixing architecture docs, dependency upgrade and visual asset promotion in one commit;
- committing generated temp artifacts;
- "fix tests" commits that only lower acceptance criteria.

During local work, temporary local commits are fine; before review, history should still tell a comprehensible story.

## 7. Push strategy

Because GitHub Actions quota is finite:

```text
implement locally
  ↓
run focused gate
  ↓
run affected pre-push gate
  ↓
review diff
  ↓
push coherent batch
```

Do not push every speculative edit solely to ask Actions whether it compiles.

## 8. PR template contract

Every V3 code PR should answer:

```text
## Capability
What new reusable capability exists?

## Manuscript / benchmark need
Which Chapter 1–3 requirement justifies it?

## Architectural ownership
Which runtime/library owns it and what does it explicitly not own?

## Provenance impact
Any source/evidence/schema changes?

## Local verification
Exact commands run + summarized results.

## Storybook
Stories added/changed.

## E2E
Scenarios added/changed.

## Rendered proof
Required? If yes, receipt/path/verdict.

## Negative regressions
Which failure cases are now locked?

## CI expectation
Which GitHub jobs must re-check this?

## Rollback
How do we revert/disable this capability?
```

## 9. Local evidence section

Do not write simply `tests pass`.

Preferred:

```text
Local:
- nx test animation-frame — 42/42
- nx lint animation-frame — PASS
- nx build animation-frame — PASS
- scene compiler integration — 18/18
```

For visual work:

```text
- Storybook exact-frame suite — PASS
- blink motion proof receipt — ...
- human A/B — APPROVED
```

## 10. PR size guideline

A PR should generally establish one reusable capability and its complete test surface.

A feature is not "small" merely because code is 100 lines if it introduces a new runtime dependency.

Runtime dependency PR must include:

- license/security/version notes;
- adapter boundary;
- tests;
- Storybook proof;
- benchmark evidence;
- rollback.

## 11. Test completeness rule

Do not split a capability so that production code merges before its required tests unless explicitly using a disabled scaffold.

Preferred:

```text
implementation + unit + lint/build + Storybook + applicable E2E
```

in same PR.

Rendered proof may be milestone-gated where expensive, but capability cannot be called production-ready until it exists.

## 12. Red tests

Intentionally red milestone concepts should not appear as failing required CI tests.

Encode expected rejection as passing negative tests:

```text
invalid cyan blink is rejected => test PASS
```

If a future capability gate is not yet implemented, mark it as planned/skip with explicit reason rather than making every branch permanently red.

## 13. Branch protection target

Once CI quota/settings allow, required checks should represent deterministic merge gates, conceptually:

```text
quality-core
storybook
browser-e2e
receipt-verify
```

Do not require GPU-heavy local-only proof workflow as automatic branch check unless infrastructure changes.

## 14. Review ordering

Review a PR in this order:

1. contract/architecture fit;
2. source/provenance implications;
3. test quality and negative fixtures;
4. implementation;
5. Storybook/E2E coverage;
6. performance/diagnostics;
7. rendered proof/human result if applicable.

This discourages approving clever code that violates ownership boundaries.

## 15. Dependency upgrade PRs

Keep runtime dependency upgrades separate from unrelated feature work where practical.

Upgrade PR must replay applicable benchmark suite before adoption.

Examples:

```text
Remotion upgrade -> render benchmark replay
Rive runtime upgrade -> hero performance replay
Pixi upgrade -> water/rigging replay
Three upgrade -> spatial camera replay
Rapier upgrade -> bake determinism replay
```

## 16. Schema migration PRs

Scene V3 schema changes require:

- migration function;
- old-version fixture;
- new-version fixture;
- round-trip/canonical hash tests;
- staleness behavior;
- rollback notes.

No in-place silent schema reinterpretation.

## 17. Asset promotion PR/commit policy

Canonical asset promotion should be isolated enough to identify exact change.

Promotion commit includes:

- promoted bytes;
- manifest/registry update;
- durable receipt where policy chooses to track it;
- no unrelated refactor.

This makes rollback and provenance clear.

## 18. Documentation synchronization

When implementation changes an accepted planning contract:

- update ADR or create superseding ADR;
- update relevant planning doc in same PR or immediately linked PR;
- avoid code becoming new undocumented truth.

## 19. GitHub Actions failure triage

Classify before editing code:

```text
RUNNER_NOT_STARTED
INSTALL_FAILURE
LINT_FAILURE
UNIT_FAILURE
BUILD_FAILURE
STORYBOOK_FAILURE
E2E_FAILURE
RECEIPT_FAILURE
INFRA_FAILURE
```

Do not alter tests because an Actions runner/quota failure produced a red UI.

## 20. CI rerun discipline

If failure is deterministic code/test failure:

- reproduce locally first;
- fix locally;
- rerun local affected gate;
- push coherent fix once.

Do not spam Actions reruns while local failure is still known.

## 21. Documentation-only change

A documentation-only PR should declare that no executable behavior changed.

Required review:

- links/consistency;
- architecture contradictions;
- terminology/version alignment.

No claim that renderer tests were needed when no renderer changed.

## 22. Release branch/tag future

Do not add a release-branch model yet.

When reels begin publication, evaluate tags/releases around reproducible scene/asset/proof receipts.

Potential future tag:

```text
reel/ch01-r01/v1.0.0
```

But this remains deferred until V3 migration produces stable release artifacts.

## 23. PR exit gate

A V3 PR is merge-ready only when:

- scope matches declared capability;
- local required gates documented green;
- negative regressions included;
- Storybook/E2E obligations satisfied;
- GitHub required deterministic checks green;
- visual/human gates satisfied if claiming production-ready motion;
- architecture/provenance docs updated when necessary;
- rollback path understood.
