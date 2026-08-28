import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('React Forge API proxy', () => {
  it('routes /api through the Nest service in dev and preview', async () => {
    const configPath = fileURLToPath(
      new URL('../../vite.config.mts', import.meta.url),
    );
    const source = await readFile(configPath, 'utf8');

    expect(source).toContain("'http://localhost:3000'");
    expect(source).toContain("'/api'");
    expect(source.match(/proxy: apiProxy/g)).toHaveLength(2);
    expect(source).toContain('changeOrigin: true');
  });
});
