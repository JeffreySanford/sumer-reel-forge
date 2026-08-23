import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export type LayerCandidateReviewState =
  | 'candidate'
  | 'qa-pass'
  | 'qa-fail'
  | 'approved'
  | 'rejected';

export type LayerCandidateQaKind = 'motion' | 'preservation';

@Component({
  selector: 'app-layer-candidate-review-card',
  standalone: true,
  templateUrl: './layer-candidate-review-card.component.html',
  styleUrl: './layer-candidate-review-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayerCandidateReviewCardComponent {
  @Input({ required: true }) layerId = '';
  @Input({ required: true }) layerLabel = '';
  @Input() material = '';
  @Input() state: LayerCandidateReviewState = 'candidate';
  @Input() qaKind: LayerCandidateQaKind = 'motion';
  @Input() meanDifference: number | null = null;
  @Input() changedPixelRatio: number | null = null;
  @Input() previewAvailable = false;
  @Input() diagnosticAvailable = false;
  @Input() note = '';

  @Output() approve = new EventEmitter<void>();
  @Output() reject = new EventEmitter<void>();
  @Output() regenerate = new EventEmitter<void>();

  protected stateLabel(): string {
    switch (this.state) {
      case 'qa-pass':
        return `${this.qaName()} passed`;
      case 'qa-fail':
        return `${this.qaName()} failed`;
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Candidate pending review';
    }
  }

  protected qaName(): string {
    return this.qaKind === 'preservation' ? 'Preservation QA' : 'Motion QA';
  }

  protected meanMetricLabel(): string {
    return this.qaKind === 'preservation'
      ? 'Outside mean diff'
      : 'Mean frame diff';
  }

  protected changedMetricLabel(): string {
    return this.qaKind === 'preservation'
      ? 'Inside changed'
      : 'Changed pixels';
  }

  protected canApprove(): boolean {
    return this.state === 'qa-pass';
  }

  protected approvalGuardrail(): string {
    return `Approval stays locked until ${this.qaName().toLowerCase()} passes.`;
  }

  protected changedPercent(): string {
    return this.changedPixelRatio === null
      ? '—'
      : `${(this.changedPixelRatio * 100).toFixed(2)}%`;
  }

  protected meanDifferenceLabel(): string {
    return this.meanDifference === null ? '—' : this.meanDifference.toFixed(4);
  }
}
