import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

function productionSourceRoot(): string {
  const workspacePath = resolve(process.cwd(), 'libs/animation-runtime/src/lib');
  if (existsSync(workspacePath)) return workspacePath;
  return resolve(process.cwd(), 'src/lib');
}

describe('runtime adapter determinism policy', () => {
  it('contains no wall-clock or global-random animation state', async () => {
    const root = productionSourceRoot();
    const files = (await readdir(root))
      .filter((file) => file.endsWith('.ts') && !file.endsWith('.spec.ts'))
      .sort();
    const forbidden = [
      /Math\.random\s*\(/,
      /Date\.now\s*\(/,
      /performance\.now\s*\(/,
      /new\s+Date\s*\(/,
    ];

    for (const file of files) {
      const source = await readFile(resolve(root, file), 'utf8');
      for (const pattern of forbidden) expect(source).not.toMatch(pattern);
    }
  });
});
