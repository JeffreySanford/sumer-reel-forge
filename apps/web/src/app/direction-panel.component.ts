import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import type { ReelEpisode, ReelShot } from '@sumer-reel-forge/reel-core';
import { ReelApiService } from './reel-api.service';
import type {
  CreatePlanningRunRequest,
  DirectionCheck,
  PlanningCapabilitiesResponse,
  PlanningRunView,
  ShotPlanProposal,
  ShotPlanRequest,
} from './direction-planning.types';

const PROJECT_SLUG = 'blessings-of-sumer';
const REEL_ONE_SHOT_IDS = [
  'black-water-before-dawn',
  'stag-of-the-absu-coastline',
  'enki-at-the-helm',
  'nammu-under-water',
  'traveler-shrine-future',
  'water-bread-truth-justice-freedom',
  'dilmun-reveal',
  'boat-approaches-land-title',
] as const;

@Component({
  selector: 'app-direction-panel',
  standalone: true,
  templateUrl: './direction-panel.component.html',
  styleUrl: './direction-panel.component.scss',
})
export class DirectionPanelComponent implements OnInit, OnChanges {
  private readonly reelApi = inject(ReelApiService);

  @Input({ required: true }) episode!: ReelEpisode;
  @Input({ required: true }) shot!: ReelShot;
  @Input({ required: true }) shotIndex = 0;

  protected readonly capabilities = signal<PlanningCapabilitiesResponse | null>(
    null,
  );
  protected readonly planningInput = signal<ShotPlanRequest | null>(null);
  protected readonly planningRun = signal<PlanningRunView | null>(null);
  protected readonly proposal = signal<ShotPlanProposal | null>(null);
  protected readonly runtimeStatus = signal('Checking local planning runtime...');
  protected readonly isGenerating = signal(false);
  protected readonly isLoadingRun = signal(false);
  protected readonly isEditing = signal(false);
  protected readonly isSavingProposal = signal(false);
  protected readonly isReviewing = signal(false);
  protected readonly hasLocalEdits = signal(false);
  protected readonly reviewState = signal<'unreviewed' | 'approved' | 'rejected'>(
    'unreviewed',
  );
  protected readonly lastDurationMs = signal<number | null>(null);

  protected readonly activeCapability = computed(() => {
    const capabilities = this.capabilities();
    if (!capabilities) {
      return undefined;
    }
    return capabilities.providers.find(
      (provider) => provider.id === capabilities.defaultProvider,
    );
  });

  protected readonly directionChecks = computed<DirectionCheck[]>(() => {
    const proposal = this.proposal();
    const input = this.planningInput();
    return proposal && input ? buildDirectionChecks(proposal, input) : [];
  });

  protected readonly proposalHasFailure = computed(() =>
    this.directionChecks().some((check) => check.status === 'fail'),
  );

  protected readonly runIsEditable = computed(
    () => this.planningRun()?.status === 'proposal-ready',
  );

  ngOnInit(): void {
    this.refreshCapabilities();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.episode && this.shot) {
      this.planningInput.set(
        buildShotPlanningRequest(this.episode, this.shot, this.shotIndex),
      );
    }

