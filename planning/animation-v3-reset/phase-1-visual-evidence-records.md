# Phase 1 Visual-Evidence Record Packet

Status: **concrete planning packet / schema pressure test**

This packet converts the four authoritative visual-evidence targets already named by the V3 planning index into proposed production records. It is deliberately more strict than a link list: each source is classified by what it can actually support, what it cannot support, and whether it belongs in `VisualEvidenceBinding` at all.

The purpose is twofold:

1. make the next Phase 1 implementation slice mechanical rather than interpretive;
2. discover weaknesses in the current registry contract before dozens of records depend on it.

## 1. Current contract under test

`libs/historical-sources` currently defines `VisualEvidenceBinding` with one scalar `usage` value:

```ts
export interface VisualEvidenceBinding {
  id: string;
  institution: string;
  objectNumber?: string;
  title: string;
  culture: string;
  dateRange?: string;
  findspot?: string;
  material?: string;
  url: string;
  imageLicense?: string;
  usage: VisualEvidenceUsage;
  confidence: 'high' | 'medium' | 'analogical';
  notes?: string;
}
```

The first real records expose two useful contract questions:

- one object can legitimately inform more than one usage category;
- a publication/site report is not necessarily a museum object and should not be forced into an object-shaped record.

Therefore this packet is **not permission to paste the examples directly into production code unchanged**. Phase 1B should resolve those two contract issues first.

## 2. Record VE-UR-STANDARD-001 — Standard of Ur

Authoritative page:

```text
institution: British Museum
registration number: 1928,1010.3
museum number: 121201
title: The Standard of Ur
period: Early Dynastic III
production date: 2550–2400 BC
findspot: Royal Cemetery, Ur
materials: shell, red limestone, lapis lazuli, bitumen
```

The museum describes a reconstructed box-like object with narrative mosaic scenes including organized soldiers, prisoners, a high-status ruler, tribute/goods, cattle/goats/sheep, fish, banqueters, attendants, a lyre player and singer. The object was found crushed and reconstructed; the museum explicitly notes uncertainty about its original function.

### Allowed project uses

Strong contextual evidence for:

- social staging and hierarchy;
- procession spacing;
- seated banquet composition;
- musical performance context;
- livestock/goods carried in formal scenes;
- garment silhouettes and status differentiation as **period-context evidence**, not a named-character portrait;
- lapis/shell/limestone/bitumen decorative material language.

### Forbidden inference

Do not use the object to claim:

- the large ruler is Enki, Enlil or another named divine actor;
- the depicted architecture reconstructs Eridu;
- its modern name `Standard` proves its original function;
- every reconstructed end-panel placement is certain.

### Proposed binding

The scalar `usage` problem is visible here. Primary record:

```ts
{
  id: 'visual:bm:standard-of-ur:1928-1010-3:v1',
  institution: 'British Museum',
  objectNumber: '1928,1010.3',
  title: 'The Standard of Ur',
  culture: 'Sumerian / Early Dynastic III',
  dateRange: '2550–2400 BC',
  findspot: 'Royal Cemetery, Ur, Iraq',
  material: 'shell; red limestone; lapis lazuli; bitumen',
  url: 'https://www.britishmuseum.org/collection/object/W_1928-1010-3',
  usage: 'social-staging',
  confidence: 'high',
  notes: 'Use as period-context evidence for staging, status, banquet/procession composition and materials. Do not identify depicted figures as project divine characters.'
}
```

A future contract should permit additional declared uses such as `costume`, `ritual`, `animal`, and `decorative-motif` without cloning the object record.

## 3. Record VE-UR-GAME-001 — Royal Game of Ur

Authoritative page:

```text
institution: British Museum
registration number: 1928,1009.378
museum number: 120834
title: The Royal Game of Ur
period: Early Dynastic III
production date: 2600–2400 BC
findspot: Royal Cemetery, Ur
materials: wood, shell; inlaid construction
```

The board has twenty inlaid square shell plaques and survives through excavation/conservation/reconstruction history documented by the museum.

### Allowed project uses

- elite/domestic object vocabulary;
- inlay scale and geometric ornament;
- shell/wood material contrast;
- board-game prop reference where narratively appropriate;
- close-detail decorative motif study.

### Forbidden inference

- do not treat it as evidence that a particular manuscript scene includes gaming;
- do not extrapolate its elite burial context into ordinary household furnishing without an adaptation note;
- do not copy modern reconstruction details as though every lost component were original.

### Proposed binding

```ts
{
  id: 'visual:bm:royal-game-ur:1928-1009-378:v1',
  institution: 'British Museum',
  objectNumber: '1928,1009.378',
  title: 'The Royal Game of Ur',
  culture: 'Sumerian / Early Dynastic III',
  dateRange: '2600–2400 BC',
  findspot: 'Royal Cemetery, Ur, Iraq',
  material: 'wood; shell; inlay',
  url: 'https://www.britishmuseum.org/collection/object/W_1928-1009-378',
  usage: 'decorative-motif',
  confidence: 'high',
  notes: 'Object/material reference. Narrative presence must be separately authored; burial-context object is not generic household proof.'
}
```

## 4. Record VE-MET-BANQUET-001 — Early Dynastic banquet cylinder seal

Authoritative page:

