import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  CHAPTER_ONE_REELS,
  CHAPTER_ONE_SUMMARY,
  DEFAULT_NARRATION_SETTINGS,
  type ChapterNarrationSettings,
  type ChapterReelSummary,
  type GeneratedAssetManifest,
  type ReelEpisode,
  type RenderJob,
  type RenderJobAttempt,
  type RenderJobLog,
  type ReelProductionStatus,
  type AssetReviewStatus,
  type UpdateReelProductionRequest,
  type UpdateChapterNarrationSettingsRequest,
  type components,
} from '@sumer-reel-forge/reel-core';
import { catchError, of } from 'rxjs';
import type {
  CreatePlanningRunRequest,
  PlanningCapabilitiesResponse,
  PlanningRunView,
  ShotPlanProposal,
  ShotPlanRequest,
} from './direction-planning.types';

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

  getChapterNarrationSettings(projectSlug: string, chapterNumber: number) {
    return this.http
      .get<ChapterNarrationSettings>(
        `/api/projects/${projectSlug}/chapters/${chapterNumber}/narration`,
      )
      .pipe(catchError(() => of(DEFAULT_NARRATION_SETTINGS)));
  }

  saveChapterNarrationSettings(
    projectSlug: string,
    chapterNumber: number,
    request: UpdateChapterNarrationSettingsRequest,
  ) {
    return this.http.patch<ChapterNarrationSettings>(
      `/api/projects/${projectSlug}/chapters/${chapterNumber}/narration`,
      request,
    );
  }

  getChapterOneEpisode(episodeId: number) {
    const fallback =
      CHAPTER_ONE_REELS.find((episode) => episode.episode === episodeId) ??
      CHAPTER_ONE_REELS[0];

    return this.http
      .get<ReelEpisode>(`/api/chapters/1/reels/${episodeId}`)
      .pipe(catchError(() => of(fallback)));
  }

  getPlanningCapabilities() {
    return this.http.get<PlanningCapabilitiesResponse>(
      '/api/planning/capabilities',
    );
  }

  proposeShotPlan(request: ShotPlanRequest) {
    return this.http.post<ShotPlanProposal>('/api/planning/shot-plan', request);
  }

  createPlanningRun(request: CreatePlanningRunRequest) {
    return this.http.post<PlanningRunView>('/api/planning/runs', request);
  }

  getLatestPlanningRun(
    projectSlug: string,
    chapterNumber: number,
    episodeNumber: number,
    shotNumber: number,
  ) {
    const query = new URLSearchParams({
      projectSlug,
      chapterNumber: String(chapterNumber),
      episodeNumber: String(episodeNumber),
      shotNumber: String(shotNumber),
    });
    return this.http.get<PlanningRunView | null>(
      `/api/planning/runs/latest?${query.toString()}`,
    );
  }

  updatePlanningRunProposal(runId: string, proposal: ShotPlanProposal) {
    return this.http.patch<PlanningRunView>(
      `/api/planning/runs/${runId}/proposal`,
      { proposal },
    );
  }

  reviewPlanningRun(
    runId: string,
    decision: 'approved' | 'rejected',
    notes?: string,
  ) {
    return this.http.patch<PlanningRunView>(
      `/api/planning/runs/${runId}/review`,
      { decision, notes },
    );
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
