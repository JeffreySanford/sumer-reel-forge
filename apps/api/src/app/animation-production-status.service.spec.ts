import { AnimationProductionStatusService } from './animation-production-status.service';

describe('AnimationProductionStatusService', () => {
  const service = new AnimationProductionStatusService();

  it('reports the approved Shot 3 and Shot 4 production benchmarks as layered-ready', async () => {
    const status = await service.getStatus();

    expect(status.manifestId).toBe('chapter-01-reel-01-animation-v1');
    expect(status.principle).toBe('AI proposes. Rules constrain. Human directs.');

    const shot3 = status.shots.find((shot) => shot.sourceShotNumber === 3);
    const shot4 = status.shots.find((shot) => shot.sourceShotNumber === 4);

    expect(shot3?.activationState).toBe('layered-ready');
    expect(shot4?.activationState).toBe('layered-ready');
    expect(shot3?.readyRequiredLayerCount).toBe(4);
    expect(shot4?.readyRequiredLayerCount).toBe(4);

    for (const shot of [shot3, shot4]) {
      expect(shot).toBeDefined();
      for (const layer of shot?.layers.filter((item) => item.required) ?? []) {
        expect(layer.fileExists).toBe(true);
        expect(layer.dimensionsMatchSource).toBe(true);
        expect(layer.checksumMatches).toBe(true);
        expect(layer.reviewStatus).toBe('approved');
        expect(layer.ready).toBe(true);
      }
    }

    expect(status.summary.layeredReadyCount).toBeGreaterThanOrEqual(2);
    expect(status.summary.approvedRequiredLayerCount).toBeGreaterThanOrEqual(8);
  });

  it('keeps Nammu creative policy provisional while exposing executable lane metadata', async () => {
    const status = await service.getStatus();
    const shot4 = status.shots.find((shot) => shot.sourceShotNumber === 4);
    const midCurrent = shot4?.layers.find(
      (layer) => layer.id === 'shot04-mid-current-v1',
    );
    const coherence = shot4?.layers.find(
      (layer) => layer.id === 'shot04-nammu-coherence-mask-v1',
    );

    expect(midCurrent?.lane?.id).toBe('semantic-water-overlay');
    expect(midCurrent?.lane?.generatorFamily).toBe('sam3-semantic-overlay');
    expect(coherence?.lane?.id).toBe('environmental-coherence-mask');
    expect(coherence?.coverageAdvisory).toBe('SPARSE_REVIEW_REQUIRED');

    const nammuDecision = shot4?.decisions.find(
      (decision) => decision.id === 'nammu-environmental-coherence',
    );
    expect(nammuDecision?.state).toBe('provisional');
    expect(nammuDecision?.value).toBe('environmental-coherence');
  });
});
