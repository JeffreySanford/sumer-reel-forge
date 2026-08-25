# V3 Local-First Quality Gates and GitHub Actions Contract

Status: **planning contract**

This document defines how code is verified before push, before merge, and again in GitHub Actions. The guiding rule is simple:

> **Local execution finds problems; GitHub Actions independently confirms the same deterministic quality contract.**

GitHub Actions is not the first place ordinary lint, unit, Storybook, E2E or build failures should be discovered.

## 1. Existing CI baseline

The current repository CI is one `ubuntu-latest` job with a 30-minute timeout. It performs:

- checkout;
- pnpm/node/uv setup;
- dependency install;
- workspace consistency;
- Prisma generation;
- production dependency audit;
- database preparation;
- lint;
- unit/creative tests;
- production build;
- API E2E;
- Storybook build;
- Playwright browser installation;
- Chromium + Firefox browser E2E;
- Playwright failure artifact upload.

That is a useful baseline, but V3 needs explicit local parity, affected-subsystem gates, animation-specific receipt validation and quota-aware boundaries.

## 2. Quality status vocabulary

Every implementation slice may carry these states:

```text
UNTESTED
LOCAL_FOCUSED_GREEN
LOCAL_PHASE_GREEN
CI_GREEN
RENDER_PROOF_GREEN
HUMAN_APPROVED
```

Rules:

- `CI_GREEN` never implies `RENDER_PROOF_GREEN`;
- `RENDER_PROOF_GREEN` never implies `HUMAN_APPROVED`;
- a phase exit requires all statuses applicable to that phase;
- skipped tests must be explained, not silently counted as green.

## 3. Local test tiers

### L0 — edit-loop gate

Goal: feedback in seconds.

Run after meaningful edits to a subsystem.

Includes only affected fast checks:

- targeted unit tests;
- targeted contract tests;
- targeted lint when practical;
- type-check/build of the touched library when contracts changed.

Examples:

```bash
pnpm nx test historical-sources
pnpm nx build historical-sources

pnpm nx test animation-frame
pnpm nx test animation-contracts
```

Animation-specific pure logic may use focused `node --test` or Vitest targets.

### L1 — subsystem gate

Goal: prove one library/runtime slice is coherent.

Required:

- lint for affected project;
- unit tests;
- build/types;
- Storybook stories/tests if the subsystem renders UI/animation;
- negative fixtures for new acceptance gates.

No push until L1 is green.

### L2 — integration gate

Goal: prove connected runtimes/interfaces.

Examples:

- Scene V3 + FrameContext;
- Rive adapter + Remotion composition;
- Pixi material + spatial adapter;
- provenance library + Studio panel.

Required:

- relevant unit suites;
- Storybook interaction/browser tests;
- fixed-frame visual proof where applicable;
- focused Playwright E2E for affected workflow;
- lint/build.

### L3 — pre-push branch gate

Goal: ensure the branch is worth asking CI to confirm.

For code changes, required categories are:

```text
workspace consistency
security/dependency checks when dependency graph changed
lint
unit tests
build/type check
Storybook build/tests when affected
E2E when affected
```

For V3 UI/animation infrastructure, Storybook and E2E count as affected by default unless the change is provably pure data/math.

### L4 — phase/milestone local gate

Goal: full local confidence before merge/promotion.

Required deterministic categories:

- workspace consistency;
- lint;
- all unit tests relevant to the phase;
- production builds;
- Storybook build;
- Storybook browser tests;
- API E2E if API touched;
- browser E2E;
- source/provenance validation;
- animation render-proof contracts.

Plus when applicable:

- actual local rendered motion proof;
- Qwen semantic proof;
- normal-speed human review.

## 4. Planned canonical local commands

The implementation phase should create stable umbrella scripts rather than expecting developers to memorize Nx internals.

Planned commands:

```bash
pnpm v3:check:focused
pnpm v3:check:subsystem
pnpm v3:check:local
pnpm v3:check:milestone
```

And explicit categories:

```bash
pnpm v3:lint
pnpm v3:test:unit
pnpm v3:test:storybook
pnpm v3:test:visual
pnpm v3:test:e2e
pnpm v3:test:source
pnpm v3:test:render-contracts
pnpm v3:build
```

These scripts should compose existing Nx targets rather than bypassing Nx caching/affected analysis.

## 5. Local-first rule by change type

