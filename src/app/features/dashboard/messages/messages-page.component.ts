import {
  Component, ChangeDetectionStrategy, OnInit, OnDestroy, computed, inject, signal,
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
  ActiveIdentity, ChatIdentity, ChatParticipant, ChatParticipantType, ConversationSummary,
  Message, ParticipantInfo,
} from '../../../shared/models/message.model';

const PAGE_SIZE = 50;

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
  readonly loadingMore = signal(false);
  readonly hasMoreMessages = signal(false);
  readonly conversations = signal<ConversationSummary[]>([]);
  readonly participants = signal<Map<string, ParticipantInfo>>(new Map());
  readonly selectedConv = signal<ConversationSummary | null>(null);
  readonly messages = signal<Message[]>([]);

  /** Личности, доступные пользователю: он сам + стартапы, за которые он вправе говорить. */
  readonly identities = signal<ChatIdentity[]>([]);
  readonly activeIdentity = signal<ActiveIdentity | null>(null);
  readonly identityMenuOpen = signal(false);

  /** Newest page is 1; "load more" walks backwards through the history. */
  private threadPage = 1;

  protected readonly ChatParticipant = ChatParticipant;

  /** `asStartupId` / `senderStartupId` для API — undefined, когда пользователь пишет от себя. */
  readonly senderStartupId = computed(() => {
    const identity = this.activeIdentity();
    return identity?.type === ChatParticipant.Startup ? identity.id : undefined;
  });

  /** Диалог с самим собой: собеседник совпал с текущей личностью — писать в него нельзя. */
  readonly isSelfConversation = computed(() => {
    const conv = this.selectedConv();
    const identity = this.activeIdentity();
    return !!conv && !!identity &&
      conv.otherParticipantId === identity.id &&
      conv.otherParticipantType === identity.type;
  });

  private realtimeSub?: Subscription;

  constructor() {
    inject(Title).setTitle('Сообщения — DevStart');
  }

  ngOnInit(): void {
    const user = this.auth.user();
    if (!user) { this.loadingConvs.set(false); return; }

    this.activeIdentity.set({
      type: ChatParticipant.User,
      id: user.id,
      name: user.username,
      avatarId: null,
    });

    // Собственный профиль даёт имя и аватар для личности «я».
    this.profileSvc.getProfile(user.id).pipe(catchError(() => of(null))).subscribe(profile => {
      if (!profile) return;
      this.activeIdentity.update(identity =>
        identity && identity.type === ChatParticipant.User
          ? { ...identity, name: profile.name ?? identity.name, avatarId: profile.avatarId }
          : identity
      );
      this.rememberParticipant(user.id, {
        name: profile.name ?? user.username,
        avatarId: profile.avatarId,
      });
    });

    this.messageSvc.getIdentities().pipe(catchError(() => of([] as ChatIdentity[])))
      .subscribe(identities => this.identities.set(identities));

    this.loadConversations(true, () => this.handleQueryParams());

    this.centrifugo.connect(user.id).catch(() => {});
    this.realtimeSub = this.centrifugo.notifications$.subscribe(n => {
      if (n.type !== 'MessageReceived') return;

      this.loadConversations(false);

      const sel = this.selectedConv();
      if (sel && n.referenceId) {
        this.messageSvc.getById(n.referenceId).pipe(catchError(() => of(null))).subscribe(msg => {
          if (!msg || !this.belongsToOpenThread(msg, sel)) return;

          this.messages.update(list => [...list, msg]);
          this.attachments.resolve([msg]);
          this.resolveAuthors([msg]);
          this.messageSvc.markRead(msg.id).subscribe();
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.realtimeSub?.unsubscribe();
  }


  /**
   * Уведомления приходят по всем личностям пользователя, поэтому сообщение попадает в открытый
   * тред, только если оно адресовано текущей личности и её собеседнику.
   */
  private belongsToOpenThread(msg: Message, sel: ConversationSummary): boolean {
    const identity = this.activeIdentity();
    if (!identity) return false;

    const involvesMe =
      (msg.senderType === identity.type && msg.senderId === identity.id) ||
      (msg.receiverType === identity.type && msg.receiverId === identity.id);

    const involvesCounterpart =
      (msg.senderType === sel.otherParticipantType && msg.senderId === sel.otherParticipantId) ||
      (msg.receiverType === sel.otherParticipantType && msg.receiverId === sel.otherParticipantId);

    return involvesMe && involvesCounterpart;
  }


  toggleIdentityMenu(): void {
    this.identityMenuOpen.update(open => !open);
  }

  switchToUser(): void {
    const user = this.auth.user();
    if (!user) return;

    const known = this.participants().get(user.id);
    this.applyIdentity({
      type: ChatParticipant.User,
      id: user.id,
      name: known?.name ?? user.username,
      avatarId: known?.avatarId ?? null,
    });
  }

  switchToStartup(identity: ChatIdentity): void {
    this.applyIdentity({
      type: ChatParticipant.Startup,
      id: identity.startupId,
      name: identity.name,
      avatarId: identity.avatarId,
    });
  }

  isActiveIdentity(id: string): boolean {
    return this.activeIdentity()?.id === id;
  }

  private applyIdentity(identity: ActiveIdentity): void {
    this.identityMenuOpen.set(false);
    if (this.activeIdentity()?.id === identity.id) return;

    this.activeIdentity.set(identity);

    // Списки диалогов у личностей независимы, поэтому тред и список сбрасываются целиком.
    this.closeThread();
    this.conversations.set([]);
    this.loadConversations(true);
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

    this.messageSvc.getConversations(1, PAGE_SIZE, this.senderStartupId())
      .pipe(catchError(() => of([])))
      .subscribe(convs => {
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

  /** Подтягивает имена тех, кто писал от лица стартапа, — их видит только своя команда. */
  private resolveAuthors(messages: Message[]): void {
    const known = this.participants();
    const authorIds = [...new Set(
      messages.map(m => m.sentByProfileId).filter((id): id is string => !!id && !known.has(id))
    )];
    if (authorIds.length === 0) return;

    const requests = Object.fromEntries(
      authorIds.map(id => [id, this.participantRequest(id, ChatParticipant.User)])
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
      this.rememberParticipant(id, info);
      onDone();
    });
  }

  private rememberParticipant(id: string, info: ParticipantInfo): void {
    const updated = new Map(this.participants());
    updated.set(id, info);
    this.participants.set(updated);
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
    this.threadPage = 1;
    this.hasMoreMessages.set(false);

    this.messageSvc.getConversation(
      conv.otherParticipantType, conv.otherParticipantId, this.threadPage, PAGE_SIZE, this.senderStartupId())
      .pipe(catchError(() => of([])))
      .subscribe(msgs => {
        const ordered = [...msgs].reverse();
        this.messages.set(ordered);
        this.loadingThread.set(false);
        this.hasMoreMessages.set(msgs.length === PAGE_SIZE);
        this.attachments.resolve(ordered);
        this.resolveAuthors(ordered);

        this.markIncomingAsRead(msgs);
        this.conversations.update(list =>
          list.map(c => this.sameConv(c, conv) ? { ...c, unreadCount: 0 } : c)
        );
      });
  }

  loadOlderMessages(): void {
    const conv = this.selectedConv();
    if (!conv || this.loadingMore() || !this.hasMoreMessages()) return;

    const nextPage = this.threadPage + 1;
    this.loadingMore.set(true);

    this.messageSvc.getConversation(
      conv.otherParticipantType, conv.otherParticipantId, nextPage, PAGE_SIZE, this.senderStartupId())
      .pipe(catchError(() => of([])))
      .subscribe(msgs => {
        this.loadingMore.set(false);
        if (msgs.length === 0) { this.hasMoreMessages.set(false); return; }

        this.threadPage = nextPage;
        this.hasMoreMessages.set(msgs.length === PAGE_SIZE);

        const older = [...msgs].reverse();
        this.messages.update(list => [...older, ...list]);
        this.attachments.resolve(older);
        this.resolveAuthors(older);
      });
  }

  /** Непрочитанным считается входящее для текущей личности — ею может быть и стартап. */
  private markIncomingAsRead(msgs: Message[]): void {
    const identity = this.activeIdentity();
    if (!identity) return;

    msgs
      .filter(m => !m.isRead && m.receiverType === identity.type && m.receiverId === identity.id)
      .forEach(m => this.messageSvc.markRead(m.id).subscribe());
  }

  closeThread(): void {
    this.selectedConv.set(null);
    this.messages.set([]);
    this.loadingThread.set(false);
    this.loadingMore.set(false);
    this.hasMoreMessages.set(false);
    this.threadPage = 1;
  }

  onSent(msg: Message): void {
    this.messages.update(list => [...list, msg]);
    this.attachments.resolve([msg]);
    this.resolveAuthors([msg]);

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
