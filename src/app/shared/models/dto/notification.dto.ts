import { Notification, NotificationType } from '../notification.model';

const TYPE_MAP: Record<0 | 1 | 2, NotificationType> = {
  0: 'Welcome',
  1: 'EmailVerified',
  2: 'MessageReceived',
};

// Shape returned by GET /api/notifications and GET /api/notifications/:id
export interface NotificationDto {
  id: string;
  userId: string;
  type: 0 | 1 | 2;
  title: string;
  body: string;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}

// Shape pushed over Centrifugo WebSocket (no isRead field)
export interface NotificationPushDto {
  id: string;
  type: 0 | 1 | 2;
  title: string;
  body: string;
  referenceId: string | null;
  createdAt: string;
}

export function mapNotificationDto(dto: NotificationDto): Notification {
  return {
    id: dto.id,
    userId: dto.userId,
    type: TYPE_MAP[dto.type] ?? 'Welcome',
    title: dto.title,
    body: dto.body,
    referenceId: dto.referenceId,
    isRead: dto.isRead,
    createdAt: dto.createdAt,
  };
}

export function mapNotificationPushDto(dto: NotificationPushDto): Notification {
  return {
    id: dto.id,
    userId: '',       // not included in push payload
    type: TYPE_MAP[dto.type] ?? 'Welcome',
    title: dto.title,
    body: dto.body,
    referenceId: dto.referenceId,
    isRead: false,
    createdAt: dto.createdAt,
  };
}
