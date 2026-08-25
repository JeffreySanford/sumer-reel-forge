# V3 GitHub Actions Redesign

Status: **planning contract**

The current CI workflow is a single Ubuntu job that runs workspace checks, dependency audit, lint, tests, build, API E2E, Storybook build, Playwright browser installation and Chromium/Firefox E2E. V3 should preserve that independent verification while making the workflow easier to reason about, quota-aware and aligned with the local-first contract.

## 1. Goals

- every merge-worthy deterministic gate has a local equivalent;
- GitHub re-runs applicable lint, unit, build, Storybook and E2E checks;
- expensive local animation renders are not accidentally moved into per-push Actions;
- CI failures identify the failed category clearly;
- dependency installation/setup is not repeated gratuitously;
- superseded pushes are cancelled;
- failure artifacts are useful and bounded.

## 2. Proposed workflows

### `ci.yml` — ordinary PR/master confidence

Triggers:

```yaml
pull_request:
push:
  branches: [master, main]
```

Concurrency remains cancel-in-progress by branch/ref.

Jobs:

#### `quality-core`

One Linux setup.

Runs conceptually:

```text
checkout
pnpm
node 22
uv
dependency install frozen
workspace check
Prisma generation
security audit
database preparation if required
lint
unit tests
historical-source validation
production build
Storybook build
Storybook browser/component tests
render-contract/receipt tests
```

#### `browser-e2e`

Depends on `quality-core`.

Runs:

```text
Playwright browser install
API E2E
Chromium E2E
Firefox E2E
```

Failure artifacts:

- Playwright traces;
- screenshots;
- test-output;
- retained failure video when enabled.

Reason for two jobs rather than many:

- browser dependencies are expensive;
- unit/build setup should not be repeated for each category;
- two jobs still separate fast code quality from browser workflow failures.

## 3. Planned local parity commands

CI should call scripts that developers can run unchanged:

```bash
pnpm v3:check:core
pnpm v3:check:browser
```

Where:

```text
v3:check:core
  workspace check
  lint
  unit
  build
  Storybook build/test
  source validation
  render contract validation

v3:check:browser
  API E2E
  Chromium E2E
  Firefox E2E
```

A future `v3:check:local` runs both.

## 4. Pull request requirement

Before opening/updating a PR expected to merge:

```bash
pnpm v3:check:local
```

must be green on the intended commit/worktree unless the PR explicitly documents a known intentional-red architecture spike.

GitHub Actions then repeats the deterministic contract.

## 5. Documentation-only changes

Pure Markdown/planning commits do not need a local full runtime suite merely because CI exists.

However when such changes are part of a PR containing code, the PR's code gates still apply.

Future optimization may use path classification to avoid unnecessary browser setup for docs-only PRs, but path filtering must not accidentally skip required code checks.

## 6. Nx affected strategy

Use `nx affected` for development feedback and potentially PR optimization, but do not let it weaken phase/milestone confidence.

Recommended:

```text
focused local loop      nx affected/targeted
pre-push phase gate     explicit phase dependencies
PR/master CI            affected + always-required foundation checks
milestone               full relevant suite
```

Always-required foundation checks should include at least:

- workspace consistency;
- animation contracts/frame tests once V3 exists;
- historical-source validation when source registry is part of production scene contracts.

## 7. Storybook CI

Ordinary CI must check both:

```text
Storybook builds
Storybook tests execute
```

For Angular Studio and React Animation Lab these eventually become separate Nx projects/targets.

Proposed commands:

```bash
pnpm nx build-storybook web
pnpm nx test-storybook web
pnpm nx build-storybook animation-lab
pnpm nx test-storybook animation-lab
```

Exact commands depend on the Storybook/Vitest migration selected during implementation.

## 8. Visual regression CI

Pixel goldens are validated in pinned Chromium only.

Do not run independent Firefox golden comparisons.

Ordinary CI may run a compact golden subset once stable.

Large visual suites can be milestone/manual if Actions usage becomes excessive.

Golden update policy:

- never auto-update in CI;
- developer intentionally updates locally in pinned environment;
- PR clearly shows changed goldens/receipt metadata.

## 9. Render proof CI

Ordinary GitHub Actions validates **render proof contracts and receipts**, not full GPU-heavy local renders.

CI can check:

```text
receipt schema
commit hash
source hashes
runtime versions
proof-state schedule
candidate/staged/resolved hashes
required semantic verdict fields
human-review requirement field
staleness
```

CI must not say a render was reproduced unless it actually rendered it.

## 10. Manual milestone workflow

Create later:

```text
.github/workflows/animation-milestone.yml
```

Trigger:

```yaml
workflow_dispatch:
```

Potential checks:

- full Storybook visual suite;
- all browser compatibility projects;
- compact Remotion smoke proof if practical;
- proof receipt bundle validation;
- release artifact manifest generation.

This workflow is never automatic on every push.

## 11. Security/dependency CI

On runtime dependency changes:

CI must include:

- frozen lockfile install;
- `pnpm audit --prod --audit-level high` or current repository equivalent;
- workspace dependency consistency;
- license/adoption record exists for constrained packages;
- exact Remotion package compatibility rule;
- package version receipt tests.

## 12. Timeout policy

Every external/process-heavy step gets a timeout.

Suggested upper bounds:

```text
core job                 20–25 min
API E2E                   5 min
Storybook build/test      5–8 min each if separate
browser E2E              10 min
milestone workflow       explicit larger bound
```

Long-running local renderer processes keep watchdog/heartbeat behavior.

## 13. Failure classification

CI summary should make failures easy to categorize:

```text
WORKSPACE
DEPENDENCY/SECURITY
LINT
UNIT
BUILD
STORYBOOK
API_E2E
BROWSER_E2E
RECEIPT_VALIDATION
INFRASTRUCTURE/QUOTA
```

A job that never starts because of Actions quota/billing is infrastructure failure, not code failure.

## 14. Artifact policy

Upload on failure:

- Playwright report;
- traces;
- screenshots;
- failure video;
- compact Storybook/test logs.

Do not upload successful multi-megabyte animation renders by default.

For successful animation milestones commit/store compact:

- JSON receipt;
- checksums;
- small contact sheet when approved;
- human decision metadata.

## 15. CI status required for phase exit

Each phase exit records:

```text
commit SHA
local command(s) executed
local result
Actions run ID
Actions result
```

No phase is repository-complete with only local green.

No phase is visually complete with only CI green.

## 16. Actions quota strategy

- batch coherent commits before push;
- use local tests continuously;
- use PR pushes for meaningful checkpoints;
- cancel-in-progress stays enabled;
- do not automatically run milestone renders;
- keep browser setup consolidated;
- consider path-aware skip only after robust tests prove it cannot skip required checks.

## 17. Future self-hosted option

If V3 eventually needs automated GPU proof on CI, evaluate a self-hosted runner on the known workstation only as a separate project.

Requirements before adoption:

- security isolation;
- reproducible environment;
- runner availability policy;
- queue/timeout behavior;
- no access to secrets beyond need;
- proof that local manual rendering is no longer sufficient.

Not part of current critical path.
