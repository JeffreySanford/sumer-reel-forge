# Test Command Manifest — Local First, CI Second

Status: **planning contract**

This document translates the V3 quality philosophy into repeatable command tiers. It intentionally separates commands that exist today from commands planned for future V3 packages.

## 1. Principle

GitHub Actions is an independent confirmation environment, not the first place we discover obvious lint, unit, build, Storybook or E2E failures.

Required flow:

```text
local focused
    ↓
local affected subsystem
    ↓
local pre-push/phase gate
    ↓
push coherent batch
    ↓
GitHub Actions deterministic re-check
```

## 2. Current verified command

Phase 1 historical source library has been locally verified with:

```bash
pnpm nx test historical-sources
pnpm nx build historical-sources
```

Future Phase 1 changes should also include the project's lint target when implementation code changes.

## 3. Current repository parity commands

Current CI already invokes these root commands:

```bash
pnpm workspace:check
pnpm security:audit
pnpm lint
pnpm test
pnpm build
pnpm e2e:api
pnpm storybook:build
pnpm e2e:ci
```

These are the semantic baseline for full local parity. Local developer runs may use affected/focused equivalents until the milestone/full gate.

## 4. Quality tiers

### L0 — edit loop

Purpose: seconds.

Run only the smallest useful deterministic test set.

Examples:

```text
one Vitest file
one node:test file
one Nx project test target
one pure compiler fixture
```

L0 does not authorize push.

### L1 — subsystem gate

For a changed library/app slice:

```text
lint affected project
test affected project
build/typecheck affected project
```

When Storybook-bearing UI/animation changed:

```text
Storybook interaction/component tests for affected stories
Storybook build or local Storybook smoke as defined by target
```

### L2 — integration gate

Adds nearest cross-boundary tests.

Examples:

```text
historical-sources + web provenance view-model integration
contracts + frame + runtime + scene compiler tests
Rive adapter + animation-lab story
Pixi adapter + Remotion proof fixture
```

### L3 — pre-push gate

For a coherent merge-worthy batch:

```text
workspace consistency
all affected lint
all affected unit
all affected build/types
all affected Storybook tests/build
all affected E2E
source/provenance checks
receipt/schema checks
```

Visual runtime changes also require local rendered proof before push when the change claims visual correctness.

### L4 — phase/milestone gate

Full local deterministic suite plus benchmark proofs and human review where applicable.

A phase cannot be declared complete from L1/L2 only.

## 5. Planned V3 project command convention

Every V3 Nx library should expose:

```text
lint
test
build
```

Storybook-bearing projects should expose:

```text
storybook
build-storybook
test-storybook
```

E2E projects should expose:

```text
e2e
```

Render/proof tooling remains explicit scripts/targets rather than being hidden inside unit tests.

## 6. Planned root aliases

These aliases do not exist until implemented; names are reserved by planning:

```text
pnpm animation:v3:foundation
pnpm animation:v3:storybook
pnpm animation:v3:e2e
pnpm animation:v3:proof
pnpm animation:v3:quality
pnpm provenance:quality
```

Expected semantics:

### `animation:v3:foundation`

```text
contracts/frame/runtime/scene/fixtures lint + test + build
```

### `animation:v3:storybook`

```text
Animation Lab Storybook build + interaction/browser tests
```

### `animation:v3:e2e`

```text
Studio + Animation Lab production workflow E2E
```

### `animation:v3:proof`

Explicit local rendered proof for a named benchmark/scene.

### `animation:v3:quality`

Phase-appropriate deterministic aggregate; must not silently launch hours of GPU rendering.

### `provenance:quality`

Historical source registry + validation + provenance Studio tests.

## 7. Phase 1 local command plan

When provenance UI lands:

```text
historical-sources lint/test/build
web provenance component unit
web lint/build
Storybook provenance stories/tests/build
Playwright provenance E2E
```

Before Phase 1 exit, also run root/current parity subset appropriate to changed code.

## 8. Phase 2 local command plan

Per PR:

```text
nx lint/test/build animation-contracts
nx lint/test/build animation-frame
nx lint/test/build animation-runtime
nx lint/test/build animation-scene
nx lint/test/build animation-fixtures
```

At Phase 2 milestone:

```text
all foundation projects
cross-library integration tests
V2 compatibility fixture
canonical hash fixture
workspace check
root lint/test/build as applicable
```

## 9. Phase 3 Storybook local plan

Before push of Animation Lab changes:

```text
animation-lab lint
animation-lab unit
animation-lab build
build Storybook
run Storybook browser/interaction tests
run fixed-frame visual tests in pinned local environment when golden changes are claimed
```

Golden image changes require explicit review, not blanket update.

## 10. Runtime phase local plan

### Pixi/Rive/Three

```text
adapter unit
adapter lint/build
Animation Lab stories/tests
fixed-frame visual proof
short rendered motion proof
runtime-specific negative fixtures
```

