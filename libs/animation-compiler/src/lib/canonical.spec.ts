import {
  canonicalJson,
  canonicalize,
  diffCanonicalPaths,
  normalizeLogicalPath,
  sha256Canonical,
} from './canonical';

describe('Scene V3 canonicalization', () => {
  it('normalizes object key order deterministically', () => {
    expect(canonicalJson({ b: 2, a: 1 })).toBe(canonicalJson({ a: 1, b: 2 }));
  });

  it('sorts only schema-declared set-like arrays', () => {
    const options = { setLikeArrayPaths: new Set(['/sourceIds']) };
    expect(
      canonicalJson({ sourceIds: ['source:b', 'source:a'] }, options),
    ).toBe(canonicalJson({ sourceIds: ['source:a', 'source:b'] }, options));
  });

  it('preserves authored array order when order is semantic', () => {
    expect(canonicalJson({ keyframes: [{ frame: 0 }, { frame: 10 }] })).not.toBe(
      canonicalJson({ keyframes: [{ frame: 10 }, { frame: 0 }] }),
    );
  });

  it('normalizes portable logical paths', () => {
    expect(normalizeLogicalPath('.\\actors\\enki\\rig.riv')).toBe(
      'actors/enki/rig.riv',
    );
  });

  it('rejects absolute and traversal paths', () => {
    expect(() => normalizeLogicalPath('D:\\actors\\enki.riv')).toThrow(RangeError);
    expect(() => normalizeLogicalPath('/tmp/enki.riv')).toThrow(RangeError);
    expect(() => normalizeLogicalPath('actors/../secrets.riv')).toThrow(RangeError);
  });

  it('forbids undefined rather than silently dropping it', () => {
    expect(() => canonicalize({ optional: undefined })).toThrow(TypeError);
  });

  it('preserves null and normalizes negative zero', () => {
    expect(canonicalize({ nullable: null, zero: -0 })).toEqual({
      nullable: null,
      zero: 0,
    });
  });

  it('rejects NaN and infinities', () => {
    expect(() => canonicalize({ value: Number.NaN })).toThrow(TypeError);
    expect(() => canonicalize({ value: Number.POSITIVE_INFINITY })).toThrow(TypeError);
    expect(() => canonicalize({ value: Number.NEGATIVE_INFINITY })).toThrow(TypeError);
  });

  it('pins a cross-platform canonical UTF-8 fixture hash', () => {
    const fixture = {
      assets: [
        {
          id: 'asset:a',
          logicalPath: 'actors/enki/rig.riv',
          sha256: `sha256:${'a'.repeat(64)}`,
        },
      ],
      runtime: { id: 'runtime:fake', version: '1.0.0' },
      sceneId: 'scene:test:canonical',
      seed: 12345,
      sourceIds: ['source:b', 'source:a'],
    };
    expect(
      sha256Canonical(fixture, {
        setLikeArrayPaths: new Set(['/assets', '/sourceIds']),
      }),
    ).toBe('sha256:7047219784a6214ea86acba917837d930e4dfbda9deadd09e098d5693cd15cd2');
  });

  it('reports canonical paths that explain a hash difference', () => {
    expect(
      diffCanonicalPaths(
        { assets: [{ id: 'asset:a', sha256: 'one' }], runtime: { version: '1' } },
        { assets: [{ id: 'asset:a', sha256: 'two' }], runtime: { version: '2' } },
      ),
    ).toEqual(['/assets/0/sha256', '/runtime/version']);
  });
});
