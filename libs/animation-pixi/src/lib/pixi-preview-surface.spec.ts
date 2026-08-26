import { describe, expect, it } from 'vitest';
import {
  buildPixiApplicationOptions,
  PIXI_PREVIEW_RENDER_MODE,
} from './pixi-preview-surface';

describe('Pixi preview surface policy', () => {
  it('uses a manual WebGL renderer with both Pixi tickers disabled', () => {
    const options = buildPixiApplicationOptions(1080, 1920);

    expect(PIXI_PREVIEW_RENDER_MODE).toBe('manual-exact-frame');
    expect(options).toEqual({
      width: 1080,
      height: 1920,
      autoStart: false,
      sharedTicker: false,
      antialias: false,
      backgroundColor: 0x05080d,
      backgroundAlpha: 1,
      resolution: 1,
      preference: 'webgl',
    });
  });

  it('rejects invalid viewport dimensions before Pixi initialization', () => {
    expect(() => buildPixiApplicationOptions(0, 1920)).toThrow(/positive integer/i);
    expect(() => buildPixiApplicationOptions(1080, -1)).toThrow(/positive integer/i);
    expect(() => buildPixiApplicationOptions(1080.5, 1920)).toThrow(/positive integer/i);
  });
});
