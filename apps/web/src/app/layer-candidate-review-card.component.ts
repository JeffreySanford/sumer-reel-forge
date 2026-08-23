import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export type LayerCandidateReviewState =
  | 'candidate'
  | 'qa-pass'
  | 'qa-fail'
  | 'approved'
  | 'rejected';

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
        return 'Motion QA passed';
      case 'qa-fail':
        return 'Motion QA failed';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Candidate pending review';
    }
  }

  protected canApprove(): boolean {
    return this.state === 'qa-pass';
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
