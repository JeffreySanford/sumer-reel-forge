# animation-inspection

Deterministic, runtime-independent view models for the Animation Lab and Studio inspection surfaces.

Responsibilities:

- exact-frame navigation semantics;
- named proof-state selection;
- semantic hierarchy extraction from resolved Scene V3 data;
- provenance and visual-evidence summaries;
- QA contract presentation without inventing pass state;
- copyable runtime/asset/seed diagnostics.

This library intentionally does not import React, Angular, Remotion, Rive, Pixi, Three or browser APIs. It consumes a structural shape compatible with `ResolvedSceneV3`, keeping UI components isolated from compiler/runtime internals.

`NOT_RUN` is the default QA presentation state when a resolved scene contains only the QA contract. Evidence/results must be supplied by a later evidence layer before a gate may be shown as PASS, BLOCKING, REVIEW_REQUIRED or STALE.
