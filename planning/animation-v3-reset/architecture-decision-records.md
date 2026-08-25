# Animation V3 Architecture Decision Records

Status: **planning contract**

These ADRs capture decisions that should remain stable while the Level 2/3 reset is implemented. They exist so future code can explain *why* a boundary exists instead of merely encoding it accidentally.

Decision status vocabulary:

- **Accepted** — default architecture; code should follow it unless a replacement ADR is approved.
- **Trial** — bounded implementation spike required before adoption.
- **Deferred** — intentionally not part of the current critical path.
- **Superseded** — replaced by a later ADR; retained for history.

## ADR-001 — Remotion remains production frame authority

**Status:** Accepted

Scene V3 and Remotion own production time. Rive, Pixi, Three, Rapier, Spine, Theatre and AI adapters may evaluate state, but none may own the story clock.

Consequences:

- every runtime accepts explicit frame/time input;
- autonomous runtime playback is disabled or bypassed for production;
- Storybook playback is convenience only; exact-frame evaluation is canonical;
- production evidence can bind to exact frames.

Tests:

- unit: frame-to-time conversion;
- Storybook: exact-frame controls;
- render proof: requested proof frame equals rendered frame;
- E2E: Studio scrubber and rendered proof agree.

## ADR-002 — Integer frame is canonical time

**Status:** Accepted

The canonical timeline coordinate is an integer frame. Seconds are derived as `frame / fps`.

Why:

- avoids floating-point drift across runtimes;
- maps directly to Remotion output;
- makes proof states and receipts unambiguous.

Rules:

- no persisted wall-clock timestamps for animation state;
- fractional frame calculations are internal only;
- clip boundaries are inclusive/exclusive by contract and tested.

## ADR-003 — Randomness is semantic-channel-derived

**Status:** Accepted

Random variation must be derived from stable semantic identity rather than one mutable global PRNG stream.

Conceptually:

`seed(sceneSeed, targetId, channelId, purpose)`

Examples:

- `seed(scene42, enki, blink, timing)`
- `seed(scene42, worker17, dig, phase)`
- `seed(scene42, reeds03, sway, amplitude)`

This prevents adding one unrelated random request from changing all later animation.

Tests:

- same semantic channel => same value;
- unrelated channel added => existing values unchanged;
- different scene seed => expected variation.

## ADR-004 — Scene V2 remains a supported compatibility source

**Status:** Accepted

V2 is not deleted or bulk-migrated. A compatibility adapter resolves V2 into V3-compatible runtime state.

Rules:

- V2 timing and asset checksums remain authoritative until a shot is deliberately promoted to V3;
- V2 and V3 can render A/B from the same editorial source;
- rollback to V2 remains possible until V3 promotion is accepted.

## ADR-005 — Rive is the default hero-character rig runtime

**Status:** Trial → expected default

Rive is the first hero-character system evaluated for Enki, Enlil, Sud, Nisaba, Ninhursag and other principal performers.

Rive owns:

- facial deformation;
- blink/gaze;
- breath;
- body joints;
- authored gestures;
- local cloth/hair deformation when appropriate.

Rive does not own:

- world placement;
- production timing;
- physics;
- source provenance;
- promotion decisions.

Adoption gate:

- Enki blink/gaze/breath proof;
- source-faithful identity at canonical proof frames;
- deterministic explicit-frame evaluation;
- Storybook browser story;
- rendered Remotion motion proof;
- human preference over V2 workaround.

## ADR-006 — PixiJS owns 2D material/deformation primitives

**Status:** Trial → expected default

PixiJS is the preferred Level 2 material runtime for water, reeds, ropes, rigging, cloth, local distortion, particles and mesh deformation.

Pixi does not own actor skeletal performance or world camera placement.

Adoption gate:

- water proof;
- rope/rigging proof;
- deterministic frame evaluation;
- no autonomous ticker dependency in production;
- browser/WebGL compatibility test.

## ADR-007 — Three/R3F owns spatial world and camera

**Status:** Trial → expected default

Three.js + React Three Fiber + `@remotion/three` own Level 3 world placement, perspective camera, depth cards, architecture, terrain, fog, spatial particles and instancing.