    if (changes['shotIndex'] || changes['episode']) {
      this.resetRunState();
      this.loadLatestPlanningRun();
    }
  }

  protected refreshCapabilities(): void {
    this.runtimeStatus.set('Checking local planning runtime...');
    this.reelApi.getPlanningCapabilities().subscribe({
      next: (capabilities) => {
        this.capabilities.set(capabilities);
        const active = capabilities.providers.find(
          (provider) => provider.id === capabilities.defaultProvider,
        );
        this.runtimeStatus.set(
          active?.available
            ? `${active.id} planning ready`
            : active?.detail ?? 'Planning provider unavailable',
        );
      },
      error: () => {
        this.capabilities.set(null);
        this.runtimeStatus.set('Planning API unavailable');
      },
    });
  }

  protected generateDirection(): void {
    const input = this.planningInput();
    if (!input || this.isGenerating()) {
      return;
    }

    const provider = this.capabilities()?.defaultProvider ?? 'deterministic';
    const request: CreatePlanningRunRequest = {
      ...input,
      provider,
      projectSlug: PROJECT_SLUG,
      chapterNumber: this.episode.chapter,
      episodeNumber: this.episode.episode,
      shotNumber: this.shotIndex + 1,
    };

    this.isGenerating.set(true);
    this.reviewState.set('unreviewed');
    this.isEditing.set(false);
    this.hasLocalEdits.set(false);
    this.runtimeStatus.set(`Generating ${provider} direction...`);

    this.reelApi.createPlanningRun(request).subscribe({
      next: (run) => {
        this.applyPlanningRun(run);
        this.runtimeStatus.set(
          `Direction persisted from ${run.model ?? run.provider}`,
        );
        this.isGenerating.set(false);
      },
      error: (error: unknown) => {
        this.runtimeStatus.set(`Direction failed: ${readHttpError(error)}`);
        this.isGenerating.set(false);
      },
    });
  }

  protected toggleEditing(): void {
    if (!this.proposal() || !this.runIsEditable()) {
      return;
    }
    this.isEditing.update((value) => !value);
  }

  protected saveProposalEdits(): void {
    const run = this.planningRun();
    const proposal = this.proposal();
    if (
      !run ||
      !proposal ||
      !this.runIsEditable() ||
      !this.hasLocalEdits() ||
      this.isSavingProposal()
    ) {
      return;
    }

    this.isSavingProposal.set(true);
    this.runtimeStatus.set('Saving human direction edits...');
    this.reelApi.updatePlanningRunProposal(run.id, proposal).subscribe({
      next: (updated) => {
        this.applyPlanningRun(updated);
        this.runtimeStatus.set('Direction edits persisted');
        this.isSavingProposal.set(false);
      },
      error: (error: unknown) => {
        this.runtimeStatus.set(`Save failed: ${readHttpError(error)}`);
        this.isSavingProposal.set(false);
      },
    });
  }

  protected updateProposalText(
    field: 'eyeTarget' | 'stillnessAnchor',
    event: Event,
  ): void {
    const value = eventValue(event);
    this.updateProposal((proposal) => ({ ...proposal, [field]: value }));
  }

  protected updateCameraText(
    field: 'preset' | 'easing',
    event: Event,
  ): void {
    const value = eventValue(event);
    this.updateProposal((proposal) => ({
      ...proposal,
      camera: { ...proposal.camera, [field]: value },
    }));
  }

  protected updateCameraScale(
    field: 'scaleFrom' | 'scaleTo',
    event: Event,
  ): void {
    const value = Number(eventValue(event));
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }
    this.updateProposal((proposal) => ({
      ...proposal,
      camera: { ...proposal.camera, [field]: value },
    }));
  }

  protected updateMotionText(
    field: 'primary' | 'subject' | 'lighting',
    event: Event,
  ): void {
    const value = eventValue(event);
    this.updateProposal((proposal) => ({
      ...proposal,
      motionBudget: { ...proposal.motionBudget, [field]: value },
    }));
  }

  protected updateEnvironmentMotion(index: number, event: Event): void {
    const value = eventValue(event);
    this.updateProposal((proposal) => ({
      ...proposal,
      motionBudget: {
        ...proposal.motionBudget,
        environment: proposal.motionBudget.environment.map((motion, motionIndex) =>
          motionIndex === index ? value : motion,
        ),
      },
    }));
  }

  protected reviewProposal(state: 'approved' | 'rejected'): void {
    const run = this.planningRun();
    if (!run || !this.runIsEditable() || this.isReviewing()) {
      return;
    }
    if (this.hasLocalEdits()) {
      this.runtimeStatus.set('Save edits before approving or rejecting this run.');
      return;
    }
    if (state === 'approved' && this.proposalHasFailure()) {
      this.runtimeStatus.set('Resolve failing guardrails before approval.');
      return;
    }

    this.isReviewing.set(true);
    this.runtimeStatus.set(
      state === 'approved' ? 'Approving direction...' : 'Rejecting direction...',
    );
    this.reelApi.reviewPlanningRun(run.id, state).subscribe({
      next: (updated) => {
        this.applyPlanningRun(updated);
        this.runtimeStatus.set(
          state === 'approved'
            ? 'Direction approved and persisted'
            : 'Direction rejected and persisted',
        );
        this.isReviewing.set(false);
      },
      error: (error: unknown) => {
        this.runtimeStatus.set(`Review failed: ${readHttpError(error)}`);
        this.isReviewing.set(false);
      },
    });
  }

  protected formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  protected cameraDeltaPercent(proposal: ShotPlanProposal): number {
    return Math.abs(proposal.camera.scaleTo - proposal.camera.scaleFrom) * 100;
  }

  protected formatDuration(durationMs: number | null): string {
    if (durationMs === null) {
      return '';
    }
    return `${(durationMs / 1000).toFixed(1)}s`;
  }

  protected shortHash(value: string | undefined): string {
    return value ? value.slice(0, 10) : '—';
  }

  private loadLatestPlanningRun(): void {
    if (!this.episode || !this.shot) {
      return;
    }
    const episodeNumber = this.episode.episode;
    const shotNumber = this.shotIndex + 1;
    this.isLoadingRun.set(true);

    this.reelApi
      .getLatestPlanningRun(
        PROJECT_SLUG,
        this.episode.chapter,
        episodeNumber,
        shotNumber,
      )
      .subscribe({
        next: (run) => {
          if (
            this.episode.episode !== episodeNumber ||
            this.shotIndex + 1 !== shotNumber
          ) {
            return;
          }
          if (run) {
            this.applyPlanningRun(run);
          }
          this.isLoadingRun.set(false);
        },
        error: () => {
          this.isLoadingRun.set(false);
        },
      });
  }

  private applyPlanningRun(run: PlanningRunView): void {
    this.planningRun.set(run);
    this.proposal.set(run.workingProposal);
    this.lastDurationMs.set(run.durationMs ?? null);
    this.reviewState.set(
      run.status === 'approved'
        ? 'approved'
        : run.status === 'rejected'
          ? 'rejected'
          : 'unreviewed',
    );
    this.isEditing.set(false);
    this.hasLocalEdits.set(false);
  }

  private resetRunState(): void {
    this.planningRun.set(null);
    this.proposal.set(null);
    this.reviewState.set('unreviewed');
    this.isEditing.set(false);
    this.hasLocalEdits.set(false);
    this.lastDurationMs.set(null);
  }

  private updateProposal(
    update: (proposal: ShotPlanProposal) => ShotPlanProposal,
  ): void {
    const current = this.proposal();
    if (!current || !this.runIsEditable()) {
      return;
    }
    this.proposal.set(update(current));
    this.hasLocalEdits.set(true);
  }
}