| Change type | Unit | Lint | Build | Storybook | E2E | Render proof | Human |
|---|---:|---:|---:|---:|---:|---:|---:|
| Markdown planning only | — | — | — | — | — | — | — |
| Historical-source data | ✓ | ✓ | ✓ | if UI affected | source workflow if affected | — | — |
| Scene V3 schema | ✓ | ✓ | ✓ | fixture stories | compatibility E2E | contract only | — |
| Frame/RNG math | ✓ | ✓ | ✓ | proof story | — | deterministic fixture | — |
| Studio provenance UI | ✓ | ✓ | ✓ | ✓ | ✓ | — | visual sanity |
| Animation Lab shell | ✓ | ✓ | ✓ | ✓ | ✓ | smoke render | visual sanity |
| Rive actor runtime | ✓ | ✓ | ✓ | ✓ | workflow ✓ | ✓ | ✓ |
| Pixi material runtime | ✓ | ✓ | ✓ | ✓ | workflow ✓ | ✓ | ✓ |
| Three/R3F runtime | ✓ | ✓ | ✓ | ✓ | workflow ✓ | ✓ | ✓ |
| Rapier simulation | ✓ | ✓ | ✓ | ✓ | workflow ✓ | ✓ | ✓ |
| Crowd/CityKit | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Generative adapter | contract ✓ | ✓ | ✓ | review story | ✓ | ✓ | ✓ |

## 6. GitHub Actions principle

GitHub must independently repeat the deterministic categories that matter for merge confidence.

For merge-worthy V3 code this means:

```text
workspace check
lint
unit
build
Storybook build/test
E2E
source/provenance validation
render-receipt/contract validation
```

GitHub does **not** automatically repeat:

- multi-minute GPU-heavy Remotion benchmark renders;
- ComfyUI generation;
- local Ollama/Qwen review requiring local model state;
- human visual approval.

Those produce evidence/receipts that CI can validate structurally.

## 7. Proposed CI shape

Because GitHub Actions minutes are constrained, optimize setup rather than multiplying tiny jobs unnecessarily.

### `quality-core`

Single Linux job, shared dependency install.

Runs:

1. workspace consistency;
2. dependency/security checks;
3. generated-client preparation;
4. lint;
5. unit tests;
6. build;
7. historical-source validation;
8. Storybook build;
9. render-receipt/contract tests.

### `browser-e2e`

Runs after core succeeds.

Runs:

- API E2E if required by current repository architecture;
- Chromium browser E2E;
- Firefox browser E2E for merge/master confidence;
- upload traces/screenshots/video only on failure.

If quota pressure becomes severe, browser projects may be serialized in one job rather than split into separate billable setup environments.

### milestone workflow — manual only

`workflow_dispatch` or equivalent future trigger.

May validate:

- benchmark proof receipts;
- golden snapshot manifest;
- optional bounded Remotion smoke render if GitHub environment can support it;
- full Firefox/WebKit compatibility suite;
- release evidence bundle.

It must not silently become a per-push cost.

## 8. Local/CI parity rule

Every required CI command must have a documented local equivalent.

If CI runs:

```bash
pnpm v3:test:storybook
```

then developers run the same command locally.

Avoid two implementations such as:

```text
local = custom shell sequence
CI    = unrelated Nx command
```

because they drift.

Environment-only differences should be flags/configuration, not different test semantics.

## 9. Pre-push checklist

Before a V3 code push:

```text
[ ] working tree understood
[ ] focused tests green
[ ] affected lint green
[ ] affected build/types green
[ ] affected Storybook stories compile
[ ] affected Storybook tests green
[ ] affected E2E green
[ ] negative fixture added for new gate
[ ] canonical assets unchanged unless explicitly intended
[ ] no tmp output staged
[ ] no hidden runtime/model binary staged
```

Before a phase merge:

```text
[ ] full phase local gate green
[ ] CI green on proposed commit
[ ] milestone render proof green if animation behavior changed
[ ] human review recorded if visual behavior changed
[ ] planning/ADR updated if architecture changed
```

## 10. Linting policy

Linting is part of every local subsystem gate and every CI merge gate.

Planned standards:

- ESLint for TypeScript/JavaScript/React/Angular;
- existing Ruff for Python TTS/tooling;
- JSON/schema validation for manifests/Scene V3 data;
- no broad disable comments without explanation;
- engine adapter packages may add targeted rules but not weaken workspace standards.

Animation-specific lint concepts to consider:

- reject production `Math.random()`;
- reject direct production `Date.now()` or wall-clock use;
- reject unmanaged `requestAnimationFrame()` in production adapter paths;
- reject package version ranges for exact-version-bound runtimes where required;
- reject imports from runtime-internal paths outside adapters.

These may begin as custom static tests before becoming ESLint rules.

## 11. Unit-test policy

Every new behavior has:

- positive fixture;
- boundary fixture;
- negative fixture when it protects a gate;
- deterministic repetition test when randomness/time is involved.

Coverage percentage is secondary to semantic coverage.

A 100% line-covered blink gate that accepts open eyes is a failure.

## 12. Storybook-test policy

Every visual runtime primitive gets stories before production use.

Each animation story provides:

- canonical proof states;
- frame control;
- seed control;
- debug overlay;
- source/provenance overlay where applicable;
- deterministic fixture ID.

Required Storybook checks:

- story renders;
- controls update exact state;
- interaction assertions pass;
- accessibility checks for Studio UI where applicable;
- fixed-frame screenshot in pinned Chromium for golden states.

