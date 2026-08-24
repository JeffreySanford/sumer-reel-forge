# Sprint 006 Retrospective - Reel 1 Level 1

Date: 2026-08-24

## Outcome

Sprint 006 succeeded as a **production-pipeline and source-preservation milestone**, but it did not meet its original publication-motion quality target.

The resulting Reel 1 is now designated the **Level 1 canonical animation baseline**.

Level 1 proves that Sumer Reel Forge can safely build, review, promote, assemble, narrate, audit, and deliver a complete 60-second reel from approved assets. Human full-reel review also found that the visual result still reads primarily as still artwork with minor camera, environmental, and material animation.

That distinction is important: the infrastructure worked; the motion vocabulary remained too conservative.

## What Sprint 006 Proved

The Reel 1 work now demonstrates:

- immutable `editorial-v1` source policy;
- versioned `animation-v1` asset manifests;
- candidate generation outside canonical production paths;
- structural QA for dimensions, alpha, provenance, and source preservation;
- layered Scene V2 benchmark rendering;
- contained-material and motion QA;
- evidence-aware local vision review with deterministic reconciliation;
- explicit human approval and promotion;
- checksum-bearing canonical assets;
- eight approved Reel 1 shots;
- canonical full-reel Scene V2 assembly;
- exact 1080x1920, 30 fps, 1800-frame / 60-second output;
- an explicit 30-frame Shot 5 -> Shot 6 editorial handoff without retiming approved shots;
- shot-aligned Chatterbox narration cues spread across the reel;
- a continuous ambience bed and final title hold;
- worker/API routing that distinguishes the canonical animation pipeline from the older editorial/procedural paths.

## What The Full Reel Revealed

Individual benchmark and QA passes did not guarantee a strong full-reel animation read.

The full-film review identified the central Level 1 limitation:

> The reel is visually coherent and technically successful, but most shots still feel like still paintings with subtle movement rather than living animated scenes.

The current renderer often moves a whole approved layer by only a few pixels, adds a slow camera transform, or animates a material effect with deliberately small amplitude. Those choices protected source fidelity, but across sixty seconds they produced too little independent subject motion.

Aggregate frame-difference QA also proved insufficient as a creative proxy. A camera move can create substantial pixel change while the subject itself remains effectively static.

## Sprint 006 Decision

Do **not** reinterpret the Level 1 result as a failure that should invalidate approved assets.

Instead:

- preserve the approved Level 1 `animation-v1` baseline;
- preserve all promotion receipts, checksums, audit evidence, and human approvals;
- keep Level 1 reproducible as a control/reference candidate;
- do not silently increase motion amplitudes across every shot;
- do not weaken source-preservation policy merely to create more visible movement;
- move the creative motion problem into a new explicit milestone.

## Success / Failure Split

### Technical and production result: PASS

The canonical reel pipeline is proven end-to-end.

### Publication animation-language result: NOT YET MET

The original Sprint 006 requirement that Reel 1 establish a repeatable publication-quality animation language remains unmet because the full reel still reads too close to a layered-still treatment.

This is exactly the kind of distinction the planning process was intended to surface: a command completing successfully is not the same as the visual style being ready to scale.

## Lessons Carried Forward

1. **Source fidelity and visible life are separate requirements.** Both must pass.
2. **Camera motion cannot substitute for subject motion.** QA must measure them separately.
3. **Independent timing matters.** Character, vessel, water, foreground, and atmosphere should not behave as one flattened plate.
4. **Secondary motion creates life.** Lag, inertia, contact, settle, and material response matter more than simply increasing amplitude.
5. **Not every shot needs equal motion.** Quiet shots can remain restrained when neighboring shots establish a living world.
6. **Benchmark A/B review is necessary.** Level 2 should always compare directly against the approved Level 1 control.
7. **The production safety rails are an asset.** They should enable richer motion, not be removed to make animation easier.

## Next Milestone

Sprint 008, `sprint-008-level-2-living-shots.md`, supersedes Sprint 006 as the active visual-quality implementation milestone.

Level 2 begins with Shot 3, Enki at the helm, and adds source-preserving articulated 2.5D motion: character micro-performance, rigid-vessel movement, rigging/cloth lag, material/contact motion, depth occlusion, and independent timing.

Shot 4 remains the contrasting numinous benchmark. Shot 8 becomes the third benchmark for rigid-object/environment contact.

Sprint 007 Studio Planning Automation may continue in parallel, but automation must learn from the approved Level 2 motion grammar rather than freezing the Level 1 motion limits as the final art direction.

## Historical Status

Sprint 006 should be treated as **completed with a split outcome**:

- canonical Level 1 pipeline: complete and validated;
- publication-quality living animation: carried forward to Sprint 008.

The original Sprint 006 plan remains unchanged as the record of intended work. This retrospective records what the project actually learned.
