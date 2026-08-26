# PixiJS Adoption Record

Status: **CONSTRAIN — foundation preview only, local adoption proof green**

Recorded: 2026-08-26

## Problem / benchmark

Animation Lab needs its first real visual-engine surface without allowing a child engine to own story time. The benchmark is the existing golden Enki-at-the-Helm Scene V3 fixture at exact frames `0`, `101`, and `209`, including authored parent composition (`actor-instance:enki:s03 -> prop:stag-of-absu`).

The no-dependency alternative is the existing SVG diagnostic renderer. It remains available as the deterministic fallback/reference path, but it does not exercise a real visual engine lifecycle or WebGL renderer.

## Package authority and license

- package: `pixi.js`
- exact version: `8.20.0`
- package source: official PixiJS npm package
- project/docs: `https://pixijs.com/`
- repository: `https://github.com/pixijs/pixijs`
- runtime license: MIT
- commercial/publication implication at this foundation boundary: no editor/export license is required for the PixiJS runtime itself; normal third-party attribution/license retention policy still applies.

Do not substitute the deprecated `pixijs` package or a lookalike package.

## Boundary decision

Third-party imports are owned by:

```text
libs/animation-pixi
```

The React Animation Lab imports only `@sumer-reel-forge/animation-pixi` contracts. A boundary test rejects direct `pixi.js` imports from sibling libraries or applications.

## Time / determinism policy

Pixi is a renderer, not a clock:

- `autoStart: false`;
- `sharedTicker: false`;
- application ticker explicitly stopped after initialization;
- no `requestAnimationFrame` loop in the adapter;
- one explicit renderer pass per immutable exact-frame plan;
- Scene V3 / resolved runtime state remains authoritative;
- Remotion remains production frame/render authority.

## Compatibility

- React compatibility: framework-neutral adapter; no React Pixi binding is adopted.
- Animation Lab integration: React mounts/destroys a `PixiPreviewSurface` and submits immutable exact-frame plans.
- Remotion compatibility: Pixi is preview-only in this slice and is not imported into the production Remotion renderer.
- WebGL is the requested Pixi renderer preference for this benchmark.

## Verified local evidence

Verified on 2026-08-26 after installing the exact dependency with pnpm:

- `pixi.js@8.20.0` is pinned in `package.json` and `pnpm-lock.yaml`;
- `pnpm audit --prod --audit-level high` reported no known vulnerabilities;
- `animation-pixi` unit/boundary tests: 4/4 passed;
- Animation Lab tests: 20/20 passed;
- Animation Lab production build passed;
- Animation Lab ESLint passed with no warnings after the Pixi host-cleanup fix;
- Storybook production build passed;
- Playwright Pixi E2E passed in Chromium, Firefox and WebKit (3/3);
- Scene V3 integration tests passed 10/10, with build and lint green;
- workspace consistency passed;
- full workspace lint passed across 14 projects;
- full workspace build passed across 12 projects;
- full workspace test target passed across 12 projects;
- measured Animation Lab Pixi library chunk: approximately 467.72 kB minified / 132.82 kB gzip.

Nx continued to report the pre-existing `api:build` / `api:test` flaky-task classifications; those targets succeeded in this verification run.

## Adoption checklist

- [x] exact problem/benchmark named
- [x] alternative/no-dependency option considered
- [x] official package/repository authority identified
- [x] runtime license reviewed as MIT
- [x] commercial/publication implications separated from editor/export licensing
- [x] exact version recorded (`8.20.0`)
- [x] React/Remotion boundary checked architecturally
- [x] pnpm lockfile diff generated and reviewed locally
- [x] production security audit green after install
- [x] bundle/runtime size measured after production build
- [x] Storybook proof built with installed dependency
- [x] browser E2E green in Chromium / Firefox / WebKit
- [x] adapter/unit tests green with installed dependency
- [x] uninstall/reject path documented
- [x] ADR/adoption status set to CONSTRAIN

A production-rendering promotion of Pixi requires a separate proof and acceptance update. This record does not promote Pixi from Animation Lab preview into canonical Remotion output.

## Uninstall / reject path

Remove `libs/animation-pixi`, its workspace alias and the `pixi.js` dependency, then select the existing diagnostic renderer in Animation Lab. Scene V3, animation inspection, runtime evaluation and exact-frame controls require no changes.
