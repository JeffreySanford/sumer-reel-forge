# Narrative and Historical-Source Map

Status: **planning contract**

This document defines how the Sumer Reel Forge narrative relates to ancient literary sources, especially the Oxford Electronic Text Corpus of Sumerian Literature (ETCSL), and how historical-fiction material may evolve without losing provenance.

## 1. Principle

The project is **historical fiction inspired by ancient Mesopotamian literature**, not a claim that every scene, chronology, character motivation, costume, speech, or event is historically attested.

The distinction must be visible in the data model and production workflow.

### Source roles

| Layer | Authority | What it governs |
| --- | --- | --- |
| Manuscript | Narrative authority | story intent, voice, character arc, connective fiction |
| ETCSL / named ancient text | Literary provenance | mythic episode, divine roles, ancient textual motifs |
| Museum / archaeology | Visual-material provenance | objects, clothing, architecture, tools, animals, ritual material culture |
| Modern scholarship | Interpretation | chronology, geography, social context, contested readings |
| Production design | Reconstruction | gaps necessary to stage a coherent visual scene |
| AI | Candidate generation only | proposed visual/performance material that must be reviewed |

No lower layer silently overwrites a higher layer.

## 2. Adaptation classifications

Every production story unit must declare one of these:

```ts
export type AdaptationClass =
  | 'direct-source'
  | 'close-paraphrase'
  | 'composite-adaptation'
  | 'fictional-bridge'
  | 'speculative-reconstruction'
  | 'intentional-anachronism';
```

Definitions:

- **direct-source** — scene substantially follows one named ancient passage.
- **close-paraphrase** — story preserves the ancient action/meaning but modernizes wording or staging.
- **composite-adaptation** — scene combines multiple ancient passages/traditions.
- **fictional-bridge** — connective dialogue, motivation, chronology, travel, humor, domestic detail, or characterization supplied by the manuscript.
- **speculative-reconstruction** — plausible historical/visual invention where direct evidence is absent.
- **intentional-anachronism** — consciously retained material outside strict historical reconstruction; must be marked, never accidentally presented as attested fact.

The manuscript may be revised. Revising fiction does **not** require preserving every sentence. It does require preserving or updating the source binding that explains what ancient material the scene is built around.

## 3. ETCSL authority

Primary catalogue:

- https://etcsl.orinst.ox.ac.uk/edition2/etcslfullcat.php
- https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi?text=c.1%2A

ETCSL identifies the following major compositions directly relevant to Chapters 1–3:

| ID | Composition | Planned use |
| --- | --- | --- |
| 1.1.1 | Enki and Ninhursaga | Dilmun, Ninhursag/Ninsikila tradition, fertility/healing cycle |
| 1.1.2 | Enki and Ninmah | creation/labor tradition and later humanity material |
| 1.1.3 | Enki and the world order | assignment of functions, cities, agriculture, craft, rain, boundaries, weaving |
| 1.1.4 | Enki's journey to Nibru | Eridu/E-engura, boat, journey, Nibru/Nippur celebration |
| 1.2.1 | Enlil and Ninlil | Enlil/Ninlil tradition where used |
| 1.2.2 | Enlil and Sud | Sud courtship, Nisaba, Nuska, marriage gifts, transformation into Ninlil |
| 1.4.1 | Inana's descent to the nether world | Ereshkigal/netherworld and later Inana material |
| 1.7.6 | How grain came to Sumer | grain/civilization material |

Direct ETCSL translation URLs use the composition number, for example:

- https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi?text=t.1.1.1
- https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi?text=t.1.1.2
- https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi?text=t.1.1.3
- https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi?text=t.1.1.4
- https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi?text=t.1.2.1
- https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi?text=t.1.2.2
- https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi?text=t.1.4.1
- https://etcsl.orinst.ox.ac.uk/cgi-bin/etcsl.cgi?text=t.1.7.6

ETCSL line-level gloss pages can be stored for exact provenance. Example: Enki and the world order line c113.300 belongs to the 299–308 paragraph involving the E-kur and Nanše; c113.369 belongs to the 368–380 paragraph involving boundaries, cities and Utu.

## 4. Chapter 1 — Enki source map

Narrative file: `Chapter 1 - Enki.docx`

### Major narrative threads

