import {
  createEntityProvenanceView,
  createTargetProvenanceView,
} from './provenance-query';

describe('Phase 1C provenance queries', () => {
  it('keeps Kish historical cult evidence separate from symbolic correspondence', () => {
    const view = createEntityProvenanceView('city:kish');

    expect(view.relationships.map((relationship) => relationship.id)).toEqual([
      'divine:kish:an:kether:v1',
      'divine:kish:an:offering:v1',
      'divine:kish:zababa:patron:v1',
    ]);
    expect(
      view.historicalRelationships.map((relationship) => relationship.relationship),
    ).toEqual(['OFFERING_ATTESTED', 'PATRON']);
    expect(
      view.interpretiveRelationships.map((relationship) => relationship.relationship),
    ).toEqual(['SYMBOLIC_CORRESPONDENCE']);
    expect(view.unresolvedSourceIds).toEqual([]);
  });

  it('shows Inanna as both an interpretive manifestation target and historical syncretism source', () => {
    const view = createEntityProvenanceView('deity:inanna');

    expect(view.relationships.map((relationship) => relationship.id)).toEqual([
      'divine:inanna:ishtar:syncretism:v1',
      'divine:uttu:inanna:manifestation:v1',
    ]);
    expect(view.historicalRelationships).toHaveLength(1);
    expect(view.historicalRelationships[0].relationship).toBe(
      'HISTORICAL_SYNCRETISM',
    );
    expect(view.interpretiveRelationships).toHaveLength(1);
    expect(view.interpretiveRelationships[0].relationship).toBe('MANIFESTATION');
    expect(view.sourceIds).toEqual([
      'etcsl-1.1.3',
      'reference:oracc:inanna-ishtar:v1',
    ]);
  });

  it('preserves Eres as source geography and Uruk as fiction geography', () => {
    const eres = createEntityProvenanceView('city:eres');
    const uruk = createEntityProvenanceView('city:uruk');

    expect(eres.sourceLocationAdaptations).toHaveLength(1);
    expect(eres.fictionLocationAdaptations).toHaveLength(0);
    expect(uruk.sourceLocationAdaptations).toHaveLength(0);
    expect(uruk.fictionLocationAdaptations).toHaveLength(1);
    expect(eres.sourceLocationAdaptations[0].id).toBe(
      'location:enlil-sud:eres-to-uruk:v1',
    );
    expect(uruk.fictionLocationAdaptations[0].id).toBe(
      'location:enlil-sud:eres-to-uruk:v1',
    );
  });

  it('resolves target evidence while surfacing rights constraints independently', () => {
    const view = createTargetProvenanceView('costume:enlil:baseline:v1');

    expect(view.applications).toHaveLength(1);
    expect(view.applications[0].evidence?.id).toBe(
      'visual:bm:standard-of-ur:1928-1010-3:v1',
    );
    expect(view.unresolvedEvidenceIds).toEqual([]);
    expect(view.rightsWarnings).toEqual([
      'application:standard-ur:enlil-costume-context:v1: metadata-only',
    ]);
  });

  it('returns a deterministic empty view for an unknown entity or target', () => {
    expect(createEntityProvenanceView('deity:the-raccoon').relationships).toEqual([]);
    expect(createTargetProvenanceView('scene:missing').applications).toEqual([]);
  });
});
