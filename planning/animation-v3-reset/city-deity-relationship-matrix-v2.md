# City–Deity Relationship Matrix V2

Status: **superseding interpretive matrix for deity/city provenance**

This matrix refines `city-deity-geography-correction-matrix.md`. The earlier matrix correctly identified historical patron/cult mismatches, but its language could imply that a symbolic assignment was simply an error. V2 treats historical patronage, attested cult presence, narrative office and esoteric correspondence as separate relationships.

| Place | Historical patron / strongest cult relationship | Other relevant attested relationship | Project narrative / metaphysical office | Esoteric correspondence | Production interpretation |
|---|---|---|---|---|---|
| **Kish** | Zababa | An received offerings at Kish; Inanna/Ishtar also had cult presence | heavenly/supreme authority | An ↔ Kether | Preserve Zababa historically **and** An symbolically; not a contradiction |
| **Shuruppak** | Sud, later identified with Ninlil | Inanna/Ishtar also had wider Mesopotamian cult presence including Shuruppak | severity, destruction, transformation, war/death-rebirth principle | Nergal ↔ Geburah/Mars | Nergal is not the historical patron claim; it is an intentional functional/esoteric assignment |
| **Kutha** | Nergal/Meslamtaea | — | underworld/death/war manifestation | Nergal ↔ Geburah/Mars | Use as historical cult geography for Nergal while allowing Shuruppak to carry the symbolic Geburah role in project structure |
| **Eres** | Nisaba/Nidaba | Sud narrative source setting | ancient source geography for `Enlil and Sud` | — | Preserve as source location even when fiction relocates the episode |
| **Uruk** | Inanna/Ishtar; An also major cult presence | Uttu is textually distinct but textile/weaving functions bridge into Inanna's thread/garment functions | feminine sovereignty, weaving-as-destiny, sexuality, political agency | Inanna/Venus ↔ Netzach | Fiction relocation of Sud/Nisaba material is deliberate symbolic consolidation, not source amnesia |
| **Ur** | Nanna/Suen | multiple major cults | law/time/foundation motifs | Nanna/Moon ↔ Yesod | historical and symbolic layers reinforce one another |
| **Larsa** | Utu/Shamash | — | solar justice, measure, boundary | Utu/Sun ↔ Tiphareth | historical and symbolic layers reinforce one another |

## Kish clarification

The correct data shape is:

```text
city:kish
  PATRON -> deity:zababa
  OFFERING_ATTESTED -> deity:an
  SYMBOLIC_CORRESPONDENCE -> deity:an / KETHER
```

The project should never force the user to choose exactly one of those three statements.

## Shuruppak clarification

The correct data shape is:

```text
city:shuruppak
  PATRON -> deity:sud-ninlil
  NARRATIVE_OFFICE -> SEVERITY / TRANSFORMATION
  SYMBOLIC_CORRESPONDENCE -> deity:nergal / GEBURAH

deity:nergal
  PRINCIPAL_CULT_CENTER -> city:kutha
```

This is the canonical example proving why `city.god` is an invalid model.

## Eres / Uruk clarification

```text
ancient source:
  location -> Eres
  mother/scribal deity -> Nisaba
  daughter -> Sud

fiction:
  staged location -> Uruk
  reason -> symbolic/narrative consolidation of the feminine civilizing node
```

The production system must preserve both locations and label the relationship `DELIBERATE_ADAPTATION`.

## Uttu / Inanna clarification

ETCSL places Uttu's textile/loom assignment immediately before Inanna's complaint and then assigns Inanna spindle, thread, garment and colored-cloth powers. This supports a strong **functional bridge**, not a literal ancient identity claim.

```text
Uttu -> ancient named weaving deity
Inanna -> ancient named goddess with overlapping textile/thread powers
Uttu -> Inanna -> project developmental manifestation
```

## Inanna / Ishtar clarification

This is not merely project metaphysics. ORACC describes Inanna (Sumerian) and Ishtar (Akkadian) as historically merged/identified traditions. The project may therefore treat this transition as historically grounded while still preserving cultural change over time.

## Lilith clarification

Lilith remains outside the historical city matrix unless a specific ancient source warrants a relationship. In project metaphysics she may be attached as a modern shadow/esoteric manifestation of the Inanna/Ishtar principle with `historicalIdentityClaim=false`.

## Rule

Historical correction must never erase intentional symbolism. Symbolic interpretation must never masquerade as historical patronage.

Both must be queryable at the same time.