| Manuscript thread | Ancient/literary source relationship | Adaptation expectation |
| --- | --- | --- |
| Nammu / watery origin / Absu identity | broad Enki tradition; ETCSL 1.1.x material | composite adaptation |
| voyage on the Stag of the Absu | Enki maritime/journey imagery, especially ETCSL 1.1.4 | composite adaptation |
| Martu encounters and travel characterization | manuscript connective historical fiction; related Martu traditions may be researched separately | fictional bridge unless directly bound later |
| Dilmun / Ninsikila complaint about water and city viability | ETCSL 1.1.1 | close paraphrase + fictional bridge |
| rapid growth / fertility / transformation | ETCSL 1.1.1 motifs | composite adaptation |
| canals, fields, irrigation, waterways | ETCSL 1.1.3 plus manuscript synthesis | composite adaptation |
| city/canal journey through Sumer | ETCSL 1.1.3 + fictional geographic connective narrative | composite adaptation |
| storms, Kutu, underworld associations | mixed textual traditions; must be bound per scene | composite / fictional bridge |
| E-Absu / E-engura in Eridu | ETCSL 1.1.4 | direct-source / close paraphrase |
| Enki travels to Nibru | ETCSL 1.1.4 | close paraphrase |
| riverbank generations of Ninsar/Ninkura/Ninimma/Uttu | ETCSL 1.1.1 | direct-source / adaptation; production handling should be carefully scoped |

### Animation implications

Chapter 1 is the benchmark for:

- water and underwater material systems;
- boats and rigging;
- shoreline/city arrival;
- canal/world construction montage;
- vegetation growth;
- storm and hail;
- temple architecture;
- divine/numinous environment;
- reusable Enki hero performance.

## 5. Chapter 2 — Enlil source map

Narrative file: `Chapter 2 - Enlil.docx`

### Major narrative threads

| Manuscript thread | Ancient/literary source relationship | Adaptation expectation |
| --- | --- | --- |
| stagnant perfected society / Grand Council | manuscript philosophical framing | fictional bridge |
| Enlil's address and break with the council | manuscript characterization and political/philosophical bridge | fictional bridge |
| Enlil and Enki deciding to descend/build cities | manuscript bridge linking divine functions to later Sumer | composite fiction |
| long journey and migration | manuscript historical-fiction montage | intentional speculative narrative; source separately if retained |
| establishment of divine assembly/city responsibilities | ETCSL-like world-order material, especially 1.1.3, reframed through Enlil | composite adaptation |
| Enlil encounters Sud | ETCSL 1.2.2 | close paraphrase + humorous modern characterization |
| Sud reports encounter to Nisaba/Haia | manuscript dramatization around ETCSL 1.2.2 | fictional bridge |
| Nisaba grievance and Nuska mediation | ETCSL 1.2.2 | close paraphrase/composite |
| marriage gifts / animal herds / goods | ETCSL 1.2.2 | direct-source inspired procession |
| Sud becomes Ninlil | ETCSL 1.2.2 | close paraphrase |
| Enlil/Ninlil material | ETCSL 1.2.1 where explicitly incorporated | direct/composite by scene |
| return banquet and Enki reunion | manuscript bridge with Enki/Nibru traditions | composite fiction |

### Animation implications

Chapter 2 is the benchmark for:

- hero dialogue performance;
- formal speech and audience reaction;
- multi-actor blocking;
- domestic emotional acting;
- messenger/court procedure;
- processions;
- large herds and animals;
- crowd variation;
- banquet staging;
- long-timescale montage.

## 6. Chapter 3 — The Cities source map

Narrative file: `Chapter 3 - The Cities.docx`

### Major narrative threads

| Manuscript thread | Ancient/literary source relationship | Adaptation expectation |
| --- | --- | --- |
| Ninhursag first-person city/civilization reflection | manuscript framing | fictional bridge |
| cities as living inheritance | manuscript thematic thesis | fictional bridge |
| city functions and divine assignments | ETCSL 1.1.3 | direct-source / close paraphrase |
| canals, agriculture, ploughs, fields | ETCSL 1.1.3 | close paraphrase |
| weaving / Uttu | ETCSL 1.1.3 | direct-source inspired |
| boundaries / Utu | ETCSL 1.1.3 | direct-source inspired |
| livestock / Dumuzid | ETCSL 1.1.3 | direct-source inspired |
| building / brickmaking / foundations | ETCSL 1.1.3 and related traditions | composite adaptation |
| grain coming to Sumer | ETCSL 1.7.6 | direct-source / adaptation |
| Ereshkigal / Inana resurrection material | ETCSL 1.4.1 | direct-source / close paraphrase |
| Enki/Ninhursag generational material | ETCSL 1.1.1 | direct-source / adaptation |
| Enki/Ninmah and labor/creation material | ETCSL 1.1.2 plus non-ETCSL Atrahasis traditions in manuscript | source must be split explicitly |
| Igigi 3,600-year labor | Atrahasis tradition / modern translation source, **not ETCSL** | separate ancient-source record required |
| Adapa material | non-ETCSL ancient tradition | separate source record required |

