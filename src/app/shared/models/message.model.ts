export type ChatParticipantType = 0 | 1; // 0 = User, 1 = Startup


export const ChatParticipant = {
  User: 0,
  Startup: 1,
} as const satisfies Record<string, ChatParticipantType>;

export interface Message {
  id: string;
  senderId: string;
  senderType: ChatParticipantType;
  /**
   * Кто из команды написал сообщение от лица стартапа. Приходит только своей стороне диалога —
   * собеседник всегда видит null.
   */
  sentByProfileId: string | null;
  receiverId: string;
  receiverType: ChatParticipantType;
  textContent: string | null;
  mediaIds: string[];
  metricIds: string[];
  documentIds: string[];
  fileIds: string[];
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSummary {
  otherParticipantId: string;
  otherParticipantType: ChatParticipantType;
  unreadCount: number;
  lastMessageAt: string;
}

export interface ParticipantInfo {
  name: string;
  avatarId: string | null;
}

/** Стартап, от лица которого пользователь вправе вести переписку. */
export interface ChatIdentity {
  startupId: string;
  name: string;
  avatarId: string | null;
}

/** Кто «я» в мессенджере прямо сейчас: сам пользователь или один из моих стартапов. */
export interface ActiveIdentity {
  type: ChatParticipantType;
  id: string;
  name: string;
  avatarId: string | null;
}
