import { Message, ConversationSummary, ChatParticipantType, ChatIdentity } from '../message.model';


export interface MessageDto {
  id: string;
  senderId: string;
  senderType: ChatParticipantType;
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

export interface ConversationSummaryDto {
  otherParticipantId: string;
  otherParticipantType: ChatParticipantType;
  unreadCount: number;
  lastMessageAt: string;
}

export interface SendMessageRequestDto {
  receiverId: string;
  receiverType: ChatParticipantType;
  senderStartupId?: string;
  textContent?: string;
  mediaIds?: string[];
  metricIds?: string[];
  documentIds?: string[];
  fileIds?: string[];
}

export function mapMessageDto(dto: MessageDto): Message {
  return {
    id: dto.id,
    senderId: dto.senderId,
    senderType: dto.senderType,
    sentByProfileId: dto.sentByProfileId ?? null,
    receiverId: dto.receiverId,
    receiverType: dto.receiverType,
    textContent: dto.textContent,
    mediaIds: dto.mediaIds ?? [],
    metricIds: dto.metricIds ?? [],
    documentIds: dto.documentIds ?? [],
    fileIds: dto.fileIds ?? [],
    isRead: dto.isRead,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export interface ChatIdentityDto {
  startupId: string;
  name: string;
  avatarId: string | null;
}

export function mapChatIdentityDto(dto: ChatIdentityDto): ChatIdentity {
  return {
    startupId: dto.startupId,
    name: dto.name,
    avatarId: dto.avatarId ?? null,
  };
}

export function mapConversationDto(dto: ConversationSummaryDto): ConversationSummary {
  return {
    otherParticipantId: dto.otherParticipantId,
    otherParticipantType: dto.otherParticipantType,
    unreadCount: dto.unreadCount,
    lastMessageAt: dto.lastMessageAt,
  };
}
