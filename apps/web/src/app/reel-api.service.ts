import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  CHAPTER_ONE_REELS,
  CHAPTER_ONE_SUMMARY,
  type ChapterReelSummary,
  type GeneratedAssetManifest,
  type ReelEpisode,
  type RenderJob,
  type RenderJobAttempt,
  type RenderJobLog,
  type ReelProductionStatus,
  type AssetReviewStatus,
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

  getRenderJobs(episodeId: number) {
    return this.http.get<RenderJob[]>(
      `/api/render-jobs?episodeId=${episodeId}`,
    );
  }

  getGeneratedAssets(episodeId: number) {
    return this.http.get<GeneratedAssetManifest[]>(
      `/api/generated-assets?episodeId=${episodeId}`,
    );
  }

  getRenderJobAttempts(jobId: string) {
    return this.http.get<RenderJobAttempt[]>(
      `/api/render-jobs/${jobId}/attempts`,
    );
  }

  getRenderJobLogs(jobId: string) {
    return this.http.get<RenderJobLog[]>(`/api/render-jobs/${jobId}/logs`);
  }

  updateEpisodeStatus(
    episodeId: number,
    status: ReelProductionStatus,
    notes?: string,
  ) {
    return this.http.patch<ReelEpisode>(
      `/api/chapters/1/reels/${episodeId}/status`,
      { status, notes },
    );
  }

  reviewGeneratedAsset(
    assetId: string,
    status: AssetReviewStatus,
    notes?: string,
  ) {
    return this.http.patch<GeneratedAssetManifest>(
      `/api/generated-assets/${assetId}/review`,
      { status, notes, reviewer: 'local-reviewer' },
    );
  }

  regenerateGeneratedAsset(assetId: string, notes?: string) {
    return this.http.post<RenderJob>(
      `/api/generated-assets/${assetId}/regenerate`,
      { notes },
    );
  }

  retryRenderJob(jobId: string, notes?: string) {
    return this.http.post<RenderJob>(`/api/render-jobs/${jobId}/retry`, {
      notes,
    });
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