## 13. E2E policy

E2E validates workflows, not animation math.

Examples:

- open Scene V3;
- inspect source provenance;
- choose performance clip;
- scrub exact proof frame;
- trigger proof generation;
- reject candidate;
- verify canonical unchanged;
- approve and promote reviewed candidate;
- reload and confirm persisted revision.

E2E should mock or use deterministic fixtures for expensive external generation unless explicitly testing integration.

## 14. Browser matrix

Local pre-push default for affected UI workflows:

```text
Chromium
Firefox
```

WebKit is recommended for milestone/release compatibility but may remain outside every ordinary local loop if cost is disproportionate.

GitHub merge confidence:

```text
Chromium
Firefox
```

Golden pixel screenshots:

```text
Pinned Chromium only
```

## 15. Storybook build is a hard gate

A Storybook story that exists but does not build in CI is not valid coverage.

Required both locally and in GitHub Actions for relevant phases:

```bash
pnpm storybook:build
```

Later, the Animation Lab will have a separate build target and test target.

## 16. Animation rendered-proof policy

Rendered proofs are split into:

### Contract proof

Cheap, CI-safe:

- exact candidate/staged/resolved asset hashes;
- scene props;
- proof-frame schedule;
- receipt schema;
- runtime versions;
- expected semantic states.

### Actual render proof

Local/milestone:

- Remotion render;
- extracted frames;
- temporal metrics;
- artifact detection;
- semantic Qwen review where useful;
- human normal-speed review.

CI validates the receipt from the actual proof but does not claim it re-rendered unless it truly did.

## 17. Flake policy

A flaky test is treated as a defect.

Do not fix flakiness by increasing retries without diagnosis.

Animation flake sources to eliminate:

- wall-clock timing;
- uncontrolled RNG;
- browser RAF dependence;
- async asset races;
- model nondeterminism presented as deterministic;
- physics variable timestep;
- unresolved font loading;
- network source assets;
- nondeterministic ordering.

Retries may remain for browser infrastructure noise, but repeated pass-on-retry patterns must be tracked.

## 18. CI artifact policy

Upload on failure:

- Playwright traces;
- screenshots;
- retained failure video;
- Storybook test output where available;
- relevant compact logs.

Do not upload huge successful render outputs by default.

Successful milestone evidence should prefer compact receipts/contact sheets/checksums.

## 19. Branch policy during V3 build

Planning branches:

- documentation only;
- no CI-heavy render expectations.

Foundation feature branches:

- local focused gates during development;
- push coherent batches;
- avoid tiny commits that trigger redundant Actions runs;
- PR only after local phase gate.

Runtime benchmark branches:

- package spike isolated;
- benchmark-specific tests;
- keep/reject decision documented before merging dependency broadly.

## 20. Package-change gate

Any new animation runtime dependency requires locally:

```text
[ ] lockfile reviewed
[ ] security audit
[ ] license decision recorded
[ ] exact/compatible versions recorded
[ ] production bundle impact measured
[ ] minimal Storybook proof
[ ] minimal Remotion proof
[ ] unit/adapter tests
[ ] uninstall/reject path understood
```

Then GitHub Actions repeats:

- frozen install;
- security audit;
- lint;
- unit;
- build;
- Storybook build/tests;
- E2E as applicable.

## 21. Phase exit contract

A phase exit record should look conceptually like:

```json
{
  "phase": "RIVE_HERO_RUNTIME",
  "commit": "...",
  "local": {
    "lint": "PASS",
    "unit": "PASS",
    "build": "PASS",
    "storybook": "PASS",
    "e2e": "PASS"
  },
  "ci": {
    "runId": 123,
    "status": "PASS"
  },
  "renderProof": {
    "required": true,
    "status": "PASS",
    "receiptSha256": "..."
  },
  "human": {
    "required": true,
    "status": "APPROVED"
  }
}
```

## 22. Definition of local green

`LOCAL_GREEN` means all applicable local checks have actually executed successfully on the current commit/worktree.

It does not mean:

- tests passed several commits ago;
- a source-level contract test passed while the rendered feature failed;
- CI happened to be green on a different SHA;
- a skipped test was assumed safe.

## 23. Definition of CI green

`CI_GREEN` means GitHub Actions independently executed its declared deterministic contract on the exact commit and completed successfully.

If Actions cannot start because of quota/billing/runner availability, status is **CI_UNAVAILABLE**, not failed code and not green.

## 24. Quota-aware operating model

To conserve Actions usage while preserving independent verification:

- push coherent batches, not micro-commits;
- run focused tests repeatedly locally;
- run full local phase gate before push/PR;
- avoid automatic GPU/video workflows on every push;
- use Nx caching/affected targeting where it does not weaken merge confidence;
- keep one dependency installation per job where practical;
- cancel superseded CI runs;
- upload artifacts primarily on failure.

The quality bar is not reduced; expensive work is simply performed in the right environment.
