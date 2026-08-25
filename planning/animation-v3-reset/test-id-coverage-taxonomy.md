# Test ID, Coverage and Evidence Taxonomy

Status: **planning contract**

V3 will have many test layers. Stable IDs make failures searchable across local output, Storybook, Playwright, receipts and GitHub Actions without reducing quality to a single coverage percentage.

## 1. Test families

```text
UNIT
CONTRACT
LINT
BUILD
STORY
A11Y
VISUAL
MOTION
SEMANTIC
E2E
PERF
FAILURE
HUMAN
RECEIPT
MIGRATION
```

## 2. ID grammar

Preferred:

```text
<FAMILY>-<DOMAIN>-<NNN>[-<short-name>]
```

Examples:

```text
UNIT-FRAME-001-frame-to-time
CONTRACT-SCENE-004-duplicate-id
STORY-RIVE-003-enki-closed
VISUAL-ENKI-002-blink-closed
MOTION-ENKI-001-natural-blink
E2E-STUDIO-004-candidate-review
FAILURE-ASSET-002-debug-leak
PERF-CROWD-001-100-agent
```

IDs remain stable even if file names move.

## 3. Domain vocabulary

Initial domains:

```text
SOURCE
EVIDENCE
FRAME
SEED
SCENE
RUNTIME
ASSET
RIVE
PIXI
THREE
RAPIER
SPINE
CROWD
CITY
MONTAGE
AUDIO
CAPTION
STUDIO
PROMOTION
RENDER
TRACE
ACCESSIBILITY
V2COMPAT
```

## 4. Unit vs contract

`UNIT` tests pure behavior of one function/module.

`CONTRACT` verifies invariants across public data/interface semantics even if still one library.

Example:

```text
UNIT-FRAME-001   createFrameContext computes time
CONTRACT-FRAME-001 persisted time coordinate is integer frame
```

## 5. Story IDs

Storybook story IDs/metadata should reference test/fixture identity rather than duplicate it.

Example metadata:

```text
fixture: benchmark:enki-facial:v1
proofState: CLOSED
coverageIds:
  STORY-RIVE-003
  VISUAL-ENKI-002
```

## 6. Visual test IDs

One visual test equals one meaningful proof-state comparison, not every frame.

Examples:

```text
VISUAL-ENKI-001-neutral
VISUAL-ENKI-002-blink-closed
VISUAL-HELM-003-rigging-lag-peak
VISUAL-CITY-005-mature-eridu
```

Golden metadata includes test ID, fixture version, proof state and environment.

## 7. Motion test IDs

Motion proof verifies temporal behavior:

```text
MOTION-ENKI-001-natural-blink
MOTION-HELM-002-helm-adjust
MOTION-RIGGING-001-vessel-lag
MOTION-KUTU-001-hail-impact
MOTION-CROWD-001-work-variation
```

Each references frame window and controls.

## 8. Semantic QA IDs

```text
SEMANTIC-ENKI-001-blink-readable
SEMANTIC-ENKI-002-identity-stable
SEMANTIC-CROWD-001-no-cloned-motion
SEMANTIC-CITY-001-same-place-growth
```

Receipt also records semantic prompt contract/model version.

## 9. Negative/failure IDs

Failures are first-class:

```text
FAILURE-ENKI-001-open-at-closed-frame
FAILURE-ENKI-002-cyan-eye-debug-leak
FAILURE-CROWD-001-perfect-sync
FAILURE-RAPIER-001-variable-timestep
FAILURE-ASSET-001-hash-mismatch
FAILURE-PROMOTION-001-stale-approval
FAILURE-RENDER-001-zero-byte-output
```

Escaped failure should get durable ID when promoted to regression fixture.

## 10. E2E IDs

E2E names describe workflows:

```text
E2E-PROV-001-inspect-source
E2E-STUDIO-001-scene-inspection
E2E-STUDIO-002-exact-frame-proof
E2E-STUDIO-003-stale-authoring
E2E-STUDIO-004-candidate-review
E2E-PROMO-001-happy-path
E2E-PROMO-002-stale-candidate
E2E-TRACE-001-scene-to-source
```

Do not use E2E to duplicate interpolation math.

## 11. Accessibility IDs

```text
A11Y-STUDIO-001-frame-control-keyboard
A11Y-STUDIO-002-promotion-dialog-focus
A11Y-PREVIEW-001-reduced-motion-no-autoplay
A11Y-CAPTION-001-safe-readable-caption
```

Manual AT milestones can use:

