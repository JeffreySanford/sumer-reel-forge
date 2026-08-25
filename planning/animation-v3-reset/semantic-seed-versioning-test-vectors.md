# Semantic Seed Versioning and Test-Vector Specification

Status: **Phase 2B deterministic RNG planning / algorithm not yet frozen**

Scene V3 requires deterministic variation without coupling unrelated animation channels through one mutable random stream. This document defines the seed contract, versioning, test-vector process and rejection criteria before a concrete hash/RNG algorithm is selected.

## 1. Core rule

Randomness is addressed by semantic identity, not call order.

```text
scene seed
+ scene ID
+ target ID
+ channel
+ purpose
+ algorithm version
        ↓
semantic seed
        ↓
versioned deterministic RNG
```

Adding an unrelated gull, reed or crowd agent must not perturb Enki's blink timing.

## 2. Planned API

```ts
deriveSemanticSeed({
  sceneSeed,
  sceneId,
  targetId,
  channel,
  purpose,
  version,
}): number
```

Callers never pass an array index as semantic identity unless that index itself is a stable authored identity.

## 3. Input encoding

Before hashing/derivation, fields are encoded as an unambiguous versioned tuple.

Preferred conceptual form:

```text
v1
field-name + UTF-8 byte length + UTF-8 bytes
field-name + UTF-8 byte length + UTF-8 bytes
...
```

Do not concatenate with a delimiter and hope values never contain that delimiter.

Field names and order are part of algorithm version.

## 4. Required fields

```text
sceneSeed
sceneId
targetId
channel
purpose
version
```

Optional future dimensions such as clip ID or region ID should be introduced through a new purpose/target identity or explicit algorithm revision, not hidden positional arguments.

## 5. Versioning

Persist/receipt:

```text
seedDerivationVersion
rngAlgorithmVersion
```

They may initially both be `1`, but the distinction allows future change to one layer without ambiguity.

Old scenes remain reproducible by retaining old algorithm implementations.

## 6. Seed output width

Phase 2B must choose an output width compatible with the selected deterministic RNG and JS/browser portability.

Requirements:

- exact integer semantics;
- no dependence on platform floating-point parsing quirks;
- stable Node/browser result;
- serialized explicitly;
- sufficient space to avoid obvious practical collisions for project-scale semantic channels.

Do not choose an algorithm solely because it is three lines of code.

## 7. RNG requirements

The RNG consuming the semantic seed must support:

```text
nextFloat01()
nextInt(min,max)
choose(array)
range(min,max)
```

Optional utilities must be deterministic wrappers over the same versioned primitive.

No `Math.random()` inside production animation code.

## 8. Stream discipline

Preferred pattern:

```text
one semantic seed per independent purpose
```

Examples:

```text
target=actor:enki channel=blink purpose=timing
target=actor:enki channel=blink purpose=duration
target=water:gulf channel=surface.phase purpose=initial-phase
target=agent:worker:017 channel=work purpose=clip-choice
```

This is safer than consuming many values from one scene-global stream.

## 9. Test-vector file

Before merging PR 2B, add a checked-in machine-readable file such as:

```text
libs/animation-frame/src/lib/fixtures/semantic-seed-v1.vectors.json
```

Each vector records:

```json
{
  "id": "SEED-V1-001",
  "input": {
    "sceneSeed": 31003,
    "sceneId": "scene:ch01:r01:s03",
    "targetId": "actor:enki",
    "channel": "blink",
    "purpose": "timing",
    "version": 1
  },
  "expectedSeed": 0
}
```

`expectedSeed` remains planning-placeholder only until the algorithm is selected. Once frozen, zero/placeholder is forbidden and the vector becomes normative.

## 10. Required vector categories

```text
BASIC_ENKI_BLINK
SAME_INPUT_REPEAT
TARGET_CHANGED
CHANNEL_CHANGED
PURPOSE_CHANGED
SCENE_CHANGED
SCENE_SEED_CHANGED
UNICODE_ID
DELIMITER_COLLISION_ATTEMPT
EMPTY_OPTIONAL_NOT_ALLOWED
LONG_SEMANTIC_ID
FIELD_ORDER_IN_CALLER_IRRELEVANT
```

## 11. Collision-oriented negative vectors

Inputs that naive delimiter concatenation might confuse must produce different seeds.

Example conceptual pairs:

```text
target="a|b", channel="c"
target="a",   channel="b|c"
```

and:

```text
target="ab", channel="c"
target="a",  channel="bc"
```

Length-prefixed/structured encoding prevents ambiguity.

## 12. Cross-environment gate

The exact vector suite must pass in:

```text
Windows local Node
Linux GitHub Node
browser/Storybook test environment when frame kernel is browser-consumed
```

If the same vector gives different output, the algorithm is rejected.

## 13. Candidate algorithm admission process

Before freezing an implementation, evaluate:

```text
portability
implementation/library maintenance
license
bundle cost if browser-used
speed at expected channel counts
integer correctness
quality adequate for animation variation
ability to retain old version
```

Candidates may include a stable hash-to-seed step plus a small deterministic PRNG. The exact choice belongs in the Phase 2B ADR/implementation commit after test vectors prove it.

## 14. Do not misuse cryptographic hashes

SHA-256 is excellent for content/evidence identity. Semantic animation RNG may use a different deterministic derivation if it better satisfies small synchronous browser/runtime needs.

If SHA-256 is used for derivation, define exactly how bytes become the RNG seed; do not parse arbitrary hex through floating numbers.

## 15. Stable tests

```text
UNIT-SEED-001-repeatability
UNIT-SEED-002-channel-isolation
UNIT-SEED-003-field-order-canonicalization
UNIT-SEED-004-separator-safety
UNIT-SEED-005-target-isolation
UNIT-SEED-006-purpose-isolation
CONTRACT-SEED-001-version-explicit
CONTRACT-SEED-002-test-vectors-pinned
CONTRACT-SEED-003-node-browser-parity
FAILURE-SEED-001-math-random-source
FAILURE-SEED-002-index-only-identity
FAILURE-SEED-003-unversioned-derivation
FAILURE-SEED-004-placeholder-vector-after-freeze
```

## 16. Crowd identity

Crowds require stable agent identity independent from array position.

Prefer:

```text
agent:igigi:crew-a:0001
agent:igigi:crew-a:0002
```

or deterministic semantic identity derived from region/role/slot contract.

Sorting agents in an array must not change their individual motion seeds.

## 17. City regional isolation

Example:

```text
target=region:eridu:quay channel=reeds purpose=placement
target=region:eridu:fish-market channel=workers purpose=phase
```

Adding fish-market workers must not rearrange quay reeds.

This is a core CityKit acceptance property.

## 18. Version migration

If seed algorithm v2 is introduced:

```text
existing promoted scenes remain pinned to v1
new scenes may opt into v2
migration produces explicit visual-impact report
A/B proof compares representative states
human review required when visible production state changes
```

Never silently rerandomize an approved crowd/city/particle system because a utility was refactored.

## 19. Diagnostics

Frame/runtime evidence should be able to show:

```text
semantic seed input identity
seed derivation version
resulting seed
RNG version
```

It should not dump huge random streams by default.

## 20. Definition of success

The seed system is ready when semantic variation is reproducible, isolated, portable and versioned: identical semantic inputs always reproduce; unrelated additions do not perturb existing channels; and every future algorithm change can coexist with already approved production scenes.