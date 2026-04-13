import {
  ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges, SimpleChanges, inject,
} from '@angular/core';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import {
  ChatParticipant, Message, ParticipantInfo,
} from '../../../../shared/models/message.model';
import {
  formatFileSize, formatMetricValue, getDocumentIcon, getDocumentTypeLabel, getMetricLabel,
} from '../../../../shared/utils/startup.utils';
import { formatRelativeTime } from '../../../../shared/utils/format.utils';
import { ChatAttachmentsService } from '../chat-attachments.service';

@Component({
  selector: 'app-chat-thread',
  standalone: true,
  imports: [AvatarComponent, SkeletonComponent],
  templateUrl: './chat-thread.component.html',
  styleUrl: './chat-thread.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatThreadComponent implements OnChanges {
  @Input() messages: Message[] = [];
  @Input() loading = false;
  @Input() currentUserId: string | null = null;
  @Input() participants = new Map<string, ParticipantInfo>();

  protected readonly attachments = inject(ChatAttachmentsService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly ChatParticipant = ChatParticipant;
  protected readonly formatTime = formatRelativeTime;
  protected readonly metricLabel = getMetricLabel;
  protected readonly metricValue = formatMetricValue;
  protected readonly docLabel = getDocumentTypeLabel;
  protected readonly docIcon = getDocumentIcon;
  protected readonly fileSize = formatFileSize;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['messages']) this.scrollToBottom();
  }

  isMine(msg: Message): boolean {
    return msg.senderType === ChatParticipant.User && msg.senderId === this.currentUserId;
  }

  participantName(id: string): string {
    return this.participants.get(id)?.name ?? id.slice(0, 8) + '…';
  }

  participantAvatarId(id: string): string | null {
    return this.participants.get(id)?.avatarId ?? null;
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.host.nativeElement;
      el.scrollTop = el.scrollHeight;
    }, 0);
  }
}
