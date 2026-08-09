import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CollabRequestViewerSide, ExpertCollaborationRequest,
} from '../../models/expert-collaboration-request.model';
import { formatMoney, formatRelativeTime } from '../../utils/format.utils';
import { getCollaborationStatusLabel, getCollaborationTypeLabel } from '../../utils/expert.utils';

@Component({
  selector: 'app-collab-request-row',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './collab-request-row.component.html',
  styleUrl: './collab-request-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollabRequestRowComponent {
  @Input({ required: true }) request!: ExpertCollaborationRequest;

  /** Which side of the request this screen belongs to — decides the counterparty and the actions. */
  @Input({ required: true }) viewerSide!: CollabRequestViewerSide;

  @Output() accept   = new EventEmitter<ExpertCollaborationRequest>();
  @Output() reject   = new EventEmitter<ExpertCollaborationRequest>();
  @Output() withdraw = new EventEmitter<ExpertCollaborationRequest>();

  /** True when this screen's side opened the request, so it may take it back but not answer it. */
  get isOurs(): boolean {
    const initiatedBy = this.request.initiator === 'Startup' ? 'startup' : 'expert';
    return initiatedBy === this.viewerSide;
  }

  get canWithdraw(): boolean {
    return this.request.status === 'Pending' && this.isOurs;
  }

  get canRespond(): boolean {
    return this.request.status === 'Pending' && !this.isOurs;
  }

  protected readonly formatAmount   = formatMoney;
  protected readonly formatDate     = formatRelativeTime;
  protected readonly getTypeLabel   = getCollaborationTypeLabel;
  protected readonly getStatusLabel = getCollaborationStatusLabel;
}
