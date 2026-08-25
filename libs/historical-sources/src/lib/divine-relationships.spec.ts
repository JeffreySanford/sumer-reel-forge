import {
  DIVINE_RELATIONSHIPS,
  NARRATIVE_LOCATION_ADAPTATIONS,
  getDivineRelationshipsForSubject,
  getHistoricalCityBindings,
  normalizeSemanticEntityId,
  validateDivineRelationship,
  validateDivineRelationshipRegistry,
  validateNarrativeLocationAdaptation,
  type DivineRelationship,
} from './divine-relationships';

describe('Phase 1B divine manifestation and cult identity', () => {
  it('represents Kish patronage, An cult presence and An/Kether symbolism without overwriting any layer', () => {
    const historical = getHistoricalCityBindings('city:kish');
    const all = getDivineRelationshipsForSubject('city:kish');

    expect(historical).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          objectId: 'deity:zababa',
          relationship: 'PATRON',
          historicalIdentityClaim: true,
        }),
        expect.objectContaining({
          objectId: 'deity:an',
          relationship: 'OFFERING_ATTESTED',
          historicalIdentityClaim: true,
        }),
      ]),
    );

    expect(all).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          objectId: 'deity:an',
          relationship: 'SYMBOLIC_CORRESPONDENCE',
          symbolicNode: 'KETHER',
          historicalIdentityClaim: false,
        }),
      ]),
    );
  });

  it('keeps Shuruppak historical patronage separate from the Nergal/Geburah project office', () => {
    const relationships = getDivineRelationshipsForSubject('city:shuruppak');

    expect(relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          objectId: 'deity:sud-ninlil',
          relationship: 'PATRON',
          provenanceClass: 'DIRECT_HISTORICAL',
        }),
        expect.objectContaining({
          objectId: 'deity:nergal',
          relationship: 'SYMBOLIC_CORRESPONDENCE',
          provenanceClass: 'PROJECT_METAPHYSICS',
          historicalIdentityClaim: false,
          symbolicNode: 'GEBURAH',
        }),
      ]),
    );
  });

  it('distinguishes project manifestation from historical syncretism in the Uttu-Inanna-Ishtar arc', () => {
    const uttu = getDivineRelationshipsForSubject('deity:uttu');
    const inanna = getDivineRelationshipsForSubject('deity:inanna');

    expect(uttu).toEqual([
      expect.objectContaining({
        objectId: 'deity:inanna',
        relationship: 'MANIFESTATION',
        provenanceClass: 'PROJECT_METAPHYSICS',
        historicalIdentityClaim: false,
      }),
    ]);

    expect(inanna).toEqual([
      expect.objectContaining({
        objectId: 'deity:ishtar',
        relationship: 'HISTORICAL_SYNCRETISM',
        provenanceClass: 'DIRECT_HISTORICAL',
        historicalIdentityClaim: true,
      }),
    ]);
  });

  it('keeps Lilith as a modern shadow correspondence rather than ancient identity', () => {
    const relationship = getDivineRelationshipsForSubject('deity:ishtar')[0];

    expect(relationship).toEqual(
      expect.objectContaining({
        objectId: 'deity:lilith',
        relationship: 'MANIFESTATION',
        provenanceClass: 'MODERN_SYMBOLIC_CORRESPONDENCE',
        historicalIdentityClaim: false,
        qualifier: 'SHADOW_CORRESPONDENCE',
      }),
    );
  });

  it('does not infer historical transitivity from Uttu through Inanna to Ishtar', () => {
    const directUttuRelationships = getDivineRelationshipsForSubject('deity:uttu');

    expect(directUttuRelationships.map((item) => item.objectId)).toEqual([
      'deity:inanna',
    ]);
    expect(directUttuRelationships.map((item) => item.objectId)).not.toContain(
      'deity:ishtar',
    );
  });

  it('preserves Eres as source geography while keeping Uruk as the deliberate fiction location', () => {
    const adaptation = NARRATIVE_LOCATION_ADAPTATIONS[0];

    expect(adaptation).toEqual(
      expect.objectContaining({
        sourceLocationId: 'city:eres',
        fictionLocationId: 'city:uruk',
        adaptationClass: 'DELIBERATE_ADAPTATION',
      }),
    );
    expect(validateNarrativeLocationAdaptation(adaptation).valid).toBe(true);
  });

  it('rejects symbolic correspondence that attempts to certify itself as historical cult identity', () => {
    const relationship: DivineRelationship = {
      ...DIVINE_RELATIONSHIPS.find(
        (item) => item.id === 'divine:kish:an:kether:v1',
      )!,
      id: 'divine:test:false-history:v1',
      historicalIdentityClaim: true,
    };

    const validation = validateDivineRelationship(relationship);
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toContain(
      'DIVINE-ONTOLOGY-002-symbolic-node-not-promoted-to-historical-cult',
    );
  });

  it('keeps Utu and Uttu distinct under semantic id normalization', () => {
    expect(normalizeSemanticEntityId('deity:utu')).toBe('deity:utu');
    expect(normalizeSemanticEntityId('deity:uttu')).toBe('deity:uttu');
    expect(normalizeSemanticEntityId('deity:utu')).not.toBe(
      normalizeSemanticEntityId('deity:uttu'),
    );
  });

  it('keeps the difficult relationship registry valid', () => {
    expect(validateDivineRelationshipRegistry()).toEqual({
      valid: true,
      issues: [],
    });
  });
});
