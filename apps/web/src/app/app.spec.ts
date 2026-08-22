import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DEFAULT_NARRATION_SETTINGS } from '@sumer-reel-forge/reel-core';
import { App } from './app';

const TEST_EPISODE = {
  series: 'Blessings of Sumer',
  chapter: 1,
  episode: 1,
  title: 'The Voyage Begins',
  targetDurationSeconds: 60,
  sourceSection: 'The Voyage',
  hook: 'A god crosses the sea without knowing why.',
  visualCore: 'Stag of the Absu, coastline, Nammu beneath the waters',
  logline: 'Enki sails toward Dilmun.',
  narration: 'The voyage begins.',
  onScreenText: [{ time: '00:00', text: 'Before Sumer...' }],
  shots: [
    {
      time: '00:00-00:06',
      durationSeconds: 6,
      visual: 'Black water before dawn.',
      motion: 'slow push in',
      prompt: 'cinematic ancient Mesopotamian myth',
    },
  ],
  musicDirection: 'Low frame drum.',
  voiceDirection: 'Calm mythic narrator.',
  platformNotes: ['Keep captions centered.'],
  exportMetadata: {
    facebookCaption: 'Facebook caption.',
    xPost: 'X post.',
    tiktokCaption: 'TikTok caption.',
    youtubeShortsTitle: 'Shorts title',
    tags: ['Sumer'],
  },
  productionStatus: 'draft' as const,
};

const PLANNING_CAPABILITIES = {
  defaultProvider: 'ollama' as const,
  providers: [
    {
      id: 'deterministic' as const,
      available: true,
      text: true,
      vision: false,
      structuredOutput: true,
    },
    {
      id: 'ollama' as const,
      available: true,
      configuredModel: 'qwen3:8b',
      configuredVisionModel: 'qwen3-vl:4b-instruct',
      text: true,
      vision: true,
      structuredOutput: true,
    },
  ],
};

describe('App', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('renders the first reel title and local direction runtime', async () => {
    const fixture = TestBed.createComponent(App);
    flushParentStartup(httpTesting, TEST_EPISODE);

    fixture.detectChanges();
    httpTesting
      .expectOne('/api/planning/capabilities')
      .flush(PLANNING_CAPABILITIES);

    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('The Voyage Begins');
    expect(compiled.textContent).toContain('Direction');
    expect(compiled.textContent).toContain('qwen3:8b');
    expect(compiled.textContent).toContain('qwen3-vl:4b-instruct');
  });

  it('saves production edits', async () => {
    const fixture = TestBed.createComponent(App);
    flushParentStartup(httpTesting, {
      ...TEST_EPISODE,
      visualCore: 'Stag of the Absu',
      logline: 'Initial logline.',
      narration: 'Initial narration.',
    });

    fixture.detectChanges();
    httpTesting
      .expectOne('/api/planning/capabilities')
      .flush(PLANNING_CAPABILITIES);
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const logline = compiled.querySelector('.script-panel textarea');
    if (!(logline instanceof HTMLTextAreaElement)) {
      throw new Error('Expected editable logline textarea.');
    }

    logline.value = 'Saved logline.';
    logline.dispatchEvent(new Event('input'));
    compiled
      .querySelectorAll('button')
      .forEach((button) =>
        button.textContent?.includes('Save edits') ? button.click() : undefined,
      );

    const saveRequest = httpTesting.expectOne(
      '/api/chapters/1/reels/1/production',
    );
    expect(saveRequest.request.method).toBe('PATCH');
    expect(saveRequest.request.body.logline).toBe('Saved logline.');
    saveRequest.flush({
      ...saveRequest.request.body,
      series: 'Blessings of Sumer',
      chapter: 1,
      episode: 1,
      title: 'The Voyage Begins',
      targetDurationSeconds: 60,
      sourceSection: 'The Voyage',
      hook: 'A god crosses the sea without knowing why.',
      visualCore: 'Stag of the Absu',
      productionStatus: 'draft',
    });

    await fixture.whenStable();
    fixture.detectChanges();
    expect(compiled.textContent).toContain('Production saved');
  });

  it('requests direction for the selected shot from Ollama', async () => {
    const fixture = TestBed.createComponent(App);
    flushParentStartup(httpTesting, TEST_EPISODE);
    fixture.detectChanges();
    httpTesting
      .expectOne('/api/planning/capabilities')
      .flush(PLANNING_CAPABILITIES);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const generateButton = Array.from(compiled.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Generate Direction'),
    );
    if (!(generateButton instanceof HTMLButtonElement)) {
      throw new Error('Expected Generate Direction button.');
    }

    generateButton.click();
    const planningRequest = httpTesting.expectOne('/api/planning/shot-plan');
    expect(planningRequest.request.method).toBe('POST');
    expect(planningRequest.request.body.provider).toBe('ollama');
    expect(planningRequest.request.body.shotId).toBe('black-water-before-dawn');
    planningRequest.flush({
      eyeTarget: 'waterline',
      stillnessAnchor: 'primary-subject-composition',
      camera: {
        preset: 'cinematicSlow',
        scaleFrom: 1,
        scaleTo: 1.02,
        easing: 'cinematicSlow',
      },
      motionBudget: {
        primary: 'slow-push',
        subject: 'boat-silhouette',
        environment: ['water-multi-frequency'],
        lighting: 'pre-dawn-natural',
      },
      requiredAssets: [
        'assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-01.png',
      ],
      inheritedStyleRules: [
        'camera.default.maxPushPercent = 5',
        'narratorOnly.lipSync = false',
        'foregroundOcclusion.mustAvoid = captions',
        'material.water.motion = multi-frequency',
      ],
      unresolvedQuestions: [],
      rationale: 'Keep the opening restrained and physically credible.',
      provider: 'ollama',
      model: 'qwen3:8b',
      shotId: 'black-water-before-dawn',
      status: 'proposal',
    });

    await fixture.whenStable();
    fixture.detectChanges();
    expect(compiled.textContent).toContain('Keep the opening restrained');
    expect(compiled.textContent).toContain('PASS');
  });
});

function flushParentStartup(
  httpTesting: HttpTestingController,
  episode: typeof TEST_EPISODE,
): void {
  httpTesting
    .expectOne('/api/projects/blessings-of-sumer/chapters/1/narration')
    .flush(DEFAULT_NARRATION_SETTINGS);
  httpTesting.expectOne('/api/chapters/1/reels').flush([]);
  httpTesting.expectOne('/api/chapters/1/reels/1').flush(episode);
  httpTesting.expectOne('/api/render-jobs?episodeId=1').flush([]);
  httpTesting.expectOne('/api/generated-assets?episodeId=1').flush([]);
}
