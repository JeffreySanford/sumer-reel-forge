# Blessings Of Sumer Documentation

This folder captures production documentation specific to _Blessings of Sumer_.

## Source Material

The initial source is Chapter 1, Enki, from the local writing workspace. The first production pass treats the chapter as a reel series rather than one long video.

## Visual Identity

- Ancient Sumerian mythic realism.
- Water, reeds, clay, lapis, gold, marshes, boats, canals, shrines, tablets.
- Avoid generic ancient-world imagery that reads as Egyptian, Roman, medieval, or fantasy armor.
- Keep adult fertility mythology symbolic and platform-safe.
- Use the versioned baseline and review checklist in `visual-bible.md`.

## Current Reel Strategy

- Chapter 1 supports roughly 18 short reels at 60-90 seconds.
- The first benchmark reel is `The Voyage Begins`.
- Reel 1 is intentionally being used to prove the production and animation language before Reel 2 animation begins.
- The first visual consistency targets are Enki, Nammu, Dilmun, and the Stag of the Absu.

## Reel 1 Animation Milestones

### Level 1 - canonical production baseline - complete

Level 1 proved the end-to-end source-preserving animation workflow:

- all eight Reel 1 shots have approved canonical visual sources/layers;
- `animation-v1` promotion remains checksum/provenance controlled;
- the canonical Scene V2 reel resolves approved assets rather than the older procedural proof path;
- the full reel renders as `CanonicalReel1` at 1080x1920, 30 fps, 1800 frames / 60 seconds;
- approved shot timing is preserved, including the explicit 30-frame Shot 5 -> Shot 6 handoff;
- Chatterbox narration is distributed across eight shot-aligned cues through 57 seconds;
- continuous ambience supports the full 60-second reel;
- the final three seconds remain available for the title/ambience landing;
- narration/audio changes can reuse the already-rendered canonical visual.

Human full-reel review accepted this as a strong technical baseline but found that the visual result still reads primarily as still artwork with restrained motion.

See `chapters/chapter-01-reel-01-animation-v1-review.md`.

### Level 2 - Living Shots - active

The next milestone is not to regenerate the story or abandon the approved visual style. It is to make the existing illustrated world visibly alive through source-preserving articulated 2.5D animation.

Primary benchmark:

- **Shot 3 - Enki at the helm:** character micro-articulation, independent vessel movement, water/contact response, rigging/cloth lag, depth occlusion, atmosphere, light, and camera motion that are independently timed.

Contrasting benchmark:

- **Shot 4 - Nammu beneath the water:** richer currents, refraction, caustics, particulate depth, and numinous coherence without turning Nammu into a conventional animated cutout.

Third physical benchmark:

- **Shot 8 - landfall:** rigid-vessel movement, water/contact response, settling, and final-title handoff.

The governing implementation plan is `../../../planning/sprint-008-level-2-living-shots.md`.

## Production Status

- [x] Chapter 1 has an 18-reel outline.
- [x] Chapter 1 reels are seeded into Postgres.
- [x] The dashboard can load the reel list and selected reel details from the API.
- [x] The first reel has enough storyboard data to act as the benchmark workflow.
- [x] All 18 Chapter 1 reels have detailed production records.
- [x] A character and environment visual-bible baseline is versioned in the repository.
- [x] A 60-second technical prototype verifies the persisted rendering pipeline.
- [x] The first non-placeholder Reel 1 editorial cut is persisted and reviewed as a source baseline.
- [x] Reel 1 has eight approved canonical Level 1 animation shots.
- [x] Reel 1 has a canonical 60-second Scene V2 animation assembly.
- [x] Reel 1 narration is distributed across the full story with continuous ambience.
- [x] Level 1 is accepted as the production/pipeline baseline.
- [ ] Shot 3 passes the Level 2 Living Shots benchmark.
- [ ] Shot 4 passes the Level 2 numinous-motion benchmark.
- [ ] Shot 8 passes the Level 2 rigid-body/contact benchmark.
- [ ] The full Reel 1 Level 2 candidate no longer reads primarily as still imagery with minor animation.
- [ ] Reel 1 receives final publication-quality animation approval before Reel 2 animation begins.

## Publication Principle

Technical completion and publication approval are separate gates.

A reel may be reproducible, valid, checksummed, source-faithful, and fully rendered while still requiring creative revision. Level 1 demonstrated the production system. Level 2 must demonstrate the living animation language that the project is willing to carry into later reels.
