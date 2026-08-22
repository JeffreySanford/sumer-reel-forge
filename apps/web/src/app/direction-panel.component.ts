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
  DirectionCheck,
  PlanningCapabilitiesResponse,
  ShotPlanProposal,
  ShotPlanRequest,
} from './direction-planning.types';

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
  protected readonly proposal = signal<ShotPlanProposal | null>(null);
  protected readonly runtimeStatus = signal('Checking local planning runtime...');
  protected readonly isGenerating = signal(false);
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
      this.proposal.set(null);
      this.reviewState.set('unreviewed');
      this.lastDurationMs.set(null);
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
    const startedAt = Date.now();
    this.isGenerating.set(true);
    this.reviewState.set('unreviewed');
    this.runtimeStatus.set(`Generating ${provider} direction...`);

    this.reelApi.proposeShotPlan({ ...input, provider }).subscribe({
      next: (proposal) => {
        this.proposal.set(proposal);
        this.lastDurationMs.set(Date.now() - startedAt);
        this.runtimeStatus.set(`Direction ready from ${proposal.model ?? proposal.provider}`);
        this.isGenerating.set(false);
      },
      error: (error: unknown) => {
        this.lastDurationMs.set(Date.now() - startedAt);
        this.runtimeStatus.set(`Direction failed: ${readHttpError(error)}`);
        this.isGenerating.set(false);
      },
    });
  }

  protected reviewProposal(state: 'approved' | 'rejected'): void {
    this.reviewState.set(state);
  }

  protected clearReview(): void {
    this.reviewState.set('unreviewed');
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
