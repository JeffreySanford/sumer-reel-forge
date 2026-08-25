# Planning Definition of Ready and Definition of Done

Status: **planning governance contract**

The reset intentionally plans more deeply than a prototype. This document defines when planning is sufficiently complete to authorize implementation, and when implementation is sufficiently verified to advance phases.

## 1. Why this exists

Without an explicit Definition of Ready, “planning complete” can mean either:

- we have a general idea; or
- every important boundary/test/risk has been considered.

For V3, implementation begins only when the relevant capability is ready enough that coding does not have to invent core product/architecture/test behavior during debugging.

## 2. Universal Definition of Ready — capability

Before implementing a reusable capability, we know:

- manuscript/narrative need;
- target L2/L3 behavior;
- owning subsystem/runtime;
- what that subsystem explicitly does not own;
- Scene V3 contract touchpoints;
- asset/source inputs;
- provenance requirements;
- stable IDs/versioning;
- benchmark fixture;
- named proof states;
- positive acceptance criteria;
- negative regression cases;
- unit tests;
- Storybook stories/interactions;
- visual regression states where applicable;
- motion/render proof where applicable;
- E2E workflow;
- accessibility/reduced-motion obligations;
- performance budget;
- diagnostics/observability;
- license/security checkpoint;
- rollback/fallback;
- local-first commands;
- GitHub Actions re-check mapping;
- human acceptance criteria where visual.

If several of these are genuinely N/A, mark them explicitly.

## 3. Definition of Ready — Phase 1 source/provenance slice

Required before implementing a source record/UI slice:

```text
source/evidence type
stable ID
required metadata
adaptation/evidence relationship vocabulary
validation/warning rules
staleness behavior
Studio component state
Storybook stories
unit tests
E2E inspection path
accessibility behavior
```

Phase 1 first registry slice already demonstrated local test/build green; subsequent UI/evidence slices inherit this standard.

## 4. Definition of Ready — Phase 2 foundation PR

### Contracts PR

Ready when:

- public types named;
- dependency direction accepted;
- example Scene V3 can be represented;
- valid + invalid fixture inventory specified;
- lint/test/build commands known;
- no engine dependency required.

### Frame kernel PR

Ready when:

- integer frame semantics accepted;
- interval endpoints accepted;
- progress semantics accepted;
- semantic seed input fields accepted;
- cross-platform determinism test specified;
- wall-clock/random negative rules specified.

### Runtime registry PR

Ready when:

- adapter lifecycle accepted;
- capability vocabulary accepted;
- fake/failure adapter behaviors listed;
- dispose/error semantics specified.

### Scene compiler PR

Ready when:

- compiler stages/order accepted;
- canonical serialization rules accepted;
- resolved scene example accepted;
- hash portability rules accepted;
- warnings vs blockers specified.

## 5. Definition of Ready — runtime spike

Before `spike/rive-*`, `spike/pixi-*`, etc.:

- exact manuscript-derived benchmark chosen;
- package/version candidate identified;
- license review question list prepared;
- exact-frame integration plan identified;
- Storybook proof state list specified;
- Remotion proof requirement specified;
- negative fixtures specified;
- expected performance measurement specified;
- KEEP/CONSTRAIN/DEFER/REJECT decision criteria written.

Do not install first and decide purpose later.

## 6. Definition of Ready — scene migration

Before migrating a Reel 1 V2 shot:

- current canonical baseline hash known;
- V2 render/proof still reproducible;
- target V3 capability scorecards ready;
- source/provenance bindings current;
- Scene V3 draft resolves;
- A/B comparison plan exists;
- rollback path is explicit;
- shot-specific QA/human criteria exist.

## 7. Universal local Definition of Done — code slice

A code slice is locally done when applicable:

```text
unit PASS
lint PASS
build/types PASS
Storybook build/tests PASS
E2E PASS
visual golden reviewed
motion/render proof PASS
semantic QA PASS
performance budget PASS
human review PASS
```

Not all apply to pure libraries; applicability is defined before implementation.

## 8. Repository Definition of Done — code slice

Local green is necessary but not enough for merge/repository completion.

Repository done additionally requires:

- coherent diff reviewed;
- GitHub Actions required deterministic jobs green;
- receipts current where local visual proof is required;
- no intentionally skipped blocking test;
- docs/ADRs updated for changed contract;
- no unresolved high-severity regression.

## 9. Definition of Done — documentation-only change

Documentation-only planning work:

