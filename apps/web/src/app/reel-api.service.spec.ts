import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CHAPTER_ONE_REELS } from '@sumer-reel-forge/reel-core';
import { ReelApiService } from './reel-api.service';

describe('ReelApiService episode loading', () => {
  let service: ReelApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ReelApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ReelApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('ignores an older episode response after a newer selection is requested', () => {
    const receivedEpisodes: number[] = [];

    service
      .getChapterOneEpisode(1)
      .subscribe((episode) => receivedEpisodes.push(episode.episode));
    service
      .getChapterOneEpisode(2)
      .subscribe((episode) => receivedEpisodes.push(episode.episode));

    const reelOneRequest = httpTesting.expectOne('/api/chapters/1/reels/1');
    const reelTwoRequest = httpTesting.expectOne('/api/chapters/1/reels/2');

    reelTwoRequest.flush(CHAPTER_ONE_REELS[1]);
    reelOneRequest.flush(CHAPTER_ONE_REELS[0]);

    expect(receivedEpisodes).toEqual([2]);
  });

  it('still returns the requested fallback when the latest request fails', () => {
    let receivedEpisode: number | undefined;

    service
      .getChapterOneEpisode(2)
      .subscribe((episode) => (receivedEpisode = episode.episode));

    httpTesting
      .expectOne('/api/chapters/1/reels/2')
      .flush('offline', { status: 503, statusText: 'Unavailable' });

    expect(receivedEpisode).toBe(2);
  });
});
