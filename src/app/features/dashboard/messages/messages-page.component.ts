import {
  Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject, signal,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import { CentrifugoService } from '../../../core/centrifugo.service';
import { MessageService } from './message.service';
import { ChatAttachmentsService } from './chat-attachments.service';
import { ProfileService } from '../../startups/profile.service';
import { StartupService } from '../../startups/startup.service';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { ChatConversationListComponent } from './conversation-list/conversation-list.component';
import { ChatThreadComponent } from './chat-thread/chat-thread.component';
import { ChatComposerComponent } from './chat-composer/chat-composer.component';
import {
  ChatParticipant, ChatParticipantType, ConversationSummary, Message, ParticipantInfo,
} from '../../../shared/models/message.model';

@Component({
  selector: 'app-messages-page',
  standalone: true,
  imports: [
    AvatarComponent,
    ChatConversationListComponent,
    ChatThreadComponent,
    ChatComposerComponent,
  ],
  providers: [ChatAttachmentsService],
  templateUrl: './messages-page.component.html',
  styleUrl: './messages-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagesPageComponent implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly messageSvc = inject(MessageService);
  private readonly profileSvc = inject(ProfileService);
  private readonly startupSvc = inject(StartupService);
  private readonly centrifugo = inject(CentrifugoService);
  private readonly attachments = inject(ChatAttachmentsService);

  readonly loadingConvs = signal(true);
  readonly loadingThread = signal(false);
  readonly conversations = signal<ConversationSummary[]>([]);
  readonly participants = signal<Map<string, ParticipantInfo>>(new Map());
  readonly selectedConv = signal<ConversationSummary | null>(null);
  readonly messages = signal<Message[]>([]);

  protected readonly ChatParticipant = ChatParticipant;

  private realtimeSub?: Subscription;

  constructor() {
    inject(Title).setTitle('Сообщения — DevStart');
  }

  ngOnInit(): void {
    const user = this.auth.user();
    if (!user) { this.loadingConvs.set(false); return; }

    this.loadConversations(true, () => this.handleQueryParams());

    this.centrifugo.connect(user.id).catch(() => {});
    this.realtimeSub = this.centrifugo.notifications$.subscribe(n => {
      if (n.type !== 'MessageReceived') return;

      this.loadConversations(false);

      const sel = this.selectedConv();
      if (sel && n.referenceId) {
        this.messageSvc.getById(n.referenceId).pipe(catchError(() => of(null))).subscribe(msg => {
          if (!msg) return;
          const inThread =
            (msg.senderId === sel.otherParticipantId && msg.senderType === sel.otherParticipantType) ||
            (msg.receiverId === sel.otherParticipantId && msg.receiverType === sel.otherParticipantType);
          if (inThread) {
            this.messages.update(list => [...list, msg]);
            this.attachments.resolve([msg]);
            this.messageSvc.markRead(msg.id).subscribe();
          }
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.realtimeSub?.unsubscribe();
  }


  private handleQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const recipientId = params.get('recipientId');
    const recipientType = params.get('recipientType');
    if (!recipientId || recipientType === null) return;

    const type = Number(recipientType) as ChatParticipantType;

    const existing = this.conversations().find(
      c => c.otherParticipantId === recipientId && c.otherParticipantType === type
    );

    if (existing) {
      this.selectConv(existing);
    } else {
      const pendingConv: ConversationSummary = {
        otherParticipantId:   recipientId,
        otherParticipantType: type,
        unreadCount:          0,
        lastMessageAt:        new Date().toISOString(),
      };
      this.resolveOneParticipant(recipientId, type, () => {
        this.selectedConv.set(pendingConv);
        this.messages.set([]);
        this.loadingThread.set(false);
      });
    }
  }


  private loadConversations(showLoader = true, afterLoad?: () => void): void {
    if (showLoader) this.loadingConvs.set(true);

    this.messageSvc.getConversations().pipe(catchError(() => of([]))).subscribe(convs => {
      this.conversations.set(convs);
      this.loadingConvs.set(false);
      this.resolveParticipants(convs);
      afterLoad?.();
    });
  }

  private resolveParticipants(convs: ConversationSummary[]): void {
    const known = this.participants();
    const missing = convs.filter(c => !known.has(c.otherParticipantId));
    if (missing.length === 0) return;

    const requests = Object.fromEntries(
      missing.map(c => [
        c.otherParticipantId,
        this.participantRequest(c.otherParticipantId, c.otherParticipantType),
      ])
    );

    forkJoin(requests).subscribe(result => {
      const updated = new Map(this.participants());
      for (const [id, info] of Object.entries(result)) {
        updated.set(id, info as ParticipantInfo);
      }
      this.participants.set(updated);
    });
  }

  private resolveOneParticipant(
    id: string,
    type: ChatParticipantType,
    onDone: () => void,
  ): void {
    if (this.participants().has(id)) { onDone(); return; }

    this.participantRequest(id, type).subscribe(info => {
      const updated = new Map(this.participants());
      updated.set(id, info);
      this.participants.set(updated);
      onDone();
    });
  }

  private participantRequest(id: string, type: ChatParticipantType) {
    return type === ChatParticipant.User
      ? this.profileSvc.getProfile(id).pipe(
          map(p => ({ name: p.name ?? id.slice(0, 8), avatarId: p.avatarId }) satisfies ParticipantInfo),
          catchError(() => of<ParticipantInfo>({ name: id.slice(0, 8), avatarId: null })),
        )
      : this.startupSvc.getStartup(id).pipe(
          map(s => ({ name: s.name, avatarId: s.avatarId }) satisfies ParticipantInfo),
          catchError(() => of<ParticipantInfo>({ name: id.slice(0, 8), avatarId: null })),
        );
  }


  selectConv(conv: ConversationSummary): void {
    if (this.isSelected(conv)) return;
    this.selectedConv.set(conv);
    this.messages.set([]);
    this.loadingThread.set(true);

    this.messageSvc.getConversation(conv.otherParticipantType, conv.otherParticipantId)
      .pipe(catchError(() => of([])))
      .subscribe(msgs => {
        const ordered = [...msgs].reverse();
        this.messages.set(ordered);
        this.loadingThread.set(false);
        this.attachments.resolve(ordered);

        const userId = this.auth.user()?.id;
        msgs.filter(m => !m.isRead && m.receiverId === userId).forEach(m =>
          this.messageSvc.markRead(m.id).subscribe()
        );
        this.conversations.update(list =>
          list.map(c => this.sameConv(c, conv) ? { ...c, unreadCount: 0 } : c)
        );
      });
  }

  closeThread(): void {
    this.selectedConv.set(null);
    this.messages.set([]);
    this.loadingThread.set(false);
  }

  onSent(msg: Message): void {
    this.messages.update(list => [...list, msg]);
    this.attachments.resolve([msg]);

    const conv = this.selectedConv();
    if (conv && !this.conversations().some(c => this.sameConv(c, conv))) {
      this.conversations.update(list =>
        [{ ...conv, lastMessageAt: msg.createdAt, unreadCount: 0 }, ...list]
      );
    }
  }


  isSelected(conv: ConversationSummary): boolean {
    return this.sameConv(this.selectedConv(), conv);
  }

  participantName(id: string): string {
    return this.participants().get(id)?.name ?? id.slice(0, 8) + '…';
  }

  participantAvatarId(id: string): string | null {
    return this.participants().get(id)?.avatarId ?? null;
  }

  private sameConv(a: ConversationSummary | null, b: ConversationSummary): boolean {
    return !!a &&
      a.otherParticipantId === b.otherParticipantId &&
      a.otherParticipantType === b.otherParticipantType;
  }
}
