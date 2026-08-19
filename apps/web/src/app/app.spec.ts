import { TestBed } from '@angular/core/testing';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
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
    });
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('The Voyage Begins');
  });
});
