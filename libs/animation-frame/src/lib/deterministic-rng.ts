export interface DeterministicRng {
  nextUint32(): number;
  nextFloat(): number;
  nextInt(minInclusive: number, maxExclusive: number): number;
}

export function createDeterministicRng(seed: number): DeterministicRng {
  if (!Number.isInteger(seed)) {
    throw new TypeError('seed must be an integer.');
  }

  let state = seed >>> 0;

  function nextUint32(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return (value ^ (value >>> 14)) >>> 0;
  }

  function nextFloat(): number {
    return nextUint32() / 0x100000000;
  }

  function nextInt(minInclusive: number, maxExclusive: number): number {
    if (
      !Number.isInteger(minInclusive) ||
      !Number.isInteger(maxExclusive) ||
      maxExclusive <= minInclusive
    ) {
      throw new RangeError('nextInt requires integer bounds with maxExclusive > minInclusive.');
    }
    return minInclusive + Math.floor(nextFloat() * (maxExclusive - minInclusive));
  }

  return Object.freeze({ nextUint32, nextFloat, nextInt });
}