### Animation implications

Chapter 3 is the benchmark for:

- persistent cities rather than disposable backgrounds;
- agriculture state transitions;
- worker systems;
- canals and transportation;
- construction and brickwork;
- tools and trades;
- herds/fisheries;
- city-specific visual identity;
- world growth across long time spans;
- divine-city symbolic language.

## 7. Non-ETCSL ancient-source register

ETCSL is primary where applicable, but it does not contain every ancient tradition used by the manuscript.

Examples already present in Chapters 1–3 include:

- Atrahasis / Igigi labor tradition;
- Adapa tradition;
- modern translations or compilations cited in the manuscript;
- later or parallel Mesopotamian traditions.

These must be entered as separate source records instead of being mislabeled as ETCSL.

Proposed schema:

```ts
interface HistoricalSourceBinding {
  id: string;
  sourceType:
    | 'etcsl'
    | 'ancient-text-other'
    | 'museum-object'
    | 'archaeology'
    | 'modern-scholarship'
    | 'manuscript';

  title: string;
  authorOrInstitution?: string;
  url?: string;

  compositionId?: string;
  lineStart?: number;
  lineEnd?: number;
  ancientWitnessNote?: string;

  adaptation: AdaptationClass;
  confidence: 'high' | 'medium' | 'interpretive';
  notes?: string;
}
```

## 8. Visual-evidence register

Literary provenance and visual provenance are separate.

A shot based on ETCSL 1.2.2 does not automatically tell us:

- what Sud's dress looked like;
- what Enlil's hairstyle looked like;
- how a room was lit;
- the exact plan of a house;
- what a specific procession formation looked like.

Those choices require museum/archaeological references or explicit reconstruction labels.

Each material reference should record:

```ts
interface VisualEvidenceBinding {
  institution: string;
  objectNumber?: string;
  title: string;
  culture: string;
  dateRange?: string;
  findspot?: string;
  material?: string;
  url: string;
  imageLicense?: string;
  usage:
    | 'costume'
    | 'architecture'
    | 'tool'
    | 'vehicle'
    | 'animal'
    | 'ritual'
    | 'social-staging'
    | 'decorative-motif';
  confidence: 'high' | 'medium' | 'analogical';
}
```

## 9. Narrative revision policy

The historical-fiction text is **allowed to change**.

When revising:

1. preserve the original manuscript source as an archival input;
2. create a revised narrative version rather than overwriting provenance;
3. re-evaluate each affected source binding;
4. change adaptation classification when necessary;
5. do not manufacture an ETCSL citation for a fictional bridge;
6. allow humor, characterization and connective fiction when intentionally authored;
7. mark intentional anachronism rather than hiding it;
8. keep ancient-source excerpts/identifiers immutable once captured;
9. allow a scene to combine multiple sources, but list all of them;
10. allow historical/visual research to improve staging without automatically rewriting the narrative voice.

## 10. Historical-fiction QA gates

Before a scene can be called source-ready:

- manuscript scene/section identified;
- adaptation class present;
- ETCSL composition attached where applicable;
- exact line range attached when practical;
- non-ETCSL ancient source explicitly labeled;
- visual evidence references attached for important reconstruction choices;
- speculative visual decisions marked;
- no historical claim is generated solely from AI output;
- source and narrative versions are checksummed in production evidence.

## 11. Studio presentation

Studio should eventually expose a provenance panel like:

```text
SHOT 027 — ENLIL BEFORE THE COUNCIL

Narrative
  Chapter 2 — Enlil
  revision: narrative-v2

Ancient source
  Fictional bridge
  Context: Enlil traditions / world-order material

Visual evidence
  Early Dynastic assembly/banquet references
  costume reconstruction: interpretive

Animation
  Enlil rig v2
  Council crowd v1

Review
  source review        PASS
  animation QA         PASS
  human visual         PASS
```

The purpose is not academic pretense. It is traceability: the project should always know **which part came from an ancient text, which part came from archaeology, and which part came from the author.**
