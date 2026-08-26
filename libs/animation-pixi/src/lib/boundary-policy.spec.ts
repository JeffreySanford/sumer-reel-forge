import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(sourceDirectory, '../../../..');
const adapterSource = readFileSync(join(sourceDirectory, 'pixi-preview-surface.ts'), 'utf8');

function productionTypeScriptFiles(directory: string): readonly string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      files.push(...productionTypeScriptFiles(path));
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry) || /\.(spec|test)\.(ts|tsx)$/.test(entry)) continue;
    files.push(path);
  }
  return files;
}

describe('animation Pixi boundary policy', () => {
  it('keeps the third-party Pixi import inside the dedicated adapter library', () => {
    expect(adapterSource).toContain("import('pixi.js')");

    const roots = [join(repositoryRoot, 'apps'), join(repositoryRoot, 'libs')];
    const otherSources = roots
      .flatMap(productionTypeScriptFiles)
      .filter((path) => !path.includes(join('libs', 'animation-pixi')));

    for (const path of otherSources) {
      const source = readFileSync(path, 'utf8');
      expect(
        source,
        `${relative(repositoryRoot, path)} imports pixi.js outside animation-pixi`,
      ).not.toContain('pixi.js');
    }
  });

  it('does not introduce a browser-clock loop inside the Pixi adapter', () => {
    expect(adapterSource).not.toContain('requestAnimationFrame(');
    expect(adapterSource).not.toContain('.ticker.start(');
    expect(adapterSource).toContain('app.ticker.stop()');
    expect(adapterSource).toContain('app.renderer.render(');
  });
});