- links resolve conceptually/path exists;
- terminology consistent with existing contracts;
- no contradictory ownership/timing rule introduced;
- planning index updated for major document;
- no claim that executable tests ran merely because Markdown changed.

Full animation test suites are unnecessary for docs-only commits.

## 10. Definition of Done — benchmark fixture

- stable fixture ID/version;
- narrative/source binding;
- scene/asset inputs;
- proof states;
- controls;
- positive acceptance;
- negative mutations;
- test layer requirements;
- performance budget where relevant;
- human criteria where relevant;
- Storybook mapping;
- E2E mapping.

## 11. Definition of Done — runtime capability

Production-ready only when:

- scorecard blocking rows PASS;
- exact-frame authority proven;
- final rendered semantics proven;
- negative fixture(s) proven;
- diagnostics useful;
- license/security decision recorded;
- benchmark performance practical;
- human benchmark accepted where visual;
- adoption ADR updated.

## 12. Definition of Done — Scene V3 foundation

Phase 2 exits only when:

- contracts/frame/runtime/scene/fixtures libraries green locally;
- same semantic seed/hash results Windows and Linux expected fixture;
- fake adapter proves deterministic named proof states;
- failure adapter proves diagnostics;
- resolved scene hash stable;
- V2 compatibility fixture preserves timing/assets;
- GitHub deterministic Phase 2 gate green;
- no real engine dependency was needed to make foundation work.

## 13. Definition of Done — Animation Lab foundation

- exact frame/fps/seed controls;
- proof-state selector;
- fake adapter stories;
- Storybook browser tests;
- fixed-frame visual test;
- shared fixture identity proven across unit/Storybook;
- reduced-motion behavior;
- failure diagnostics story;
- local then GitHub browser gates green.

## 14. Definition of Done — visual promotion

No visual asset/scene promotion until:

```text
candidate/source integrity
+ deterministic QA
+ staged/resolved exact-byte binding
+ final rendered proof
+ semantic QA where applicable
+ normal-speed human review
+ promotion preflight
```

A package/runtime saying the internal state is correct is insufficient.

## 15. Definition of Done — phase

A phase is complete when:

- all mandatory deliverables exist;
- phase exit checklist satisfied;
- all required capability scorecards ready;
- local phase gate green;
- GitHub required deterministic gate green;
- render/human receipts current where required;
- docs/backlog updated;
- known deferred work explicitly recorded rather than forgotten.

## 16. Stop-the-line conditions

Implementation pauses and planning/ADR reopens if:

- two runtimes both need ownership of same transform/time authority;
- exact-frame determinism cannot be achieved;
- Storybook state and final render disagree;
- canonical hash differs cross-platform without explained nonsemantic reason;
- package licensing is incompatible;
- runtime requires hidden mutable editor state;
- negative fixture passes when it should block;
- visual system repeatedly requires threshold gaming;
- iteration/render cost exceeds budget enough to make workflow impractical;
- historical provenance cannot honestly represent the proposed reconstruction.

## 17. Planning debt

Planning debt is allowed but named.

Use labels such as:

```text
OPEN_DECISION
DEFERRED_RESEARCH
RUNTIME_SPIKE_REQUIRED
VISUAL_EVIDENCE_REQUIRED
PERFORMANCE_UNKNOWN
LICENSE_UNKNOWN
```

No vague `TODO later` for decisions that can block architecture.

## 18. Decision review cadence

Revisit planning when:

- a phase starts;
- a runtime spike concludes;
- an escaped failure occurs;
- a major dependency upgrades;
- a chapter introduces a genuinely new recurring capability;
- Reel migration reveals conflict between abstract plan and real assets.

Do not continuously rewrite architecture without evidence.

## 19. Planning completeness dashboard

A future status report can summarize:

```text
Phase 0 planning docs       COMPLETE
Phase 1 registry            IN_PROGRESS / local green first slice
Phase 1 visual evidence     PLANNED
Phase 1 Studio provenance   PLANNED
Phase 2 contracts           READY_TO_IMPLEMENT
Phase 2 frame kernel        READY_TO_IMPLEMENT
Runtime spikes              PLANNED, NOT_STARTED
Reel 1 migration            BLOCKED BY FOUNDATION
```

This makes deliberate blocking visible as progress, not inactivity.

## 20. Definition of successful excessive planning

Planning has succeeded when implementation can fail for genuine technical reasons—library limitations, performance, visual quality—without failing because we forgot to decide who owns time, how it is tested, how provenance works, what “done” means, or how to recover from failure.
