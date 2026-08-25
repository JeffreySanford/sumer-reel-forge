# IDs, Naming and Version Conventions

Status: **planning contract**

V3 will contain many kinds of objects: manuscript threads, source records, scenes, actors, rigs, clips, materials, cities, paths, simulations, fixtures, proofs and receipts. Stable naming rules prevent filenames and temporary paths from becoming accidental identity.

## 1. Principles

- semantic ID is not filesystem path;
- version/revision is explicit where change history matters;
- IDs are lowercase ASCII and machine-safe;
- display names remain human-friendly and independent;
- timestamps may organize ephemeral output but never define canonical identity;
- content hashes prove bytes; IDs express meaning;
- mutable `latest` references may exist only as convenience views, not promoted evidence identity.

## 2. Common grammar

Preferred shape:

```text
<domain>:<scope...>:<name>[:vN]
```

Examples:

```text
scene:ch01:r01:s03
actor:enki
asset:enki:rig
clip:enki:blink-natural:v1
material:water:gulf-calm:v1
city:eridu
benchmark:enki-helm:v1
qa:benchmark:enki-helm:v1
semantic:blink-natural:v1
```

## 3. Scene IDs

```text
scene:ch01:r01:s03
scene:ch02:r04:s07
```

Scene ID is stable across revisions.

Revision is separate:

```text
scene:ch01:r01:s03 @ revision 4
```

Do not encode revision into scene ID unless representing an immutable external reference string.

## 4. Narrative thread IDs

```text
thread:ch01:enki-voyage
thread:ch01:kutu-storm
thread:ch02:enlil-council
thread:ch02:marriage-procession
thread:ch03:igigi-canals
thread:ch03:city-growth
```

Threads can span multiple scenes/reels.

## 5. Literary source IDs

```text
lit:etcsl:enki-world-order
lit:etcsl:enki-journey-nibru
lit:etcsl:enlil-sud
lit:non-etcsl:atrahasis
lit:non-etcsl:adapa
```

The ID identifies registry concept. Record revision/hash identifies exact metadata used.

## 6. Visual evidence IDs

```text
visual:bm:standard-of-ur
visual:met:banquet-seal:<object-id-normalized>
visual:penn:ubaid-temple-context
visual:eridu:site-context:v1
```

Institution/object IDs should be preserved in record fields even if normalized in semantic ID.

## 7. Actor IDs

Reusable identity:

```text
actor:enki
actor:enlil
actor:ninlil
actor:ninhursag
```

Scene instance:

```text
actor-instance:enki:s03
actor-instance:enlil:council-01
```

Do not create `actor:enki-shot3` as a new identity unless it is actually a distinct character definition.

## 8. Asset IDs

```text
asset:enki:editorial-source
asset:enki:rig
asset:stag:vessel
asset:stag:rigging
asset:eridu:e-absu-model
```

Asset revision is separate from logical ID.

## 9. Performance clip IDs

Performance clip semantic version is part of public compatibility:

```text
clip:enki:blink-natural:v1
clip:enki:breathe-calm:v1
clip:enlil:formal-address:v1
clip:worker:dig-canal:v1
clip:ox:walk-procession:v1
```

`v2` means materially different performance/compatibility contract, not a tiny comment edit.

## 10. Material IDs

```text
material:water:gulf-calm:v1
material:water:storm:v1
material:rigging:reed-rope:v1
material:reed:sway-light:v1
material:fog:underworld:v1
```

## 11. World/city IDs

```text
world:sumer:v1
city:eridu
city:uruk
city:ur
```

Development state:

```text
city-state:eridu:water-edge:v1
city-state:eridu:temple-center:v1
```

## 12. Region/path IDs

```text
region:eridu:quay
region:eridu:temple-approach
path:eridu:main-canal
path:eridu:boat-entry
```

Region/path revisions change when topology materially changes.

## 13. Simulation IDs

```text
simulation:kutu-hail:v1
simulation:stag-rigging-secondary:v1
```

Bake IDs include definition semantic version plus bake revision/hash externally:

```text
bake:kutu-hail:v1:r3
```

The hash remains byte authority.

## 14. Benchmark IDs

