import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import {
  ChatParticipant, ConversationSummary, ParticipantInfo,
} from '../../../../shared/models/message.model';
import { formatRelativeTime } from '../../../../shared/utils/format.utils';

@Component({
  selector: 'app-chat-conversation-list',
  standalone: true,
  imports: [AvatarComponent, SkeletonComponent],
  templateUrl: './conversation-list.component.html',
  styleUrl: './conversation-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatConversationListComponent {
  @Input() conversations: ConversationSummary[] = [];
  @Input() participants = new Map<string, ParticipantInfo>();
  @Input() selected: ConversationSummary | null = null;
  @Input() loading = false;

  @Output() select = new EventEmitter<ConversationSummary>();

  protected readonly ChatParticipant = ChatParticipant;
  protected readonly formatTime = formatRelativeTime;

  isSelected(conv: ConversationSummary): boolean {
    return (
      !!this.selected &&
      this.selected.otherParticipantId === conv.otherParticipantId &&
      this.selected.otherParticipantType === conv.otherParticipantType
    );
  }

  participantName(id: string): string {
    return this.participants.get(id)?.name ?? id.slice(0, 8) + '…';
  }

  participantAvatarId(id: string): string | null {
    return this.participants.get(id)?.avatarId ?? null;
  }
}