Boundary:

- Rive/Pixi produce local visual state;
- Three places it in space;
- Remotion supplies frame authority.

## ADR-008 — Physics is fixed-step and baked before canonical promotion

**Status:** Accepted

Rapier may be used for physical secondary motion, but approved production simulations are fixed-step and baked/checksummed.

Required receipt fields:

- runtime version;
- timestep;
- scene seed;
- construction-order hash;
- initial-state hash;
- frame count;
- baked-state hash.

No variable-timestep production physics.

## ADR-009 — Theatre.js is authoring-only

**Status:** Accepted

Theatre may author camera/light/object tracks. Production renders consume exported, validated Scene V3 data.

No hidden Theatre project state may be required to reproduce a promoted render.

## ADR-010 — Spine is optional and benchmark-driven

**Status:** Deferred trial

Spine is evaluated only if Rive or native instancing cannot economically support Chapter 2/3 animal herds and repeated non-hero rigs.

Primary benchmark: marriage herd procession.

No Spine dependency enters production solely because it is feature-rich.

## ADR-011 — Live2D remains an optional specialist adapter

**Status:** Deferred

Live2D may be evaluated if portrait/dialogue closeups dominate future chapters. It is not a foundation dependency for V3.

## ADR-012 — AI output is candidate or baked specialty output only

**Status:** Accepted

ComfyUI and future I2V systems may generate:

- segmentation;
- repair;
- source extension;
- textures;
- atmosphere;
- difficult one-off motion candidates.

They may not automatically replace canonical identity, own the timeline, grade themselves as sufficient evidence, or promote output.

## ADR-013 — Literary provenance and visual evidence are separate domains

**Status:** Accepted

ETCSL and other ancient literary traditions answer **what textual/mythic tradition inspired this narrative**.

Museum/archaeological evidence answers **what visual/material evidence informs reconstruction**.

Neither silently substitutes for the other.

## ADR-014 — Historical-fiction revision reclassifies provenance rather than deleting it

**Status:** Accepted

The manuscript may be revised for pacing, characterization, chronology, humor, clarity or production feasibility.

When revision changes source relationship:

- update narrative revision;
- update source binding;
- reclassify adaptation (`direct-source`, `close-paraphrase`, `composite-adaptation`, `fictional-bridge`, etc.);
- retain previous provenance history where appropriate.

## ADR-015 — Storybook exact-frame fixtures are first-class production fixtures

**Status:** Accepted

Animation stories are not decorative demos. Their named proof states are shared fixtures for:

- unit expectations;
- Storybook rendering;
- screenshot regression;
- motion-proof extraction;
- QA overlays.

Examples:

Blink: OPEN → CLOSING → CLOSED → OPENING → RETURNED_OPEN.

Boat: NEUTRAL → ROLL_LEFT → CENTER → ROLL_RIGHT → SETTLE.

## ADR-016 — Local-first verification is mandatory

**Status:** Accepted

A developer does not push a change merely to discover whether basic tests fail in GitHub Actions.

Before push, run the required local gate for the affected subsystem. Before merge/promotion, run the full local phase gate.

GitHub Actions is an independent re-check, not the primary debugging environment.

## ADR-017 — GitHub Actions re-checks deterministic quality gates

**Status:** Accepted

Every merge-worthy change must be independently checked in GitHub Actions for applicable:

- workspace consistency;
- lint;
- types/build;
- unit tests;
- Storybook build/tests;
- API E2E;
- browser E2E.

Expensive GPU/rendered animation proofs remain local/manual unless a milestone workflow explicitly opts in.

## ADR-018 — Final rendered semantics must be tested

**Status:** Accepted

Passing source asset QA is insufficient. A motion feature is not accepted until the actual rendered video demonstrates the intended semantic action.

The Shot 3 cyan-eye incident is the reference failure mode.

Required layers for semantic motion:

1. source/candidate proof;
2. exact staged asset binding;
3. exact composition resolution binding;
4. rendered frame/motion proof;
5. semantic QA where needed;
6. human normal-speed review.

