import { expect, test, type Page } from '@playwright/test';

const production = {
  principle: 'AI proposes. Rules constrain. Human directs.',
  observedAt: '2026-08-28T20:00:00.000Z',
  shots: [
    {
      shotId: 'enki-at-the-helm',
      sourceShotNumber: 3,
      status: 'approved',
      activationState: 'layered-ready',
      requiredLayerCount: 2,
      readyRequiredLayerCount: 2,
      optionalLayerCount: 2,
      decisions: [],
      layers: [
        {
          id: 'shot03-vessel-v1',
          role: 'prop',
          material: 'rigid-vessel',
          required: true,
          ready: true,
          state: 'approved',
          reviewStatus: 'approved',
          motionPresets: ['heave', 'roll'],
          lane: { id: 'source-preservation', generatorFamily: 'source-preservation', qaFamily: 'identity-motion' },
        },
      ],
    },
    {
      shotId: 'nammu-under-water',
      sourceShotNumber: 4,
      status: 'approved',
      activationState: 'layered-ready',
      requiredLayerCount: 4,
      readyRequiredLayerCount: 4,
      optionalLayerCount: 2,
      decisions: [],
      layers: [],
    },
  ],
};

const evidence = {
  shots: [
    {
      sourceShotNumber: 3,
      available: true,
      videoUrl: 'data:video/mp4;base64,',
      contactSheetUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
      renderedAt: '2026-08-28T20:00:00.000Z',
    },
    {
      sourceShotNumber: 4,
      available: true,
      videoUrl: 'data:video/mp4;base64,',
      contactSheetUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
      renderedAt: '2026-08-28T20:00:00.000Z',
    },
  ],
};

const providers = [
  {
    id: 'ollama',
    available: true,
    configuredModel: 'qwen3:8b',
    text: true,
    vision: true,
    structuredOutput: true,
    managedUnload: true,
    openAiCompatible: false,
    detail: 'Playwright managed Ollama fixture.',
  },
];

const proposal = {
  schemaVersion: 1,
  id: 'e2e-proposal-001',
  state: 'proposal',
  shot: 3,
  shotId: 'enki-at-the-helm',
  provider: 'ollama',
  model: 'qwen3:8b',
  createdAt: '2026-08-28T20:01:00.000Z',
  canonicalObservedAt: production.observedAt,
  summary: 'Heavier vessel motion with restrained counter-sway.',
  parameters: [
    { id: 'vesselHeave', label: 'Vessel heave', value: 0.72, minimum: 0, maximum: 1, rationale: 'Heavy low-frequency motion.' },
    { id: 'vesselRoll', label: 'Vessel roll', value: 0.31, minimum: 0, maximum: 1, rationale: 'Keep roll restrained.' },
    { id: 'enkiCounterSway', label: 'Enki counter-sway', value: 0.44, minimum: 0, maximum: 1, rationale: 'Small planted compensation.' },
    { id: 'cameraPush', label: 'Camera push', value: 0.22, minimum: 0, maximum: 1, rationale: 'Restrained cinematic push.' },
  ],
  guardrails: [
    'Proposal is ephemeral API output; no database or filesystem write occurs.',
    'Apply changes React working state only; canonical production state is unchanged.',
    'No proposal may promote or mutate animation-v1.',
  ],
};

async function routeForgeApis(page: Page, proposalStatus = 200): Promise<void> {
  await page.route('**/api/runtime/animation-production', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(production) }),
  );
  await page.route('**/api/runtime/animation-production-evidence', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(evidence) }),
  );
  await page.route('**/api/local-ai/providers', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(providers) }),
  );
  await page.route('**/api/forge/motion-proposals', async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    expect(body).toMatchObject({ shot: 3, provider: 'ollama', model: 'qwen3:8b' });
    if (proposalStatus !== 200) {
      await route.fulfill({
        status: proposalStatus,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Synthetic Forge proposal failure.' }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(proposal) });
  });
}

test('auditions a bounded AI proposal without changing canonical Pixi state', async ({ page }) => {
  await routeForgeApis(page);
  await page.goto('/forge/shot/3');

  await expect(page.getByRole('heading', { name: 'Canonical animation workbench' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Shot 3 · enki-at-the-helm' })).toBeVisible();
  await expect(page.getByText('Required layers: 2/2 ready · Optional: 2')).toBeVisible();
  await expect(page.getByLabel('Shot 3 benchmark video')).toBeVisible();
  await expect(page.getByText('Playwright managed Ollama fixture.')).toBeVisible();

  const pixiHost = page.locator('[aria-label="Pixi Shot 3 full-motion renderer"]');
  await expect(pixiHost).toHaveAttribute('data-shot03-vessel', 'heave=-4.095,roll=-0.001257');
  const canonicalBefore = await pixiHost.getAttribute('data-shot03-vessel');

  await page.getByLabel('Optional human direction').fill('Make the vessel feel heavier without increasing character motion.');
  await page.getByRole('button', { name: 'Propose with ollama' }).click();

  await expect(page.getByText('Heavier vessel motion with restrained counter-sway.')).toBeVisible();
  await expect(page.getByText('e2e-proposal-001')).toBeVisible();
  await expect(page.getByText('vesselHeave')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apply to working state' })).toBeVisible();
  await expect(page.getByRole('button', { name: /approve/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /promote/i })).toHaveCount(0);

  await page.getByRole('button', { name: 'Apply to working state' }).click();
  await expect(page.getByLabel('React working motion state')).toBeVisible();

  const heave = page.getByRole('slider', { name: 'Vessel heave' });
  await expect(heave).toHaveValue('0.72');
  await heave.fill('0.55');
  await expect(heave).toHaveValue('0.55');
  await expect(pixiHost).toHaveAttribute('data-shot03-vessel', canonicalBefore ?? '');

  await page.getByRole('button', { name: 'Reset working state' }).click();
  await expect(page.getByLabel('React working motion state')).toHaveCount(0);

  await page.getByRole('button', { name: 'Shot 4' }).click();
  await expect(page).toHaveURL(/\/forge\/shot\/4$/);
  await expect(page.getByRole('heading', { name: 'Shot 4 · nammu-under-water' })).toBeVisible();
  await expect(page.getByText('Shot 4 Scene V3 runtime is not fabricated')).toBeVisible();
  await expect(page.getByLabel('Shot 4 benchmark video')).toBeVisible();
});

test('surfaces proposal failures without creating working state', async ({ page }) => {
  await routeForgeApis(page, 503);
  await page.goto('/forge/shot/3');

  await page.getByRole('button', { name: 'Propose with ollama' }).click();

  await expect(page.getByRole('alert')).toContainText('Synthetic Forge proposal failure.');
  await expect(page.getByLabel('React working motion state')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /approve/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /promote/i })).toHaveCount(0);
});
