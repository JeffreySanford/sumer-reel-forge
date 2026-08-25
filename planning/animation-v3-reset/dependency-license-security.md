# V3 Dependency, Licensing and Supply-Chain Plan

Status: **planning contract**

The V3 reset deliberately introduces multiple specialist animation packages. That increases capability and also creates licensing, versioning, supply-chain and maintenance risk. Dependencies therefore enter through a recorded adoption gate rather than an ad hoc `pnpm add`.

## 1. Dependency classes

### Core runtime

Expected to affect canonical rendering directly:

- Remotion;
- Rive runtime if adopted;
- PixiJS;
- Three.js / React Three Fiber / `@remotion/three`;
- Rapier.

Core runtimes receive strict version/evidence controls.

### Optional specialist

- Spine;
- Live2D;
- Theatre.js authoring tools.

These may remain isolated adapters or development-only dependencies.

### Tool/generative

- ComfyUI ecosystem;
- local model runtimes;
- TTS systems;
- image/video model workflows.

Generated output is baked/candidate output and records model/workflow provenance.

## 2. Adoption checklist

Before a dependency becomes part of a foundation phase:

```text
[ ] exact problem/benchmark named
[ ] alternative/no-dependency option considered
[ ] package/repository authority verified
[ ] license reviewed
[ ] commercial/publication implications understood
[ ] editor/export license separated from runtime license
[ ] current version recorded
[ ] React/Remotion compatibility checked
[ ] lockfile diff reviewed
[ ] production security audit green
[ ] bundle/runtime size measured
[ ] Storybook proof built
[ ] Remotion proof built when rendering affected
[ ] unit/adapter tests green
[ ] uninstall/reject path documented
[ ] ADR status updated KEEP / CONSTRAIN / REJECT
```

## 3. Version policy

### Exact versions required where rendering compatibility depends on lockstep

Examples:

- Remotion and `@remotion/*` packages;
- runtime/editor pairs where vendor requires synchronization;
- physics runtime when baked determinism evidence depends on exact version.

### Range versions acceptable only when visual output is not directly version-sensitive

Even then the lockfile remains canonical for builds.

## 4. Runtime version receipt

Canonical proof receipts include:

```ts
interface RuntimeVersionReceipt {
  remotion: string;
  rive?: string;
  pixi?: string;
  three?: string;
  reactThreeFiber?: string;
  remotionThree?: string;
  rapier?: string;
  spine?: string;
}
```

A version change marks old benchmark receipts stale for upgrade acceptance purposes.

## 5. Rive licensing checkpoint

Before hero-character production lock-in, record separately:

- runtime code license;
- editor/tool plan requirements;
- `.riv` export/publication implications;
- team/user licensing assumptions;
- whether generated assets can be stored in the repository as intended.

Do not confuse an open runtime repository with editor/export commercial terms.

## 6. Spine licensing checkpoint

If the herd benchmark reaches the Spine trial:

- document editor license requirement;
- document runtime license terms;
- document version compatibility requirements;
- verify publication/distribution terms;
- compare total cost/complexity with Rive/native alternative.

No Spine canonical asset until this record is accepted.

## 7. Live2D checkpoint

If evaluated:

- separate proprietary Core/runtime licensing from editor use;
- record publication terms;
- keep adapter optional;
- ensure Scene V3 actor contract remains portable.

## 8. Theatre.js policy

Theatre is authoring-only by ADR.

Production package should not need the Studio authoring interface if exported Scene V3 tracks are sufficient.

Bundle tests should prove production render does not accidentally pull editor tooling.

## 9. Supply-chain controls

Existing/future CI should include:

- frozen lockfile install;
- production dependency audit;
- workspace dependency consistency;
- package-lock/pnpm-lock review;
- no unpinned remote scripts in production pipeline;
- checksums for downloaded model/runtime binaries where practical.

## 10. Package source policy

Prefer:

- official package names;
- official vendor repositories/documentation;
- actively maintained runtimes;
- clear license.

Avoid adopting lookalike/abandoned packages solely because of easier examples.

## 11. Dependency boundary tests

Each adapter library should own the third-party import.

Examples:

```text
animation-rive     imports Rive runtime
animation-pixi     imports Pixi
animation-three    imports Three/R3F
animation-physics  imports Rapier
```

Other libraries consume adapter contracts rather than importing engine internals directly.

Potential lint boundary:

- forbid Rive imports outside `animation-rive`;
- forbid Pixi imports outside `animation-pixi` except explicitly approved bridge package;
- forbid Rapier imports outside physics package;
- forbid Theatre authoring imports from production rendering package.

## 12. Dependency update process

Do not mix routine engine upgrades with unrelated feature work.

Upgrade branch:

```text
chore/upgrade-rive-x
chore/upgrade-pixi-x
chore/upgrade-remotion-x
```

Required locally:

- install/audit;
- lint;
- unit;
- Storybook build/tests;
- relevant visual goldens;
- relevant rendered benchmark;
- E2E;
- human A/B if output changes.

GitHub repeats deterministic suite.

Then update runtime version receipt expectations and ADR/adoption record.

## 13. Remotion lockstep rule

All `@remotion/*` packages must remain compatible with the installed `remotion` version according to official package guidance.

Add workspace consistency validation so mismatched versions fail before rendering.

## 14. Model dependency policy

Local model files are not normal npm dependencies.

For every model/workflow used to create canonical baked output record:

```text
model name
model checksum/version if available
workflow checksum
node/plugin versions where material
prompt hash
seed
source hashes
output hash
```

The final approved baked output is canonical; regeneration is not assumed bit-identical unless proven.

## 15. ComfyUI custom-node policy

New custom nodes require:

- repository/source review;
- license check;
- version/commit recorded;
- minimal security review;
- bounded workflow use;
- no auto-update in production pipeline.

Prefer core nodes or already-managed dependencies when possible.

## 16. Browser/WASM dependencies

Rive/Rapier and other WASM-based runtimes require explicit handling of:

- asset loading path;
- browser CSP/build behavior;
- Node/Remotion render compatibility;
- caching;
- versioned WASM bytes.

Tests must prove both Storybook/browser and Remotion render environments use the intended runtime assets.

## 17. Security regression gate

Dependency PRs must run locally and in CI:

```text
workspace check
security audit
lint
unit
build
Storybook
E2E
```

Runtime-changing PRs additionally run local render benchmarks.

## 18. Secrets policy

No runtime package or historical-source tooling should require secrets for ordinary deterministic build/test.

If a future hosted AI service is added:

- connector/secret access isolated;
- tests use mocks;
- no secret in render receipt;
- no secret in client bundle;
- no automatic production dependency on external hosted AI when local/baked output is sufficient.

## 19. Dependency rejection criteria

Reject or constrain a package when:

- licensing is unclear/incompatible;
- it requires wall-clock ownership we cannot reliably control;
- Storybook and Remotion cannot reproduce equivalent states;
- integration exceeds performance budget;
- it duplicates another runtime without benchmark benefit;
- package maintenance/security state is unacceptable;
- output quality does not beat simpler existing approach.

## 20. Dependency inventory deliverable

Create later a machine-readable registry such as:

```json
{
  "runtime": "pixi",
  "package": "pixi.js",
  "version": "...",
  "status": "accepted",
  "benchmark": "water-rigging",
  "licenseReview": "planning/...",
  "visualBaselineRevision": "..."
}
```

CI can validate that constrained production runtimes have a registry entry.
