import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(
  await readFile(resolve(root, 'package.json'), 'utf8'),
);
const nxJson = JSON.parse(await readFile(resolve(root, 'nx.json'), 'utf8'));

const declared = new Set([
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.devDependencies ?? {}),
  ...Object.keys(packageJson.optionalDependencies ?? {}),
]);

const configuredPlugins = (nxJson.plugins ?? [])
  .map((entry) => (typeof entry === 'string' ? entry : entry?.plugin))
  .filter((entry) => typeof entry === 'string' && entry.length > 0);

const missingPlugins = configuredPlugins.filter((plugin) => !declared.has(plugin));

if (missingPlugins.length > 0) {
  console.error('Workspace dependency consistency check failed.');
  console.error('Nx plugins configured in nx.json but missing from package.json:');
  for (const plugin of missingPlugins) {
    console.error(`  - ${plugin}`);
  }
  console.error('Declare each configured Nx plugin explicitly before running Nx.');
  process.exit(1);
}

console.log(
  `Workspace dependency consistency OK: ${configuredPlugins.length} Nx plugins are explicitly declared.`,
);
