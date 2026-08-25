import {
  createProvenanceSummary,
  getEvidenceForTarget,
  getRightsWarningsForTarget,
  getStaleApplications,
} from './provenance-report';

describe('Phase 1B provenance report', () => {
  it('produces a deterministic summary without timestamps or presentation markup', () => {
    const summary = createProvenanceSummary();

    expect(summary).toEqual({
      historicalSourceCount: 16,
      etcslSourceCount: 8,
      nonEtcslSourceCount: 8,
      supplementalSourceCount: 6,
      researchNeededSourceCount: 2,
      visualEvidenceCount: 3,
      visualApplicationCount: 5,
      applicationsByRelationship: [
        { key: 'analogical', count: 1 },
        { key: 'contextual', count: 3 },
        { key: 'direct', count: 1 },
      ],
      applicationsByConfidence: [
        { key: 'analogical', count: 1 },
        { key: 'high', count: 2 },
        { key: 'medium', count: 2 },
      ],
      rightsModes: [
        { key: 'metadata-only', count: 2 },
        { key: 'public-domain', count: 1 },
      ],
      unresolvedReferences: [],
      staleApplications: [],
      divineRelationshipCount: 8,
      divineRelationshipsByType: [
        { key: 'HISTORICAL_SYNCRETISM', count: 1 },
        { key: 'MANIFESTATION', count: 2 },
        { key: 'OFFERING_ATTESTED', count: 1 },
        { key: 'PATRON', count: 2 },
        { key: 'SYMBOLIC_CORRESPONDENCE', count: 2 },
      ],
      locationAdaptationCount: 1,
    });

    expect(JSON.stringify(summary)).not.toMatch(/<\/?[a-z][^>]*>/i);
  });

  it('returns evidence and application together for a target', () => {
    const results = getEvidenceForTarget('costume:enlil:baseline:v1');

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(
      expect.objectContaining({
        application: expect.objectContaining({
          id: 'application:standard-ur:enlil-costume-context:v1',
        }),
        evidence: expect.objectContaining({
          id: 'visual:bm:standard-of-ur:1928-1010-3:v1',
        }),
      }),
    );
  });

  it('surfaces rights warnings without treating historical confidence as permission', () => {
    expect(getRightsWarningsForTarget('costume:enlil:baseline:v1')).toEqual([
      'application:standard-ur:enlil-costume-context:v1: metadata-only',
    ]);

    expect(getRightsWarningsForTarget('scene:chapter2:banquet')).toEqual([]);
  });

  it('keeps stale application reporting deterministic', () => {
    expect(getStaleApplications()).toEqual([]);
  });
});
