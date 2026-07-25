import { NotificationType } from '../notification.model';
import {
  NotificationDto, NotificationPushDto, mapNotificationDto, mapNotificationPushDto,
} from './notification.dto';

function dto(type: number, referenceId: string | null = null): NotificationDto {
  return {
    id: 'n1', userId: 'u1', type,
    title: 'Заголовок', body: 'Текст',
    referenceId, isRead: false, createdAt: '2026-07-24T10:00:00Z',
  };
}

describe('mapNotificationDto', () => {
  // Порядок соответствует DevStart.Domain.Notifications.NotificationType
  const EXPECTED: NotificationType[] = [
    'Welcome', 'EmailVerified', 'MessageReceived', 'StartupMemberAdded',
    'InvestmentApplicationReceived', 'InvestmentApplicationAccepted',
    'InvestmentApplicationRejected', 'InvestmentApplicationWithdrawn',
    'InvestmentDealCompleted', 'DealDocumentsReady', 'SubscriptionActivated',
    'ExpertCollaborationRequestReceived', 'ExpertCollaborationRequestAccepted',
    'ExpertCollaborationRequestRejected', 'ExpertCollaborationRequestWithdrawn',
    'SubscriptionExpiringSoon', 'SubscriptionExpired', 'PaymentRefunded',
    'CommunityStandardsIncomplete', 'IncomeLimitWarning', 'ServiceOrderFulfilled',
  ];

  it('декодирует все 21 значение бэкенд-энума', () => {
    EXPECTED.forEach((expected, value) => {
      expect(mapNotificationDto(dto(value)).type).toBe(expected);
    });
  });

  it('неизвестный тип становится Unknown, а не Welcome', () => {
    expect(mapNotificationDto(dto(99)).type).toBe('Unknown');
  });

  it('сохраняет referenceId и нормализует его отсутствие', () => {
    expect(mapNotificationDto(dto(18, 'startup-1')).referenceId).toBe('startup-1');
    expect(mapNotificationDto(dto(18, null)).referenceId).toBeNull();
  });

  it('push-payload маппится теми же правилами и приходит непрочитанным', () => {
    const push: NotificationPushDto = {
      id: 'n2', type: 9, title: 'Документы готовы', body: 'Term sheet готов',
      referenceId: 'deal-1', createdAt: '2026-07-24T10:00:00Z',
    };

    const result = mapNotificationPushDto(push);

    expect(result.type).toBe('DealDocumentsReady');
    expect(result.isRead).toBeFalse();
    expect(result.userId).toBe('');
  });
});
