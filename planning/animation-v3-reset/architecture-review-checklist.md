# V3 Architecture Review and Readiness Checklist

Status: **planning review contract**

This is the final cross-document review checklist used before major implementation phases, runtime adoption and Reel 1 migration. It does not replace specialized phase checklists; it asks whether the whole architecture still fits together.

## 1. Narrative and source

- [ ] Manuscript remains narrative authority.
- [ ] Relevant ETCSL/other literary relationship identified where applicable.
- [ ] Fictional bridge/composite material labeled honestly.
- [ ] Visual evidence separated from literary provenance.
- [ ] Historical period differences/uncertainty documented.
- [ ] Prominent reconstruction questions have evidence tasks/records.

## 2. Level choice

- [ ] L1/L2/L3 chosen from story need, not package availability.
- [ ] Level 2 does not reveal invented unseen geometry.
- [ ] Level 3 spatial reveal uses approved geometry/depth assumptions.
- [ ] Complexity justified by narrative/readability.
- [ ] Simpler fallback remains possible where useful.

## 3. Time authority

- [ ] Scene V3 integer frame is canonical time.
- [ ] Remotion remains production render authority.
- [ ] Rive/Pixi/Three/Rapier/Spine do not own wall-clock timeline.
- [ ] Any library ticker is disabled/manual/preview-only.
- [ ] Audio/dialogue/caption timing shares frame authority.

## 4. Randomness

- [ ] All production variation is seeded.
- [ ] Semantic-channel derivation isolates unrelated channels.
- [ ] Seed algorithm/version explicit.
- [ ] No `Math.random()`/time-derived animation state in production path.
- [ ] Cross-platform seed fixture expected identical.

## 5. Coordinate/transform ownership

- [ ] Every transform declares coordinate space.
- [ ] Source/output/world/physics axes and units explicit.
- [ ] Pivots/anchors explicit.
- [ ] One runtime owns each root transform.
- [ ] Parent-child hierarchy acyclic.
- [ ] Physics playback does not compete with authored transform.
- [ ] Contact QA compares anchors in shared resolved space.

## 6. Runtime boundaries

### Rive
- [ ] hero local rig/performance only;
- [ ] exact-frame seek proven;
- [ ] source identity/provenance preserved.

### Pixi
- [ ] local mesh/material ownership only;
- [ ] autonomous ticker absent production;
- [ ] deformation bounded.

### Three/R3F
- [ ] world/camera/spatial ownership only;
- [ ] approved geometry/depth;
- [ ] painterly source integration.

### Rapier
- [ ] fixed timestep;
- [ ] deterministic init/construction;
- [ ] canonical output baked/checksummed.

### Theatre
- [ ] authoring only;
- [ ] export/compile to Scene V3;
- [ ] production can run without Studio state.

## 7. Assets

- [ ] Asset class explicit.
- [ ] Semantic ID/revision/hash explicit.
- [ ] Source lineage explicit.
- [ ] Runtime compatibility explicit.
- [ ] Maturity/lifecycle explicit.
- [ ] Debug/proof/candidate cannot resolve production.
- [ ] Absolute local path not canonical identity.
- [ ] Superseded revision remains traceable.

## 8. Character continuity

- [ ] Hero has CharacterDefinition/bible.
- [ ] Costume profile/revision explicit.
- [ ] Rig profile/revision explicit.
- [ ] Semantic channels declared.
- [ ] Contact anchors declared where needed.
- [ ] Voice profile/version explicit for dialogue.
- [ ] Character identity proof fixture exists.

## 9. World/City continuity

- [ ] World/City semantic definition independent from renderer.
- [ ] Development state explicit.
- [ ] Geography/water/major topology persistent.
- [ ] Historical evidence confidence attached to important features.
- [ ] Procedural variation bounded to semantic regions.
- [ ] LOD changes representation, not story truth.

## 10. Audio

- [ ] Audio asset hashes known.
- [ ] Transcript/spoken lines frame-bound.
- [ ] Voice revision tracked.
- [ ] Viseme track bound to exact audio hash.
- [ ] Captions derive from transcript/timing.
- [ ] Mix buses/ducking defined.
- [ ] Clipping/loudness/missing cue QA applicable.
- [ ] Human performance review required for canonical voice changes.

## 11. Cinematography

- [ ] Primary action identified.
- [ ] Camera supports rather than replaces action.
- [ ] Camera-frozen control available for motion benchmark where applicable.
- [ ] Vertical safe framing considered.
- [ ] Motion density not accidentally overloaded.
- [ ] Stillness allowed.
- [ ] Mythic motion has specific narrative role, not generic VFX.

## 12. Lighting/material

- [ ] Editorial art remains visual anchor.
- [ ] Lighting intent/palette profile explicit where relevant.
- [ ] Hybrid runtimes agree on look.
- [ ] Color-space/alpha policy explicit.
- [ ] No missing/fallback debug material accepted.
- [ ] Historical material evidence vs project palette distinguished.

## 13. Scene compilation

- [ ] Structural schema validation.
- [ ] Semantic/reference validation.
- [ ] Source/evidence resolution.
- [ ] Asset resolution/hashes.
- [ ] Runtime/version/capability resolution.
- [ ] Seed resolution.
- [ ] Canonical ordering/serialization.
- [ ] Stable resolved scene hash.
- [ ] Compiler warnings preserved.

## 14. Testing — local first

For applicable code/UI/animation:

