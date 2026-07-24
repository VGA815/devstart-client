import { Notification, NotificationType } from '../notification.model';

// Порядок значений задан бэком (DevStart.Domain.Notifications.NotificationType).
const TYPE_MAP: Record<number, NotificationType> = {
  0:  'Welcome',
  1:  'EmailVerified',
  2:  'MessageReceived',
  3:  'StartupMemberAdded',
  4:  'InvestmentApplicationReceived',
  5:  'InvestmentApplicationAccepted',
  6:  'InvestmentApplicationRejected',
  7:  'InvestmentApplicationWithdrawn',
  8:  'InvestmentDealCompleted',
  9:  'DealDocumentsReady',
  10: 'SubscriptionActivated',
  11: 'ExpertCollaborationRequestReceived',
  12: 'ExpertCollaborationRequestAccepted',
  13: 'ExpertCollaborationRequestRejected',
  14: 'ExpertCollaborationRequestWithdrawn',
  15: 'SubscriptionExpiringSoon',
  16: 'SubscriptionExpired',
  17: 'PaymentRefunded',
  18: 'CommunityStandardsIncomplete',
};

// Shape returned by GET /api/notifications and GET /api/notifications/:id
export interface NotificationDto {
  id: string;
  userId: string;
  type: number;
  title: string;
  body: string;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}

// Shape pushed over Centrifugo WebSocket (no isRead field)
export interface NotificationPushDto {
  id: string;
  type: number;
  title: string;
  body: string;
  referenceId: string | null;
  createdAt: string;
}

/**
 * Неизвестный тип не подменяем на `Welcome`: заголовок и текст приходят с сервера и
 * останутся верными, а иконка и переход по клику должны молчать, а не врать.
 */
function mapType(value: number): NotificationType {
  return TYPE_MAP[value] ?? 'Unknown';
}

export function mapNotificationDto(dto: NotificationDto): Notification {
  return {
    id: dto.id,
    userId: dto.userId,
    type: mapType(dto.type),
    title: dto.title,
    body: dto.body,
    referenceId: dto.referenceId ?? null,
    isRead: dto.isRead,
    createdAt: dto.createdAt,
  };
}

export function mapNotificationPushDto(dto: NotificationPushDto): Notification {
  return {
    id: dto.id,
    userId: '',       // not included in push payload
    type: mapType(dto.type),
    title: dto.title,
    body: dto.body,
    referenceId: dto.referenceId ?? null,
    isRead: false,
    createdAt: dto.createdAt,
  };
}