export function buildShotPlanningRequest(
  episode: ReelEpisode,
  shot: ReelShot,
  shotIndex: number,
): ShotPlanRequest {
  const shotNumber = shotIndex + 1;
  const shotId =
    episode.chapter === 1 && episode.episode === 1
      ? (REEL_ONE_SHOT_IDS[shotIndex] ?? `shot-${shotNumber}`)
      : `shot-${shotNumber}-${slugify(shot.visual).slice(0, 36)}`;
  const assetPath = `assets/blessings-of-sumer/chapter-01/reel-01/editorial-v1/shot-${String(shotNumber).padStart(2, '0')}.png`;

  if (episode.chapter === 1 && episode.episode === 1 && shotIndex === 2) {
    return {
      shotId: 'enki-at-the-helm',
      storyFunction:
        'Establish Enki as the human and divine visual anchor of the voyage.',
      emotionalPurpose: 'calm authority, curiosity, practical travel',
      narration: episode.narration,
      eyeTarget: 'enki-face',
      stillnessAnchor: 'enki-facial-identity',
      styleRules: [
        'character-closeup.camera.maxPushPercent = 3',
        'narratorOnly.lipSync = false',
        'foregroundOcclusion.mustAvoid = face,captions',
        'material.water.motion = multi-frequency',
        'material.rigid-vessel.motion = heavyPhysical',
      ],
      constraints: [
        'Do not rewrite narration.',
        'Use one primary movement.',
        'Prefer restrained character motion.',
        'Preserve Enki facial identity.',
        'Avoid heroic posing.',
        'Camera should feel nearly invisible.',
      ],
      availableAssets: [assetPath],
    };
  }

  if (episode.chapter === 1 && episode.episode === 1 && shotIndex === 3) {
    return {
      shotId: 'nammu-under-water',
      storyFunction:
        'Reveal Nammu as a primordial presence within the water without turning her into a literal apparition.',
      emotionalPurpose: 'numinous maternal presence, awe without horror',
      narration: episode.narration,
      eyeTarget: 'water-coherence',
      stillnessAnchor: 'camera-composition',
      styleRules: [
        'nammu.camera.maxPushPercent = 1',
        'nammu.reveal.mode = environmental-coherence',
        'narratorOnly.lipSync = false',
        'foregroundOcclusion.mustAvoid = captions',
        'material.water.motion = multi-frequency',
      ],
      constraints: [
        'Do not rewrite narration.',
        'Use one primary movement.',
        'Keep the camera nearly static.',
        'Nammu emerges through environmental coherence, refraction, water and light.',
        'Do not use a literal character fade, mermaid anatomy, glowing eyes, a horror stinger, or a particle explosion.',
      ],
      availableAssets: [assetPath],
    };
  }

  return {
    shotId,
    storyFunction: shot.visual,
    emotionalPurpose:
      'Advance the mythic documentary story with restrained, authored motion and believable physical weight.',
    narration: episode.narration,
    stillnessAnchor: 'primary-subject-composition',
    styleRules: [
      'camera.default.maxPushPercent = 5',
      'narratorOnly.lipSync = false',
      'foregroundOcclusion.mustAvoid = captions',
      'material.water.motion = multi-frequency',
    ],
    constraints: [
      'Do not rewrite narration.',
      'Use one primary movement.',
      'Prefer restrained documentary motion over spectacle.',
      'Preserve painterly cinematic realism grounded in southern Mesopotamian material culture.',
      'Physical materials must preserve believable weight and inertia.',
      `Honor the planned shot motion without exaggeration: ${shot.motion}.`,
    ],
    availableAssets: [assetPath],
  };
}

