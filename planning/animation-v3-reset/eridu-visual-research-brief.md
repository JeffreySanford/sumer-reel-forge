# Eridu Visual Research Brief — Production Packet v1

Status: **research-ready / reconstruction not yet approved**

World ID: `city:eridu`

This brief converts the existing CityKit Eridu example into a research assignment with explicit questions, evidence classes, confidence boundaries and production stop conditions. Its purpose is to prevent the CityKit implementation from turning an attractive generic “Sumerian city” into project truth before the research layer exists.

## 1. Narrative reason Eridu matters

Eridu is not a disposable background. Within the current project architecture it must support recurring material across Chapters 1 and 3, including:

- Enki's city/temple identity;
- water-edge life;
- E-Absu narrative material;
- fisheries, reeds, boats and quays;
- city development over time;
- return visits that preserve recognizable geography.

That makes Eridu the ideal first CityKit world benchmark and also makes historical overconfidence especially dangerous.

## 2. Research objective

Produce enough defensible evidence to answer:

```text
What aspects of Eridu can be treated as direct/site-based?
What aspects are period analogues?
What aspects are literary/mythic synthesis?
What aspects are deliberately speculative production design?
```

The output is not “the true Eridu.” It is a traceable historical-fiction world definition with confidence attached to major visual claims.

## 3. Required evidence buckets

### ERIDU-DIRECT

Evidence specifically tied to Eridu or its excavated site/context.

Target questions:

- site plan / mound organization;
- temple sequence and platform history;
- water relationship and palaeoenvironment where supported;
- construction materials/techniques tied directly to Eridu;
- occupational phases relevant to the project's chosen visual period band.

### SOUTH-MESOPOTAMIA-CONTEXT

Near-period/contextual evidence from southern Mesopotamia used to fill gaps:

- mudbrick construction;
- reed architecture/use;
- boats and water transport;
- clothing;
- work tools;
- livestock;
- food/banquet material;
- decorative materials.

### ANALOGICAL-TEMPLE

Comparable temple/site evidence not from Eridu.

Current planned example:

```text
Penn Museum / Leon Legrain, al-‘Ubaid (1944)
```

This may inform questions about platforms, stairs, entrance treatment, copper/inlay and animal decoration, but it must never silently become “the E-Absu at Eridu.”

### LITERARY-MYTHIC

ETCSL/source material informing the narrative identity of Eridu/Enki/E-engura/E-Absu.

Literary imagery can guide mythic or ceremonial art direction, but architectural details derived from literary language must be labeled interpretation unless corroborated independently.

## 4. Current evidence state

```text
literary bindings       PRESENT
period/context targets  PRESENT
al-Ubaid analogue       VERIFIED AS SOURCE TARGET
Eridu direct site set   INCOMPLETE
image-rights matrix     INCOMPLETE
reconstruction review   NOT STARTED
```

Therefore `city:eridu` remains a planning example. No CityKit geometry should yet be described as archaeologically approved.

## 5. Core geography questions

Before world layout is authored, research must establish or bound:

1. What water bodies/channels are defensible for the chosen period representation?
2. How tightly can the settlement be tied visually to marsh/reed environments?
3. What is known versus inferred about access from water to settlement/temple areas?
4. Which parts of the terrain profile are archaeological evidence versus modern reconstruction?
5. Can one persistent water topology plausibly serve the selected narrative period, or must CityKit expose multiple historically distinct geography states?

If the answer to #5 is “multiple,” the world model must not hide chronology behind one timeless map.

## 6. E-Absu architecture questions

Required research questions:

```text
site/temple phase chosen for visual baseline?
platform dimensions/shape supported?
entrance/stair orientation supported?
wall thickness/material supported?
surface treatment/plaster supported?
roof assumptions?
column/pier evidence?
associated court/approach evidence?
relationship to water supported or literary?
ornament literary, archaeological, or analogical?
```

Every major architectural feature receives one of:

```text
DIRECT_SITE
NEAR_PERIOD_CONTEXT
ANALOGICAL
LITERARY_INTERPRETATION
PROJECT_SPECULATION
```

## 7. Al-‘Ubaid analogue handling

Penn's historical article describes an early Sumerian temple at al-‘Ubaid associated with Ninhursag, including a platform/stair approach and rich copper/inlaid animal decoration.

Allowed Eridu use:

- ask whether related construction/decorative technologies are plausible in the wider period/context;
- use it to build a material-technique reference board;
- use specific objects as analogues if their metadata/rights are separately verified.

Not allowed:

- copy the al-‘Ubaid reconstruction and label it E-Absu;
- move its decorative program wholesale to Eridu;
- treat its Ninhursag association as evidence for Enki's Eridu temple layout;
- use the 1944 reconstruction as the sole authority where later scholarship exists.

## 8. Visual evidence acquisition table

The research packet should eventually contain at least:

| Evidence slot | Minimum count | Relationship | Required metadata |
|---|---:|---|---|
| Eridu site plans/publications | 2 authoritative sources | direct | date/phase, author/institution, page/figure |
| Eridu excavation/site photography | 1 usable set | direct | date, viewpoint, rights |
| southern alluvium/marsh context | 2 | contextual | location/date/relevance |
| mudbrick architecture | 2 | contextual | site/date/material |
| reed construction | 2 | contextual | site/date/use |
| watercraft | 2 | contextual | object/depiction/date |
| clothing/social staging | 2 | contextual | object/date/classification |
| temple analogues | 2 | analogical | site/date/difference note |
| decorative materials | 3 | contextual | material/object/date |

