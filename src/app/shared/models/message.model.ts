export type ChatParticipantType = 0 | 1; // 0 = User, 1 = Startup


export const ChatParticipant = {
  User: 0,
  Startup: 1,
} as const satisfies Record<string, ChatParticipantType>;

export interface Message {
  id: string;
  senderId: string;
  senderType: ChatParticipantType;
  receiverId: string;
  receiverType: ChatParticipantType;
  textContent: string | null;
  mediaIds: string[];
  metricIds: string[];
  documentIds: string[];
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
