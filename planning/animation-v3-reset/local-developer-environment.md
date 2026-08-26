# Local Developer Environment and Reproducibility Plan

Status: **active local-workstation contract**

Updated: **2026-08-26**

V3 relies on deterministic behavior across Node, browsers, Remotion, local AI services and animation runtimes. This document defines the local environment contract and records the current persistent `start:all` workstation layout.

## 1. Goals

- fast local iteration;
- reproducible deterministic tests;
- clear separation between required and optional services;
- predictable Windows/Git Bash behavior;
- minimal Actions dependency during development;
- portable receipts that do not depend on absolute workstation paths;
- one persistent local workstation command for commonly used interactive services;
- separate terminals for tests, render scripts, Git and one-off tooling.

## 2. Environment classes

```text
CORE
BROWSER
STUDIO
ANIMATION_LAB
RENDER
AI_OPTIONAL
PHYSICS_AUTHORING
MILESTONE
```

## 3. CORE environment

Required for foundation work:

```text
Node 22
pnpm locked by repository
Nx workspace
TypeScript
Vitest / node:test as configured
Git
```

No GPU or animation runtime is required for pure contract/frame/compiler tests.

## 4. BROWSER environment

Required for Studio/Animation Lab browser tests:

```text
Chromium
Firefox
WebKit for current Animation Lab coverage
Playwright dependencies
Storybook
```

Browser coverage may vary by feature cost, but the current Pixi foundation has proven Chromium, Firefox and WebKit locally.

## 5. STUDIO environment

Angular Studio runs as the primary product UI:

```text
apps/web
http://localhost:4200
```

It remains the project/workflow/review/promotion surface.

## 6. ANIMATION_LAB environment

React Animation Lab is the specialist runtime engineering/inspection UI:

```text
apps/animation-lab
http://localhost:4300
```

The Lab is now common enough to run with the normal persistent workstation.

It remains a specialist surface rather than the production project-management UI.

## 7. RENDER environment

Required for Remotion proof rendering:

```text
FFmpeg
Remotion/Chromium renderer
hardware acceleration policy as benchmarked
fixed fonts/assets
known resolution/fps profiles
```

Render receipts record relevant versions/profile.

## 8. AI_OPTIONAL environment

Not required for foundation tests.

May include:

```text
ComfyUI
Ollama
Qwen3-VL
SAM3/BiRefNet workflows
future I2V services
```

Foundation code must degrade with explicit `UNAVAILABLE`/skip policy rather than failing unrelated contract tests because an AI service is offline.

## 9. Service availability policy

Each external/local service gets:

```text
preflight
version query if available
timeout
clear unavailable status
no infinite wait
```

Test fixtures must include unavailable service behavior where appropriate.

## 10. Current local ports

The current workstation port contract is:

```text
3000  API
4200  Angular Studio
4300  Animation Lab
5432  Postgres default
8188  ComfyUI default
11434 Ollama default
```

Additional test/Storybook services remain separately configurable.

Avoid hidden hard-coded port proliferation. When a port becomes a stable workstation contract, record it here and in the startup/test configuration that owns it.

## 11. `pnpm start:all` workstation profile

The preferred normal development pattern is:

```text
Terminal A
  pnpm start:all

Terminal B
  tests
  scripts
  render commands
  Git operations
  package/tool inspection
```

`start:all` should remain running while ordinary implementation work occurs.

The current startup stack manages or coordinates:

```text
hardware profiling
workspace dependency reconciliation
Prisma generation/database preparation
Postgres
Angular Studio :4200
Animation Lab :4300
API :3000
renderer worker
ComfyUI when locally managed/available
Ollama planning when configured
```

Animation Lab is now part of the managed core dev-server process. The 3000/4200/4300 startup and Ctrl+C cleanup lifecycle was verified locally on Windows on 2026-08-26.

## 12. Why the Lab is part of the persistent workstation

Originally the Lab could be treated as an occasional specialist server. That is no longer the intended workflow because it is now used for:

- exact-frame inspection;
- runtime diagnostics;
- Pixi engine proof;
- Storybook/runtime work;
- future Rive/Three/Rapier integration;
- cross-checking Scene V3 while Angular Studio remains open.

Keeping it on stable port 4300 avoids repeated manual startup and makes future Angular ↔ Lab deep-linking practical.

## 13. Start/stop expectations

Before startup, stable workstation ports should be checked for conflicts.

Startup should not silently choose random alternative ports for Studio/Lab/API because deep links, Playwright and documentation rely on stable local addresses.

Ctrl+C from the managed workstation terminal should terminate repo-owned dev-server process trees and release:

```text
3000
4200
4300
```

Windows cleanup remains deliberately scoped to repo-local processes and known managed ports.

Never kill arbitrary machine-wide processes merely because they use Node.

## 14. Animation Lab Playwright while `start:all` is running

Animation Lab Playwright uses `reuseExistingServer: true` and its own endpoint variable:

```text
ANIMATION_LAB_BASE_URL=http://localhost:4300
```

The Angular Studio continues to own the generic frontend variable:

