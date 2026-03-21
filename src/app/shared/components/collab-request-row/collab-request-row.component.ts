import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ExpertCollaborationRequest } from '../../models/expert-collaboration-request.model';
import { formatMoney, formatRelativeTime } from '../../utils/format.utils';
import { getCollaborationStatusLabel, getCollaborationTypeLabel } from '../../utils/expert.utils';

export type CollabRequestDirection = 'incoming' | 'outgoing';

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
  @Input({ required: true }) direction!: CollabRequestDirection;

  @Output() accept   = new EventEmitter<ExpertCollaborationRequest>();
  @Output() reject   = new EventEmitter<ExpertCollaborationRequest>();
  @Output() withdraw = new EventEmitter<ExpertCollaborationRequest>();

  protected readonly formatAmount   = formatMoney;
  protected readonly formatDate     = formatRelativeTime;
  protected readonly getTypeLabel   = getCollaborationTypeLabel;
  protected readonly getStatusLabel = getCollaborationStatusLabel;
}
