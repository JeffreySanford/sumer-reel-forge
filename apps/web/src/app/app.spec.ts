import { TestBed } from '@angular/core/testing';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { DEFAULT_NARRATION_SETTINGS } from '@sumer-reel-forge/reel-core';
import { App } from './app';

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

  it('renders the first reel title', async () => {
    const fixture = TestBed.createComponent(App);
    httpTesting
      .expectOne('/api/projects/blessings-of-sumer/chapters/1/narration')
      .flush(DEFAULT_NARRATION_SETTINGS);
    httpTesting.expectOne('/api/chapters/1/reels').flush([]);
    httpTesting.expectOne('/api/chapters/1/reels/1').flush({
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
      productionStatus: 'draft',
    });
    httpTesting.expectOne('/api/render-jobs?episodeId=1').flush([]);
    httpTesting.expectOne('/api/generated-assets?episodeId=1').flush([]);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('The Voyage Begins');
  });

  it('saves production edits', async () => {
    const fixture = TestBed.createComponent(App);
    httpTesting
      .expectOne('/api/projects/blessings-of-sumer/chapters/1/narration')
      .flush(DEFAULT_NARRATION_SETTINGS);
    httpTesting.expectOne('/api/chapters/1/reels').flush([]);
    httpTesting.expectOne('/api/chapters/1/reels/1').flush({
      series: 'Blessings of Sumer',
      chapter: 1,
      episode: 1,
      title: 'The Voyage Begins',
      targetDurationSeconds: 60,
      sourceSection: 'The Voyage',
      hook: 'A god crosses the sea without knowing why.',
      visualCore: 'Stag of the Absu',
      logline: 'Initial logline.',
      narration: 'Initial narration.',
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
      productionStatus: 'draft',
    });
    httpTesting.expectOne('/api/render-jobs?episodeId=1').flush([]);
    httpTesting.expectOne('/api/generated-assets?episodeId=1').flush([]);
    fixture.detectChanges();
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
});