Counts are research minimums, not a voting system. One strong direct source can outweigh many weak aesthetic references.

## 9. CityKit features and evidence requirements

### Water network

```text
city feature: water:eridu:canals:v1
minimum relationship: DIRECT_SITE or well-supported contextual reconstruction
```

Do not proceduralize major water topology until its authored baseline exists.

### Marsh/reeds

```text
city feature: vegetation:marsh-reed:v1
minimum relationship: DIRECT_SITE/CONTEXTUAL with explicit temporal note
```

### Temple complex

```text
city feature: architecture:eridu:e-absu:v1
minimum relationship: mixed evidence allowed
required: per-feature confidence map
```

### Quay

```text
city feature: quay:reed-mudbrick:v1
status: HYPOTHESIS until direct/context evidence packet supports form
```

### Residential fabric

Must use density/type rules rather than one hand-painted fantasy skyline. Every promoted building archetype records evidence relationship.

## 10. Development-state research problem

The existing CityKit example proposes:

```text
ERIDU_0_WATER_EDGE
ERIDU_1_EARLY_SETTLEMENT
ERIDU_2_CANALIZED
ERIDU_3_TEMPLE_CENTER
ERIDU_4_MATURE_PORT
```

These are useful production semantics but are **not yet archaeological period labels**.

Before implementation, decide whether they are:

1. purely narrative/world-state abstractions; or
2. mappings to actual archaeological phases.

If #1, names and Studio labels must avoid implying archaeological chronology.

If #2, each state needs direct phase/date/source bindings and migration rules.

Preferred initial approach: retain them as clearly authored production states until a dedicated archaeological chronology review justifies stronger labels.

## 11. Painterly world-source strategy

The final world source should not be assembled from random reference-board imagery. Research feeds an approved authored world package:

```text
research evidence
  ↓
evidence applications + confidence
  ↓
Eridu world design brief
  ↓
concept candidates
  ↓
human historical/visual review
  ↓
approved CityKit source package
  ↓
L2 projection + L3 spatial representation
```

The same semantic city drives both L2 and L3. Runtime geometry does not become a second independent reconstruction.

## 12. Proposed CityKit source package

After research approval:

```text
world:city:eridu:v1/
  identity-board.png
  topological-plan.json
  water-network.json
  regions.json
  paths.json
  architecture-archetypes.json
  material-palette.json
  vegetation-profile.json
  evidence-map.json
  development-states.json
  source-receipt.json
```

Optional art derivatives:

```text
l2-depth-cards/
l3-spatial-assets/
```

Those folders remain derived representations of one semantic world identity.

## 13. Evidence-map example

Conceptual:

```json
{
  "featureId": "architecture:eridu:e-absu:v1:entry-stair",
  "classification": "PROJECT_SPECULATION",
  "sourceIds": [],
  "analogueIds": ["scholarship:penn:legrain-al-ubaid-1944:v1"],
  "confidence": "interpretive",
  "displayNote": "Stair treatment is design synthesis informed by a regional temple analogue; not claimed as direct Eridu evidence."
}
```

This is preferable to burying uncertainty in a Markdown footnote nobody sees during authoring.

## 14. Benchmark proof states

For `benchmark:city-growth:v1`:

```text
BARREN_OR_BASE
EARLY_SETTLEMENT
CANALIZED
TEMPLE_CENTER
MATURE_CITY
EVIDENCE_OVERLAY
```

`EVIDENCE_OVERLAY` is mandatory during development. It visually marks direct/contextual/analogical/speculative major world features so reviewers can see where confidence changes across the scene.

## 15. Stable acceptance IDs

```text
CONTRACT-CITY-001-eridu-states-ordered
CONTRACT-CITY-002-major-feature-evidence-classified
UNIT-CITY-001-region-seed-stability
UNIT-CITY-002-unrelated-region-isolation
STORY-CITY-001-eridu-identity
STORY-CITY-002-eridu-evidence-overlay
VISUAL-CITY-001-base-geography
VISUAL-CITY-003-canalized-eridu
VISUAL-CITY-005-mature-eridu
MOTION-CITY-001-growth-transition
SEMANTIC-CITY-001-same-place-growth
FAILURE-CITY-001-unclassified-major-monument
FAILURE-CITY-002-state-replaces-geography
FAILURE-CITY-003-analogue-labeled-direct
PERF-CITY-001-eridu-proof
HUMAN-CITY-001-growth-identity
```

## 16. Human review questions

- Does the place remain recognizably Eridu across authored development states?
- Can a reviewer identify which major features are direct versus inferred without opening source code?
- Is water a coherent persistent part of the world rather than a decorative layer?
- Does the E-Absu feel integrated into the city rather than dropped in as a fantasy monument?
- Does the visual language match Blessings of Sumer rather than generic game-engine archaeology?
- Are analogues used as analogues instead of disguised as direct evidence?
- Does added complexity read as development of one place?

## 17. Research stop conditions

Do not promote an Eridu world source if:

- direct Eridu evidence has not been reviewed;
- the chosen temple form is primarily copied from al-‘Ubaid or another site without classification;
- a major water topology is invented but presented as historical fact;
- image/source rights are unknown for assets copied into production;
- development states are presented as archaeological phases without bindings;
- major speculative features lack visible provenance classification.

## 18. Definition of research readiness

Eridu is ready for CityKit implementation when the team can hand the world builder an evidence/application matrix and answer, feature by feature, **what we know, what we infer, what we borrow analogically, and what we deliberately invent for the historical-fiction scene**.