```text
benchmark:enki-facial:v1
benchmark:enki-helm:v1
benchmark:stag-spatial:v1
benchmark:kutu-hail:v1
benchmark:igigi-canal:v1
benchmark:city-growth:v1
benchmark:enlil-council:v1
benchmark:marriage-herd:v1
```

## 15. Proof state IDs

Scoped, uppercase semantic labels allowed in fixture data:

```text
OPEN
CLOSING
CLOSED
OPENING
RETURNED_OPEN
```

Canonical compound key:

```text
benchmark:enki-facial:v1#CLOSED
```

## 16. QA and semantic contracts

```text
qa:benchmark:enki-facial:v1
qa:asset:hero-rig:v1
semantic:blink-natural:v1
semantic:crowd-variation:v1
semantic:boat-hail-response:v1
```

Prompt wording/metrics changes that alter verdict semantics require contract revision.

## 17. Receipt IDs

Receipt ID is semantic/audit convenience; receipt hash proves exact content.

```text
receipt:render:scene-ch01-r01-s03:r1
receipt:qa:enki-helm:r1
receipt:human:enki-helm:r1
promotion:scene:ch01:r01:s03:v3-001
```

Avoid timestamp-only identity.

## 18. Revision vs semantic version

Use **revision** for sequential modifications of one logical object:

```text
city:eridu revision 4
scene:ch01:r01:s03 revision 7
asset:enki:rig revision 2
```

Use **semantic contract version** when compatibility/meaning changes:

```text
clip:enki:blink-natural:v1 → v2
semantic:blink-natural:v1 → v2
Scene schema 3.0 → 3.1
```

## 19. Runtime adapter versions

Adapter version is independent from package version:

```text
runtime package: pixi.js 8.x.y
adapter: animation-pixi adapterVersion 2
```

Both are evidence-bound.

## 20. File naming

Files may mirror IDs for readability but not become identity source.

Good:

```text
enki-v1.riv
gulf-calm-water-v1.json
kutu-hail-v1.sim.json
```

Avoid:

```text
final-final2-good.riv
new-water-use-this.json
```

## 21. Temp paths

Timestamp folder is fine for ephemeral run grouping:

```text
tmp/.../2026-08-25T18-21-01-406Z/
```

Receipt/candidate still has semantic ID + hash. Timestamp is not provenance authority.

## 22. Database keys

Database primary keys may be UUID/internal IDs, but API/UI should preserve semantic ID separately.

Do not expose database surrogate keys as durable story/runtime identity.

## 23. Case and separators

- semantic IDs lowercase;
- use `:` for semantic namespace;
- use `-` within words;
- avoid spaces in IDs;
- do not encode Windows path separators in IDs;
- proof-state enum labels may be uppercase.

## 24. Reserved terms

Reserve lifecycle/maturity vocabulary exactly:

```text
DRAFT CANDIDATE QA_BLOCKED QA_PASSED HUMAN_REVIEW APPROVED PROMOTED SUPERSEDED REJECTED
EXPERIMENTAL BENCHMARKED PRODUCTION_READY DEPRECATED RETIRED
```

Do not create near-synonyms such as `READYISH`, `FINAL`, `DONE_FINAL`.

## 25. Tests

- semantic ID parser/validator;
- duplicate ID rejection;
- case normalization rules;
- revision must be positive integer where required;
- version labels parse deterministically;
- path separator never changes semantic ID/hash;
- temp timestamp not accepted as canonical asset ID;
- receipt cross-links use known domains;
- supersedes cannot target itself.

## 26. Lint/source checks

Potential future rules:

- reject new `final-final` canonical file patterns;
- reject absolute path in Scene V3 JSON;
- reject unversioned QA/semantic contract reference;
- reject `latest` in durable promotion receipt;
- reject runtime asset without logical asset ID.

## 27. Storybook display

UI shows friendly name first, stable ID available/copyable:

```text
Enki
actor:enki
Rig rev 2 · sha256:abcd…
```

Do not force reviewers to read raw IDs everywhere, but never hide them from diagnostics/evidence.

## 28. Definition of naming readiness

Naming is ready when new source, actor, clip, city, scene, benchmark, proof and receipt objects can be named predictably without inventing a new convention in each implementation PR.
