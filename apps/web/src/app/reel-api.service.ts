import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  CHAPTER_ONE_REELS,
  CHAPTER_ONE_SUMMARY,
  type ChapterReelSummary,
  type ReelEpisode,
  type RenderJob,
  type UpdateReelProductionRequest,
  type components,
} from '@sumer-reel-forge/reel-core';
import { catchError, of } from 'rxjs';

type CreateRenderJobDto = components['schemas']['CreateRenderJobDto'];
type UpdateReelProductionDto = components['schemas']['UpdateReelProductionDto'];

@Injectable({ providedIn: 'root' })
export class ReelApiService {
  private readonly http = inject(HttpClient);

  getChapterOneOutline() {
    return this.http
      .get<ChapterReelSummary[]>('/api/chapters/1/reels')
      .pipe(catchError(() => of(CHAPTER_ONE_SUMMARY)));
  }

  getChapterOneEpisode(episodeId: number) {
    const fallback =
      CHAPTER_ONE_REELS.find((episode) => episode.episode === episodeId) ??
      CHAPTER_ONE_REELS[0];

    return this.http
      .get<ReelEpisode>(`/api/chapters/1/reels/${episodeId}`)
      .pipe(catchError(() => of(fallback)));
  }

  queueRenderJob(request: CreateRenderJobDto) {
    return this.http.post<RenderJob>('/api/render-jobs', request);
  }

  saveEpisodeProduction(
    episodeId: number,
    request: UpdateReelProductionRequest,
  ) {
    return this.http.patch<ReelEpisode>(
      `/api/chapters/1/reels/${episodeId}/production`,
      request as UpdateReelProductionDto,
    );
  }
}
