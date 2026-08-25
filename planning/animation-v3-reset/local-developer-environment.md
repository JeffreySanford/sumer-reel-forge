# Local Developer Environment and Reproducibility Plan

Status: **planning contract**

V3 relies on deterministic behavior across Node, browsers, Remotion, local AI services and future animation runtimes. This document defines the local environment contract before package integration begins.

## 1. Goals

- fast local iteration;
- reproducible deterministic tests;
- clear separation between required and optional services;
- predictable Windows/Git Bash behavior;
- minimal Actions dependency during development;
- portable receipts that do not depend on absolute workstation paths.

## 2. Environment classes

```text
CORE
BROWSER
RENDER
AI_OPTIONAL
PHYSICS_AUTHORING
MILESTONE
```

## 3. CORE environment

Required for Phase 1/2:

```text
Node 22
pnpm locked by repository
Nx workspace
TypeScript
Vitest / node:test as configured
Git
```

No GPU or animation runtime required.

## 4. BROWSER environment

Required once Studio/Animation Lab browser tests exist:

```text
Chromium
Firefox selected coverage
Playwright dependencies
Storybook
```

WebKit remains selected/milestone depending on local practicality and CI budget.

## 5. RENDER environment

Required for Remotion proof rendering:

```text
FFmpeg
Remotion/Chromium renderer
hardware acceleration policy as benchmarked
fixed fonts/assets
known resolution/fps profiles
```

Render receipts record relevant versions/profile.

## 6. AI_OPTIONAL environment

Not required for foundation tests.

May include:

```text
ComfyUI
Ollama
Qwen3-VL
SAM3/BiRefNet workflows
future I2V services
```

Foundation code must degrade with explicit `UNAVAILABLE`/skip policy rather than failing unrelated contract tests because AI service is offline.

## 7. Service availability policy

Each external/local service gets:

```text
preflight
version query if available
timeout
clear unavailable status
no infinite wait
```

Test fixtures must include unavailable service behavior.

## 8. Ports

Avoid hidden hard-coded port proliferation.

Centralize planned service endpoints/configuration:

```text
Studio/web
API
Postgres
ComfyUI
Ollama
future Animation Lab dev server
Storybook
```

Tests should use configured/ephemeral ports where feasible.

## 9. Environment configuration

Categorize variables:

```text
REQUIRED_CORE
OPTIONAL_LOCAL_SERVICE
TEST_ONLY
SECRET
```

Do not put secrets into Scene V3, receipts or logs.

## 10. Windows path policy

Canonical data uses logical POSIX-style paths/IDs.

Local tools may resolve to Windows paths.

Tests required:

- `\` and `/` input normalization;
- drive letter excluded from canonical hash;
- temp/output paths portable;
- no hash difference Windows vs Linux from path separator alone.

## 11. Git Bash command policy

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

## 12. Deterministic locale/time policy

Animation logic must not depend on:

- current date/time;
- local timezone;
- locale-specific number/string ordering;
- filesystem enumeration order.

Where sorting matters, use explicit stable ordering.

Tests should run under at least one CI Linux environment and local Windows expected hashes.

## 13. Font policy

Rendered text can vary by font environment.

Production fonts should be repository-managed/approved assets or otherwise deterministically available under license.

Evidence receipts should record font package/version when text layout affects proof.

Do not expose/share raw font files through assistant artifacts.

## 14. GPU policy

GPU acceleration is an optimization, not semantic authority.

Required:

- fallback behavior documented;
- same Scene V3 semantics independent of GPU presence;
- visual differences beyond tolerance trigger review;
- unit/contract tests never require GPU.

## 15. Cache policy

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

## 16. Cache invalidation tests

- source hash change misses cache;
- runtime version change misses runtime cache;
- unrelated metadata does not invalidate expensive visual cache when semantically irrelevant;
- corrupted cache falls back/rebuilds rather than promoting bad output.

## 17. Temp directory policy

`tmp/` remains workspace for:

- candidates;
- intermediate masks;
- proof renders;
- caches;
- diagnostics.

No canonical identifier depends on timestamped temp directory name.

Receipts reference hashes/logical IDs; local paths are convenience diagnostics.

## 18. Output cleanup

Tools should support bounded cleanup by artifact class/age without deleting canonical assets or durable receipts.

No broad `rm -rf assets` style cleanup.

## 19. Local database policy

Studio metadata persistence may use existing local database architecture.

Tests distinguish:

- pure library tests with no DB;
- repository/API integration tests with test DB;
- E2E with prepared DB fixtures.

Scene compiler and frame kernel remain pure and database-independent.

## 20. Docker policy

Docker can provide services where useful but must not become mandatory for simple animation-contract unit tests.

Containerize services when it improves parity, not as ceremony.

## 21. Version pinning

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

## 22. Dependency install gate

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

## 23. Local startup profiles

Planned profiles:

### foundation

No services beyond Node.

### studio

Web/API/DB.

### animation-lab

Vite/Storybook only plus chosen browser runtime.

### render

Remotion/FFmpeg plus optional runtime assets.

### ai

Adds ComfyUI/Ollama.

A developer should not start the entire world to run one frame-kernel test.

## 24. Health command

Future root diagnostic should summarize:

```text
Node/pnpm
workspace
browser availability
FFmpeg
Remotion
ComfyUI optional
Ollama optional
GPU info
DB/API as requested
```

Example planned alias:

```text
pnpm doctor:v3
```

It should report unavailable optional services without claiming core failure.

## 25. Render profiles

Planned named profiles:

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

## 26. Concurrency policy

Concurrency is performance configuration, not semantic input.

Tests/benchmarks should prove supported renders do not change intended state when concurrency changes.

## 27. AI concurrency

ComfyUI/Ollama concurrency is separately bounded to avoid GPU memory contention.

AI generation failures must not corrupt canonical assets.

## 28. CI parity

GitHub Linux checks:

- dependency install;
- workspace graph;
- lint/unit/build;
- Storybook/E2E as configured;
- canonical hash fixtures.

Local Windows additionally owns expensive GPU/render proof.

Cross-platform expected deterministic hashes are a key foundation acceptance test.

## 29. Reproduction bundle

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

## 30. Failure diagnostics

Environment failures classified separately from semantic failures:

```text
DEPENDENCY_MISSING
SERVICE_UNAVAILABLE
BROWSER_UNAVAILABLE
RENDERER_FAILURE
GPU_RESOURCE
DISK_RESOURCE
DB_UNAVAILABLE
```

Do not weaken animation tests because an environment prerequisite is missing.

## 31. Disk/large artifact policy

Monitor:

- candidate sweeps;
- MP4 proofs;
- AI model assets;
- browser caches;
- node_modules;
- physics bakes.

Milestone proof receipts may remain committed while heavyweight artifacts are local/selected retention.

## 32. Security

Local services should bind appropriately for development and not assume public exposure.

No secrets in logs/receipts.

Dependency/security checks remain part of local pre-push/full CI policy.

## 33. Local environment exit gate

Before real runtime integration accelerates, we should have:

- documented required versions;
- `doctor:v3` or equivalent planned/implemented;
- Windows/Linux canonical hash parity fixture;
- optional service preflight abstraction;
- path normalization tests;
- render profile definitions;
- clear local test command tiers.