```text
HUMAN-A11Y-001-NVDA-core-review
```

## 12. Performance IDs

```text
PERF-RIVE-001-hero-preview
PERF-PIXI-001-water-proof
PERF-THREE-001-depth-card-scene
PERF-CROWD-001-100-agent
PERF-CITY-001-eridu-proof
```

Receipt stores machine profile and runtime versions.

## 13. Human review IDs

Human review criteria sets are versioned:

```text
HUMAN-ENKI-001-facial-performance
HUMAN-HELM-001-combined-v3
HUMAN-CITY-001-growth-identity
```

Human test result is evidence receipt, not automated test process.

## 14. Migration IDs

```text
MIGRATION-V2-001-shot03-duration
MIGRATION-V2-002-shot03-asset-hashes
MIGRATION-V2-003-shot03-layer-order
MIGRATION-SCENE-001-v3-schema-roundtrip
```

## 15. Receipt validation IDs

```text
RECEIPT-RENDER-001-required-fields
RECEIPT-QA-001-input-hash-binding
RECEIPT-HUMAN-001-candidate-hash
RECEIPT-PROMO-001-cross-link-current
```

## 16. Coverage matrix

Capabilities declare required families rather than one percentage:

| Capability | Unit | Contract | Story | Visual | Motion | Semantic | E2E | Failure | Perf | Human |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Frame kernel | ✓ | ✓ | — | — | — | — | — | ✓ | — | — |
| Hero face | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Pixi material | ✓ | ✓ | ✓ | ✓ | ✓ | maybe | ✓ | ✓ | ✓ | ✓ |
| Spatial world | ✓ | ✓ | ✓ | ✓ | ✓ | maybe | ✓ | ✓ | ✓ | ✓ |
| Physics | ✓ | ✓ | ✓ | ✓ | ✓ | maybe | ✓ | ✓ | ✓ | ✓ |
| Crowd | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Provenance UI | ✓ | ✓ | ✓ | visual UI | — | — | ✓ | ✓ | — | manual a11y |

## 17. Trace to benchmark

Test results should be queryable by benchmark fixture.

Example:

```text
benchmark:enki-facial:v1
  UNIT-RIVE-...
  STORY-RIVE-...
  VISUAL-ENKI-...
  MOTION-ENKI-...
  SEMANTIC-ENKI-...
  E2E-ANIM-...
  FAILURE-ENKI-...
  PERF-RIVE-...
  HUMAN-ENKI-...
```

## 18. Test metadata

Future metadata shape:

```ts
interface TestEvidenceRef {
  testId: string;
  fixtureId?: string;
  proofStateId?: string;
  environmentClass: 'CORE' | 'BROWSER' | 'RENDER' | 'AI_OPTIONAL';
  blocking: boolean;
}
```

## 19. Local output

Aggregate commands should summarize stable IDs for failures:

```text
PASS 42
FAIL 1
FAILURE-ENKI-002 cyan eye debug leak
```

This is more useful than only a file/line number in cross-tool diagnostics.

## 20. GitHub Actions

Actions can annotate failed stable test IDs. Local and CI refer to the same ID when the deterministic test is repeated.

Heavy local render/human receipts still include related test IDs for completeness.

## 21. Skips

A skipped blocking test must state reason/status:

```text
N/A
OPTIONAL_SERVICE_UNAVAILABLE
MILESTONE_ONLY
NOT_IMPLEMENTED_BLOCKING
```

`NOT_IMPLEMENTED_BLOCKING` prevents phase completion.

Do not let silent skips count as green.

## 22. Flake policy

Repeated flaky deterministic test is a defect.

Allowed temporary status:

```text
QUARANTINED
```

Requires:

- issue/reason;
- non-blocking decision explicit;
- deadline/phase gate impact;
- no hiding a known visual correctness failure.

## 23. Test deletion

When deleting/replacing a test ID:

- state why;
- migrate benchmark coverage reference;
- retain escaped-failure regression unless obsolete for documented architectural reason;
- never delete solely because current implementation cannot pass the requirement.

## 24. Test catalog generation

Future script can scan fixture/test metadata and emit:

```text
all known test IDs
duplicates
missing benchmark requirements
unimplemented required IDs
orphan tests
quarantined tests
```

Potential command:

```text
pnpm test:catalog:v3
```

## 25. Definition of coverage success

The taxonomy is successful when a benchmark dashboard can show exactly which unit, Storybook, visual, motion, E2E, negative, performance and human evidence supports a capability—and a missing layer is visible instead of being hidden behind a green generic `pnpm test`.