### Rapier

Add:

```text
same-seed bake repeat
fixed-timestep proof
bake checksum verification
playback proof
```

### crowd/herd/city

Add:

```text
seed repeatability
population/count/path distribution
performance budget receipt
visual/motion proof
```

## 11. E2E scope rule

E2E tests prove workflows, not low-level math.

Do not put frame interpolation arithmetic into Playwright merely to claim E2E coverage.

Use E2E for:

- source inspection;
- scene load/save;
- exact-frame scrub;
- runtime selection/diagnostics;
- proof invocation/status;
- candidate review;
- promotion/rejection;
- stale-state behavior;
- accessibility-critical workflow;
- failure recovery.

## 12. Storybook scope rule

Every reusable visual primitive or stateful authoring component should have Storybook coverage before broad reuse.

Animation stories should use shared exact-frame fixtures.

Storybook is required for:

- hero actor proof states;
- materials;
- spatial camera/depth;
- physics playback;
- crowds;
- CityKit states;
- provenance UI;
- review/promotion UI;
- diagnostics.

## 13. Lint scope rule

Lint is part of local correctness, not cleanup before merge.

Planned semantic lint/source rules include:

```text
no Math.random() in deterministic animation production code
no Date.now()/performance.now() driving animation state
no direct runtime dependency inside core contracts
no canonical write from runtime adapter
no unversioned runtime declaration
no debug artifact eligible for production resolution
```

Some may begin as unit/source-contract tests and become ESLint rules only if valuable.

## 14. Build/type gate

A test pass does not substitute for build/type success.

Every merge-worthy code slice requires an appropriate build/typecheck locally before push.

This specifically catches:

- public export omissions;
- cross-library dependency errors;
- ESM/CJS mismatches;
- browser/server type assumptions;
- package-version incompatibility.

## 15. GitHub Actions mapping

Planned conceptual jobs:

```text
quality-core
storybook
api-e2e
browser-e2e
receipt-verify
```

`quality-core`:

```text
install
workspace check
security policy
lint
unit
build/types
historical/source validation
```

`storybook`:

```text
build stories
browser/component tests
accessibility checks when configured
```

`browser-e2e`:

```text
Chromium required
Firefox selected coverage
WebKit locally/milestone or CI as budget permits
```

`receipt-verify`:

```text
schema
commit/source/scene hashes
runtime versions
staleness
```

## 16. GitHub quota policy

Do not make Actions the render farm.

Default PR CI excludes:

- GPU-heavy Remotion benchmark renders;
- ComfyUI generation;
- Ollama/Qwen heavyweight semantic passes;
- long physics/crowd benchmark suites;
- full cross-browser visual goldens.

Those run locally/milestone and produce receipts.

GitHub verifies deterministic metadata and ordinary browser/unit/build gates.

## 17. Docs-only policy

Planning/Markdown-only changes should not require rerunning expensive local animation proof suites.

Before push, confirm diff is documentation-only. CI redesign may eventually use path-aware job skipping.

No fake claim that documentation changes were "tested" by render suites.

## 18. Failure behavior

The shell command style should preserve useful output and avoid closing the user's interactive shell.

When a diagnostic command may fail intentionally, capture status without `exit`:

```bash
pnpm some:test
status=$?
printf '\nexit code: %s\n' "$status"
git status --short
```

## 19. Evidence logging

Every manually run milestone gate should capture compact output:

```text
commit SHA
command/version
pass/fail count
duration
proof receipt path
human verdict if applicable
```

Avoid pasting hundreds of irrelevant log lines when a structured summary exists.

## 20. Promotion gate

No promotion command is part of a generic `quality` command.

Testing may prove readiness. Promotion remains explicit and consequential.

## 21. CI green definition

`CI_GREEN` means the GitHub-required deterministic jobs for that phase/change succeeded.

It does not imply:

- rendered visual proof passed;
- semantic QA passed;
- human review passed.

Those remain separate statuses.

## 22. Combined phase status vocabulary

```text
LOCAL_GREEN
CI_GREEN
RENDER_PROOF_GREEN
SEMANTIC_GREEN
HUMAN_APPROVED
PHASE_COMPLETE
```

A nonvisual foundation phase may not require render/semantic/human statuses.

## 23. Test-change rule

If an acceptance threshold or test changes because of a real failure:

1. preserve the escaped failure as a negative regression fixture;
2. add/adjust positive fixture;
3. explain why old test was insufficient;
4. do not merely lower threshold until current output passes.

## 24. Local-first completion rule

A code change is ready to push only when the author can state which local gate was run and what passed.

A phase is ready to close only when:

- local phase gate green;
- GitHub deterministic gate green;
- applicable visual/semantic/human gates green;
- no known blocking regression is hidden behind a skipped test.
