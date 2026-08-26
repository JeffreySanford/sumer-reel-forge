# animation-contracts

Engine-independent Scene V3 authoring contracts and structural validation.

Phase 2A intentionally contains no React, Angular, Remotion, Rive, Pixi, Three, Rapier or browser runtime dependency. It defines stable semantic IDs, versioned runtime references, integer-frame timelines, source/asset references, scene-owned animation domains, QA intent and validation rules.

The library validates authoring structure only. Historical-source lookup, asset resolution, runtime registration/capability negotiation, canonical serialization and resolved-scene hashing belong to later Phase 2 slices.