## ADR-019 — No hidden wall-clock animation

**Status:** Accepted

No production runtime may depend on elapsed real time, browser scheduling, animation ticker order or nondeterministic RAF timing.

Any library ticker must be disabled, manually advanced or treated as preview-only.

## ADR-020 — Runtime versions are evidence-bound

**Status:** Accepted

A promoted render receipt records versions of any runtime capable of affecting visual state.

At minimum when used:

- Remotion;
- Rive runtime;
- PixiJS;
- Three/R3F;
- Rapier;
- Spine runtime;
- relevant model/workflow versions for generative bakes.

Upgrades require benchmark replay before canonical adoption.

## ADR-021 — Human visual approval remains the final publication gate

**Status:** Accepted

Deterministic and AI QA can block. They cannot publish.

Human review verifies:

- semantic readability;
- source identity;
- natural motion;
- artistic preference;
- historical-fiction tone;
- absence of distracting artifacts.

## ADR-022 — Performance budgets are contracts, not aspirations

**Status:** Accepted

Each subsystem receives preview and production budgets for memory, render time, instance counts and proof duration.

A technology that produces beautiful output but makes iterative development impractical fails the adoption gate unless reserved for selective use.

## ADR-023 — Promotion binds exact bytes

**Status:** Accepted

Candidate source, staged bytes, resolved scene asset and promoted canonical asset must be checksum-bound.

No filename-only promotion.

No mutable external URL as canonical identity.

## ADR-024 — Technology adoption is benchmark-driven

**Status:** Accepted

No package is adopted because of a feature list alone.

Every dependency must answer a manuscript-derived benchmark:

- Rive → Enki facial performance;
- Pixi → water/rigging;
- Three/R3F → Stag spatial scene;
- Rapier → Kutu hail/boat response;
- Spine → marriage herd if needed;
- Theatre → camera-authoring round trip.

## ADR-025 — Browser visual goldens use one pinned environment

**Status:** Accepted

Pixel goldens are generated/validated only in one pinned Chromium environment. Firefox/WebKit remain functional compatibility checks, not independent golden-image authorities.

This avoids normal cross-platform antialiasing differences masquerading as regressions.

## ADR-026 — Browser E2E and Storybook are required locally before CI for affected UI work

**Status:** Accepted

For changes that affect Studio or Animation Lab behavior:

- local unit tests;
- local Storybook build/test;
- local browser E2E;
- local lint/build;

must pass before push.

GitHub Actions then repeats the same deterministic categories in Linux.

## ADR-027 — Render-heavy proof receipts may be validated in CI instead of re-rendered

**Status:** Accepted

To conserve Actions minutes and avoid GPU assumptions, milestone/local rendered proofs produce compact receipts containing hashes, runtime versions, proof frames and QA results.

CI validates receipt schema, source hashes and code-side contracts. It does not pretend to reproduce GPU-heavy local rendering unless a dedicated milestone runner is explicitly configured.

## ADR-028 — Negative fixtures are mandatory for every acceptance gate

**Status:** Accepted

Every gate must prove it can reject at least one representative bad case.

Examples:

- open eyes rejected as blink;
- cyan patch rejected as eyelid;
- camera-only motion rejected as actor articulation;
- synchronized crowd rejected as natural variation;
- variable-timestep physics rejected;
- mislabeled non-ETCSL source rejected.

A gate with only positive fixtures is not considered mature.

## ADR-029 — Phase exits require local green plus Actions green

**Status:** Accepted

A phase can be locally complete but is not repository-complete until its deterministic GitHub Actions checks are green.

Human-only and GPU-heavy evidence remains separately recorded.

Phase exit status therefore records:

- `LOCAL_GREEN`;
- `CI_GREEN`;
- `RENDER_PROOF_GREEN` when applicable;
- `HUMAN_APPROVED` when applicable.

## ADR-030 — Planning documents are versioned production architecture

**Status:** Accepted

These documents are not throwaway notes. If implementation intentionally diverges from an accepted ADR, the plan must be updated or superseded explicitly.

This keeps planning and code from silently drifting apart.
