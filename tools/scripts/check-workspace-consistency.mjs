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

const configuredPackages = configuredPlugins.map(packageRootFromSpecifier);
const missingPackages = [...new Set(configuredPackages)].filter(
  (pluginPackage) => !declared.has(pluginPackage),
);

if (missingPackages.length > 0) {
  console.error('Workspace dependency consistency check failed.');
  console.error('Nx plugin packages configured in nx.json but missing from package.json:');
  for (const pluginPackage of missingPackages) {
    console.error(`  - ${pluginPackage}`);
  }
  console.error('Declare each configured Nx plugin package explicitly before running Nx.');
  process.exit(1);
}

const requiredToolingPackages = ['@eslint/js'];
const missingToolingPackages = requiredToolingPackages.filter(
  (toolingPackage) => !declared.has(toolingPackage),
);

if (missingToolingPackages.length > 0) {
  console.error('Workspace tooling dependency consistency check failed.');
  console.error(
    'Root tooling packages required by the Nx/ESLint project graph are missing from package.json:',
  );
  for (const toolingPackage of missingToolingPackages) {
    console.error(`  - ${toolingPackage}`);
  }
  console.error('Declare each required tooling package explicitly before running Nx.');
  process.exit(1);
}

const startupEntrypoints = [
  'tools/scripts/start-local.mjs',
  'tools/scripts/start-all.mjs',
  'tools/scripts/renderer-worker.mjs',
];
const reviewEntrypoints = [
  'tools/scripts/review-animation-shot-runtime.mjs',
  'tools/scripts/review-animation-shot.mjs',
  'tools/scripts/review-animation-shot-delta-vision.mjs',
  'tools/scripts/reconcile-animation-review.mjs',
  'tools/scripts/verify-layered-candidate-scene-v2.mjs',
  'tools/scripts/verify-material-local-motion.mjs',
  'tools/scripts/verify-contained-material-boundary.mjs',
  'tools/scripts/promote-reviewed-shot.mjs',
  'tools/scripts/audit-animation-reel.mjs',
];
const renderEntrypoints = [
  'tools/scripts/render-animation-reel1.mjs',
  'tools/scripts/render-animation-proof.mjs',
];

const invalidStartupImports = await findDotenvBootstrapImports(startupEntrypoints);
if (invalidStartupImports.length > 0) {
  console.error('Workspace startup bootstrap consistency check failed.');
  console.error(
    'Managed runtime entrypoints must use Node native .env loading so they remain independent of undeclared bootstrap packages:',
  );
  for (const path of invalidStartupImports) {
    console.error(`  - ${path}`);
  }
  process.exit(1);
}

const invalidReviewImports = await findDotenvBootstrapImports(reviewEntrypoints);
if (invalidReviewImports.length > 0) {
  console.error('Workspace animation review runtime consistency check failed.');
  console.error(
    'Modern review, audit, and promotion entrypoints must not depend on undeclared dotenv/config bootstrap imports:',
  );
  for (const path of invalidReviewImports) {
    console.error(`  - ${path}`);
  }
  process.exit(1);
}

const invalidRenderImports = await findDotenvBootstrapImports(renderEntrypoints);
if (invalidRenderImports.length > 0) {
  console.error('Workspace animation render runtime consistency check failed.');
  console.error(
    'Reel 1 render entrypoints must use Node native .env loading and must not depend on undeclared dotenv/config bootstrap imports:',
  );
  for (const path of invalidRenderImports) {
    console.error(`  - ${path}`);
  }
  process.exit(1);
}

console.log(
  `Workspace dependency consistency OK: ${configuredPlugins.length} Nx plugins resolve to explicitly declared packages.`,
);
console.log(
  `Workspace tooling dependency consistency OK: ${requiredToolingPackages.length} root tooling package is explicitly declared.`,
);
console.log(
  `Workspace startup bootstrap consistency OK: ${startupEntrypoints.length} managed entrypoints are dependency-free for .env loading.`,
);
console.log(
  `Workspace animation review consistency OK: ${reviewEntrypoints.length} review/audit/promotion entrypoints are dependency-free for .env loading.`,
);
console.log(
  `Workspace animation render consistency OK: ${renderEntrypoints.length} Reel 1 render entrypoints are dependency-free for .env loading.`,
);

async function findDotenvBootstrapImports(paths) {
  const invalid = [];
  for (const path of paths) {
    const source = await readFile(resolve(root, path), 'utf8');
    if (/['"]dotenv\/config['"]/.test(source)) {
      invalid.push(path);
    }
  }
  return invalid;
}

function packageRootFromSpecifier(specifier) {
  const parts = specifier.split('/');
  if (specifier.startsWith('@')) {
    return parts.slice(0, 2).join('/');
  }
  return parts[0];
}