```text
BASE_URL=http://localhost:4200
```

These must remain separate. Nx can load workspace `.env` values into E2E execution; allowing Animation Lab to read the generic `BASE_URL` would silently redirect Lab tests to Angular Studio on 4200 even while the Lab preview server is correctly listening on 4300.

With the workstation already running on 4300, the E2E suite may reuse that server instead of spawning another preview server. This supports the normal interactive workflow.

If a future gate specifically requires production-preview-bundle behavior, run it on an explicit alternate port/`ANIMATION_LAB_BASE_URL` or disable reuse for that gate. Do not destabilize the normal 4300 workstation contract.

## 15. Environment configuration

Categorize variables:

```text
REQUIRED_CORE
OPTIONAL_LOCAL_SERVICE
TEST_ONLY
SECRET
```

Current frontend E2E ownership:

```text
BASE_URL                 Angular Studio Playwright endpoint, default 4200
ANIMATION_LAB_BASE_URL   Animation Lab Playwright endpoint, default 4300
```

Do not put secrets into Scene V3, receipts or logs.

## 16. Windows path policy

Canonical data uses logical POSIX-style paths/IDs.

Local tools may resolve to Windows paths.

Tests required:

- `\` and `/` input normalization;
- drive letter excluded from canonical hash;
- temp/output paths portable;
- no hash difference Windows vs Linux from path separator alone.

## 17. Git Bash command policy

Commands intended for the user should be Git Bash compatible when possible.

Avoid interactive-shell termination patterns such as:

```bash
exit $status
```

Prefer:

```bash
command
status=$?
printf '\nexit code: %s\n' "$status"
```

Use quoted forward-slash Windows paths with `start`/`explorer.exe` for opening local artifacts.

## 18. Deterministic locale/time policy

Animation logic must not depend on:

- current date/time;
- local timezone;
- locale-specific number/string ordering;
- filesystem enumeration order.

Where sorting matters, use explicit stable ordering.

Tests should run under at least one CI Linux environment and local Windows expected hashes.

## 19. Font policy

Rendered text can vary by font environment.

Production fonts should be repository-managed/approved assets or otherwise deterministically available under license.

Evidence receipts should record font package/version when text layout affects proof.

Do not expose/share raw font files through assistant artifacts.

## 20. GPU policy

GPU acceleration is an optimization, not semantic authority.

Required:

- fallback behavior documented;
- same Scene V3 semantics independent of GPU presence;
- visual differences beyond tolerance trigger review;
- unit/contract tests never require GPU.

The current Pixi browser E2E proves real WebGL initialization, while Pixi projection/unit tests remain GPU-independent.

## 21. Cache policy

Cache classes:

```text
SAFE_DERIVED
RUNTIME_PREPARED
RENDER_OUTPUT
AI_MODEL
BROWSER
```

Canonical correctness cannot depend on stale cache.

Cache keys must include relevant:

- source hash;
- scene revision/hash;
- runtime version;
- parameter hash;
- seed.

## 22. Cache invalidation tests

- source hash change misses cache;
- runtime version change misses runtime cache;
- unrelated metadata does not invalidate expensive visual cache when semantically irrelevant;
- corrupted cache falls back/rebuilds rather than promoting bad output.

## 23. Temp directory policy

`tmp/` remains workspace for:

- candidates;
- intermediate masks;
- proof renders;
- caches;
- diagnostics.

No canonical identifier depends on timestamped temp directory name.

Receipts reference hashes/logical IDs; local paths are convenience diagnostics.

## 24. Output cleanup

Tools should support bounded cleanup by artifact class/age without deleting canonical assets or durable receipts.

No broad `rm -rf assets` or unreviewed `git clean -fd` style cleanup.

Unknown/untracked local files must be inspected before deletion or staging.

## 25. Local database policy

Studio metadata persistence uses the existing local database architecture.

Tests distinguish:

- pure library tests with no DB;
- repository/API integration tests with test DB;
- E2E with prepared DB fixtures.

Scene compiler and frame kernel remain pure and database-independent.

## 26. Docker policy

Docker provides services where useful but must not become mandatory for simple animation-contract unit tests.

Containerize services when it improves parity, not as ceremony.

The normal workstation currently expects Docker availability for its managed Postgres startup.

## 27. Version pinning

Record/pin:

```text
Node major/exact policy
pnpm lockfile
Remotion exact package family
runtime packages
Playwright version
AI model/workflow versions in evidence
```

`@remotion/*` remains exact lockstep with Remotion.

Pixi is currently pinned exactly to `8.20.0` for the foundation adoption proof.

## 28. Dependency install gate

Before adopting animation package:

```text
pnpm install
workspace check
security audit policy
lint/test/build
license review
bundle/performance note
```

Then runtime benchmark.

The Pixi foundation completed this gate at its current preview-only scope.

## 29. Local startup profiles

Supported/intended profiles:

### foundation

No services beyond Node.

### workstation / `start:all`

```text
Angular Studio
Animation Lab
API
DB
renderer worker
optional configured AI services
```

### animation-lab-only

Useful for isolated runtime work if the full workstation is not desired:

```bash
pnpm exec nx serve animation-lab --port=4300
```

### render

Remotion/FFmpeg plus optional runtime assets.

### ai

Adds ComfyUI/Ollama.

A developer should still not need the entire world to run one frame-kernel or compiler test.

## 30. Health command

Future root diagnostic should summarize:

```text
Node/pnpm
workspace
Studio 4200
Animation Lab 4300
API 3000
browser availability
FFmpeg
Remotion
ComfyUI optional
Ollama optional
GPU info
DB
```

Example planned alias:

```text
pnpm doctor:v3
```

It should report unavailable optional services without claiming core failure.

## 31. Render profiles

Named profiles:

```text
storybook
preview
proof
production
```

Each profile defines:

- resolution;
- fps;
- quality/codec where relevant;
- concurrency;
- hardware policy;
- debug/evidence behavior.

Scene semantics must not change by render profile except explicitly nonsemantic quality/LOD rules.

## 32. Concurrency policy

Concurrency is performance configuration, not semantic input.

Tests/benchmarks should prove supported renders do not change intended state when concurrency changes.

## 33. AI concurrency

ComfyUI/Ollama concurrency is separately bounded to avoid GPU memory contention.

AI generation failures must not corrupt canonical assets.

## 34. CI parity

GitHub Linux checks:

- dependency install;
- workspace graph;
- lint/unit/build;
- Storybook/E2E as configured;
- canonical hash fixtures.

Local Windows additionally owns expensive GPU/render proof when CI capacity/hardware does not.

Cross-platform expected deterministic hashes remain a key foundation acceptance test.

## 35. Local deterministic authority

GitHub Actions availability has not always been reliable enough to block every local slice on hosted capacity.

Therefore:

- local deterministic gates are valid merge evidence when explicitly run and green;
- Actions should repeat them when available;
- known local failures are never ignored merely because CI is unavailable;
- human acceptance is never inferred from automated tests.

## 36. Reproduction bundle

A bug report/proof should be reproducible from compact metadata:

```text
commit
scene/fixture ID
resolved scene hash
runtime versions
frame/seed
asset hashes
render profile
```

Not from "it was in tmp folder timestamp X" alone.

## 37. Failure diagnostics

Environment failures classified separately from semantic failures:

```text
DEPENDENCY_MISSING
SERVICE_UNAVAILABLE
PORT_IN_USE
BROWSER_UNAVAILABLE
RENDERER_FAILURE
GPU_RESOURCE
DISK_RESOURCE
DB_UNAVAILABLE
```

Do not weaken animation tests because an environment prerequisite is missing.

## 38. Disk/large artifact policy

Monitor:

- candidate sweeps;
- MP4 proofs;
- AI model assets;
- browser caches;
- node_modules;
- physics bakes;
- Storybook static builds.

Milestone proof receipts may remain committed while heavyweight artifacts are local/selected retention.

## 39. Security

Local services should bind appropriately for development and not assume public exposure.

No secrets in logs/receipts.

Dependency/security checks remain part of local pre-push/full CI policy.

Future Studio workflow execution must use typed/allowlisted API methods or jobs rather than exposing arbitrary shell commands to the browser.

## 40. Immediate local environment exit gate

The workstation-startup slice is locally verified on Windows:

- [x] Animation Lab configured for stable port 4300;
- [x] Playwright web server aligned to 4300;
- [x] Animation Lab E2E uses `ANIMATION_LAB_BASE_URL` rather than Angular Studio `BASE_URL`;
- [x] env templates document 4200 Studio / 4300 Lab ownership separately;
- [x] `start:all` code launches and waits for Animation Lab;
- [x] Windows cleanup includes 4300/Animation Lab;
- [x] source-level workstation regression tests cover the 3000/4200/4300 contract;
- [x] focused Lab E2E is green locally after the endpoint-variable split — Chromium, Firefox and WebKit all passed;
- [x] local `pnpm start:all` reached API 3000, Studio 4200 and Lab 4300 — all three returned HTTP 200 during the smoke check;
- [x] Ctrl+C released all three repo-owned dev listeners — no listeners remained on 3000/4200/4300 after shutdown.

Verification evidence from 2026-08-26:

```text
Animation Lab Playwright: 3 passed / 0 failed
renderer:test:             130 tests, 128 passed, 2 intentional skips, 0 failed
Studio health:             http://localhost:4200/ -> 200
Animation Lab health:      http://localhost:4300/ -> 200
API docs health:           http://localhost:3000/api/docs -> 200
post-shutdown listeners:   none on 3000, 4200, 4300
```

The two renderer skips remain the existing human-acceptance/milestone gates; this workstation verification does not manufacture or imply human approval.

Longer-term environment work still includes:

- `doctor:v3` or equivalent;
- broader Windows/Linux canonical hash parity coverage;
- optional service preflight unification;
- continued toolchain deprecation cleanup;
- production-preview E2E profile separated from persistent dev-server reuse where needed.