```text
institution: Metropolitan Museum of Art
object number: 56.157.1
period: Early Dynastic III
culture: Sumerian
production date: ca. 2600–2350 BCE
geography: Mesopotamia
medium: gypsum alabaster
image status on Met record: Public Domain
```

The seal's modern impression shows a two-register banquet scene, including seated figures drinking through tubes, attendants and vessels.

### Allowed project uses

- seated banquet staging;
- drinking-vessel/tube relationships;
- attendant positioning;
- register/compositional reference;
- ritual/social-performance visual language.

### Forbidden inference

- do not identify the participants as project characters;
- do not treat the scene as proof of the exact ceremony depicted in Chapter 2;
- do not infer room architecture from the seal field.

### Proposed binding

```ts
{
  id: 'visual:met:banquet-seal:56-157-1:v1',
  institution: 'The Metropolitan Museum of Art',
  objectNumber: '56.157.1',
  title: 'Cylinder seal and modern impression: banquet scene with seated figures drinking a liquid through straws',
  culture: 'Sumerian / Early Dynastic III',
  dateRange: 'ca. 2600–2350 BCE',
  material: 'gypsum alabaster',
  url: 'https://www.metmuseum.org/art/collection/search/324572',
  imageLicense: 'Public Domain (Met object record; verify downloaded asset metadata at ingest)',
  usage: 'ritual',
  confidence: 'high',
  notes: 'Use for banquet/social staging and vessel relationships; not as a literal reconstruction of a Chapter 2 event.'
}
```

## 5. Record HS-PENN-UBAID-001 — Penn Museum al-‘Ubaid publication

The planning index currently lists the Penn Museum 1944 article alongside visual-evidence targets. The concrete record review shows that the article itself is better modeled as **modern scholarship / archaeological context**, while individual illustrated objects or figures can become separate visual-evidence records if rights and metadata are suitable.

Authoritative publication:

```text
title: al-‘Ubaid
author: Leon Legrain
institution: Penn Museum
original publication: Museum Bulletin X, no. 3–4 (June 1944), pp. 29–31
subject: excavated temple of Ninhursag at al-‘Ubaid and associated finds
```

The article discusses the temple platform, stairs, decorated entrance/columns, copper and inlaid elements, animal figures/friezes and a milking scene. It is historically useful but is also explicitly marked by Penn as a digitized historical article that may not reflect current museum views.

### Proposed historical-source binding

```ts
{
  id: 'scholarship:penn:legrain-al-ubaid-1944:v1',
  sourceType: 'modern-scholarship',
  title: 'al-‘Ubaid',
  authorOrInstitution: 'Leon Legrain / Penn Museum',
  url: 'https://www.penn.museum/sites/bulletin/2583/',
  adaptation: 'composite-adaptation',
  confidence: 'medium',
  researchStatus: 'verified',
  notes: 'Historical museum publication useful for architecture/material analogues. Penn warns the digitized article may not reflect current views; corroborate important reconstruction claims with later scholarship before production.'
}
```

### Visual-evidence follow-up

Create separate records for specific Penn objects/figures only after:

1. object-page metadata is verified;
2. image rights are verified;
3. direct vs analogical relationship to the target scene is classified.

Al-‘Ubaid must remain an **analogue** for Eridu visual reconstruction unless a specific claim is independently established for Eridu.

## 6. Contract changes exposed by real records

Phase 1B should decide explicitly between these options.

### Decision A — multi-use evidence

Preferred change:

```ts
usage: readonly VisualEvidenceUsage[];
```

Alternative: keep a canonical object record usage-neutral and create separate scene-level `VisualEvidenceApplication` records that map one object to one or more project uses.

The second approach is cleaner because the same museum object can support different uses with different confidence in different scenes.

### Decision B — object vs research evidence

Do not stretch `VisualEvidenceBinding` to contain articles, excavation reports and site syntheses.

Preferred future split:

```text
HistoricalSourceBinding
  literary + scholarship claim provenance

VisualEvidenceBinding
  identifiable object/image/site visual evidence

VisualEvidenceApplication
  project-specific use + confidence + inference note
```

## 7. Validation rules to add with implementation

Required positive tests:

- institution/title/url required;
- object number stable when present;
- evidence IDs unique;
- high-confidence object record has authoritative source URL;
- application references a known evidence ID;
- multiple applications may point to one evidence record;
- image license may be omitted but ingest must then remain metadata-only.

Required negative tests:

```text
FAILURE-EVIDENCE-001 unknown-evidence-id
FAILURE-EVIDENCE-002 unsupported-usage
FAILURE-EVIDENCE-003 unlicensed-image-promoted
FAILURE-EVIDENCE-004 publication-masquerades-as-object
FAILURE-EVIDENCE-005 analogical-evidence-labeled-direct
```

## 8. Phase 1B implementation order

```text
1. amend/confirm evidence contract
2. add object/application validators
3. add Standard of Ur record
4. add Royal Game of Ur record
5. add Met banquet seal record
6. add Penn 1944 scholarship record
7. add unit + negative tests
8. add registry report snapshot
9. local lint/test/build
10. only then expose records in Studio provenance UI
```

## 9. Exit condition

This packet is complete when the repository can answer, for any visual claim:

> Which authoritative record informed this design, what exact project use was authorized, how direct is that relationship, and are we allowed to use the image bytes or only the research metadata?

That is the level of provenance required before historical visual evidence becomes production infrastructure.