- [ ] focused unit/contract tests PASS locally;
- [ ] lint PASS locally;
- [ ] build/types PASS locally;
- [ ] Storybook build/tests PASS locally;
- [ ] Storybook accessibility/interactions PASS locally;
- [ ] applicable E2E PASS locally;
- [ ] fixed-frame visual regression reviewed;
- [ ] motion/render proof PASS locally;
- [ ] semantic QA current;
- [ ] performance budget current;
- [ ] negative fixtures PASS by correctly blocking bad state.

No push merely to discover basic local failures.

## 15. Testing — GitHub Actions second

- [ ] frozen install/workspace check;
- [ ] lint;
- [ ] deterministic unit/contract;
- [ ] build/types;
- [ ] Storybook/browser checks;
- [ ] applicable API/browser E2E;
- [ ] source/provenance validation;
- [ ] receipt/schema verification;
- [ ] cross-platform canonical hash fixture where applicable.

Heavy GPU render/human review remains local/milestone unless explicitly configured.

## 16. Test traceability

- [ ] Capability scorecard lists stable test IDs.
- [ ] Benchmark fixture references test requirements.
- [ ] Storybook proof states share fixture frames.
- [ ] Negative escaped failures retained.
- [ ] Blocking skips visible.
- [ ] Quarantined tests documented.

## 17. Render/output

- [ ] Render profile version explicit.
- [ ] frame count/resolution/fps correct.
- [ ] source/staged/resolved asset hashes match.
- [ ] debug overlays disabled production.
- [ ] color/alpha/codec profile valid.
- [ ] audio/caption timing valid.
- [ ] output nonzero/complete/hash recorded.
- [ ] proof frames extracted by exact frame identity.

## 18. QA

- [ ] Engine internal state not sole proof.
- [ ] Final rendered semantics tested.
- [ ] Structural measurable claims use deterministic checks.
- [ ] Semantic vision QA used only where appropriate.
- [ ] Human normal-speed review required for visual promotion.
- [ ] Threshold changes preserve negative regression and rationale.

## 19. Promotion

- [ ] Candidate exact bytes immutable after review.
- [ ] QA receipt current.
- [ ] Human receipt current.
- [ ] Scene/source/runtime/bake not stale.
- [ ] Target revision explicit.
- [ ] Confirmation deliberate.
- [ ] Transaction verifies destination hash.
- [ ] Receipt written.
- [ ] Old canonical remains traceable/superseded.
- [ ] Rollback/recovery behavior known.

## 20. Accessibility

- [ ] Studio core workflow keyboard-operable.
- [ ] focus/status semantics correct.
- [ ] no color-only QA state.
- [ ] reduced-motion preview policy tested.
- [ ] captions safe/readable where used.
- [ ] motion-safety metadata/review for intense effects.
- [ ] manual AT milestone scheduled for consequential Studio changes.

## 21. Performance/operability

- [ ] Preview iteration practical.
- [ ] Proof render within planned budget.
- [ ] VRAM/RAM/concurrency observed.
- [ ] Crowd/city LOD within budget.
- [ ] Optional AI/service failure does not block unrelated foundation tests.
- [ ] storage/disk growth understood.
- [ ] caches invalidate from semantic inputs correctly.

## 22. Security/license

- [ ] Dependency license reviewed.
- [ ] exact versions pinned as required.
- [ ] security audit policy satisfied.
- [ ] no secrets in scene/receipts/logs.
- [ ] museum/source redistribution rights respected.
- [ ] proprietary runtime/editor constraints documented.

## 23. Diagnostics

- [ ] Failure class identifiable.
- [ ] scene/asset/runtime/frame/seed IDs printed.
- [ ] source→candidate→staged→resolved trace available.
- [ ] proof/receipt bundle compact.
- [ ] no need to reconstruct root cause from random temp filenames.

## 24. Storage/retention

- [ ] canonical data durable;
- [ ] evidence receipts durable;
- [ ] temp artifacts deletable;
- [ ] release manifest contains no `tmp/` dependency;
- [ ] cleanup cannot delete canonical roots;
- [ ] large external artifacts remain hash/reproduction bound.

## 25. Migration

- [ ] V2 baseline reproducible.
- [ ] same editorial source compared.
- [ ] V3 does not silently invent new source state.
- [ ] A/B proof exists.
- [ ] meaningful improvement demonstrated.
- [ ] rollback to V2 possible before promotion.
- [ ] migration receipt links old/new.

## 26. Architecture stop signs

Stop and reopen planning if any answer is yes:

- Does more than one system own the same time/transform?
- Does final render disagree with Storybook/internal state?
- Is a test being weakened solely to make current output green?
- Is AI/debug output entering canonical path without explicit promotion?
- Is a historical interpretation being presented as fact without support?
- Does the runtime require hidden mutable editor state to reproduce output?
- Is cross-platform canonical meaning different?
- Is performance so poor that normal iteration is impractical?
- Can an old human approval apply to changed bytes?

## 27. Phase review record

At each major phase boundary, create a compact review record:

```text
phase
commit
planning docs/ADR versions
local gate summary
CI gate summary
benchmark/receipt summary
open risks
deferred items
GO / GO_WITH_CONSTRAINTS / HOLD
```

## 28. Definition of architecture readiness

V3 is ready to advance when the architecture still tells one coherent story from manuscript to pixels: sources are honest, time and transforms have one owner, engines are bounded, tests share fixtures, local quality precedes CI, final renders are independently proven, humans approve the actual output, and canonical history remains reproducible.