export function buildDirectionChecks(
  proposal: ShotPlanProposal,
  input: ShotPlanRequest,
): DirectionCheck[] {
  const cameraDelta = Math.abs(
    proposal.camera.scaleTo - proposal.camera.scaleFrom,
  );
  const maxCameraPercent = maxCameraPushPercent(input.styleRules ?? []);
  const maxCameraDelta = maxCameraPercent / 100;
  const expectedRules = input.styleRules ?? [];
  const missingRules = expectedRules.filter(
    (rule) => !proposal.inheritedStyleRules.includes(rule),
  );
  const primary = proposal.motionBudget.primary.toLowerCase();
  const motionMismatch = primary.includes('tilt') && cameraDelta > 0.001;

  return [
    {
      label: 'Camera policy',
      status: cameraDelta <= maxCameraDelta + Number.EPSILON ? 'pass' : 'fail',
      detail: `${(cameraDelta * 100).toFixed(1)}% change / ${maxCameraPercent.toFixed(0)}% maximum`,
    },
    {
      label: 'Camera easing',
      status: proposal.camera.easing.toLowerCase() === 'linear' ? 'review' : 'pass',
      detail:
        proposal.camera.easing.toLowerCase() === 'linear'
          ? 'Linear easing can read mechanically; compare against cinematicSlow.'
          : proposal.camera.easing,
    },
    {
      label: 'Motion coherence',
      status: motionMismatch ? 'review' : 'pass',
      detail: motionMismatch
        ? `Primary motion says ${proposal.motionBudget.primary} while camera scale also changes.`
        : `Primary motion: ${proposal.motionBudget.primary}`,
    },
    {
      label: 'Inherited style rules',
      status: missingRules.length === 0 ? 'pass' : 'fail',
      detail:
        missingRules.length === 0
          ? `${expectedRules.length} approved rules preserved.`
          : `Missing ${missingRules.length} approved rule(s).`,
    },
    {
      label: 'Narrator lip sync',
      status: proposal.inheritedStyleRules.includes('narratorOnly.lipSync = false')
        ? 'pass'
        : 'review',
      detail: proposal.inheritedStyleRules.includes(
        'narratorOnly.lipSync = false',
      )
        ? 'Narrator-only lip sync remains disabled.'
        : 'No explicit narrator-only lip-sync rule returned.',
    },
  ];
}

function maxCameraPushPercent(styleRules: string[]): number {
  for (const rule of styleRules) {
    const match = rule.match(/maxPushPercent\s*=\s*(\d+(?:\.\d+)?)/i);
    if (match) {
      return Number(match[1]);
    }
  }
  return 5;
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'direction'
  );
}

function eventValue(event: Event): string {
  return event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement ||
    event.target instanceof HTMLSelectElement
    ? event.target.value
    : '';
}

function readHttpError(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    const nested = record['error'];
    if (typeof nested === 'object' && nested !== null) {
      const message = (nested as Record<string, unknown>)['message'];
      if (typeof message === 'string') {
        return message;
      }
    }
    if (typeof record['message'] === 'string') {
      return record['message'];
    }
  }
  return 'Unknown planning error';
}
