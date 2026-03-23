import { Message, ConversationSummary, ChatParticipantType } from '../message.model';


export interface MessageDto {
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
}

export function mapMessageDto(dto: MessageDto): Message {
  return {
    id: dto.id,
    senderId: dto.senderId,
    senderType: dto.senderType,
    receiverId: dto.receiverId,
    receiverType: dto.receiverType,
    textContent: dto.textContent,
    mediaIds: dto.mediaIds ?? [],
    metricIds: dto.metricIds ?? [],
    documentIds: dto.documentIds ?? [],
    isRead: dto.isRead,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
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
