import { Notification, NotificationType } from '../models/notification.model';
import { getNotificationIcon, getNotificationLink } from './notification.utils';

function notification(type: NotificationType, referenceId: string | null = null): Notification {
  return {
    id: 'n1', userId: 'u1', type,
    title: 'Заголовок', body: 'Текст',
    referenceId, isRead: false, createdAt: '2026-07-24T10:00:00Z',
  };
}

describe('getNotificationLink', () => {
  it('ведёт на вкладку сообщества стартапа для CommunityStandardsIncomplete', () => {
    const link = getNotificationLink(notification('CommunityStandardsIncomplete', 'startup-1'));

    expect(link).toEqual({ commands: ['/startups', 'startup-1'], queryParams: { tab: 'community' } });
  });

  it('без referenceId уводит в «Мои стартапы», а не на битый маршрут', () => {
    const link = getNotificationLink(notification('CommunityStandardsIncomplete', null));

    expect(link).toEqual({ commands: ['/dashboard/my-startups'] });
  });

  it('открывает сделку, когда referenceId — идентификатор сделки', () => {
    for (const type of ['InvestmentApplicationAccepted', 'InvestmentDealCompleted', 'DealDocumentsReady'] as const) {
      expect(getNotificationLink(notification(type, 'deal-1')))
        .toEqual({ commands: ['/dashboard/investments/deals', 'deal-1'] });
    }
  });

  it('разводит заявки по сторонам сделки', () => {
    // Приходит участникам стартапа
    expect(getNotificationLink(notification('InvestmentApplicationReceived', 'app-1')))
      .toEqual({ commands: ['/dashboard/applications'] });
    // Приходит инвестору
    expect(getNotificationLink(notification('InvestmentApplicationRejected', 'app-1')))
      .toEqual({ commands: ['/dashboard/investments'] });
  });

  it('разводит заявки экспертов по сторонам', () => {
    expect(getNotificationLink(notification('ExpertCollaborationRequestReceived', 'req-1')))
      .toEqual({ commands: ['/dashboard/my-startups'] });
    expect(getNotificationLink(notification('ExpertCollaborationRequestAccepted', 'req-1')))
      .toEqual({ commands: ['/dashboard/collaboration-requests'] });
  });

  it('не строит ссылку для информационных и неизвестных типов', () => {
    expect(getNotificationLink(notification('Welcome'))).toBeNull();
    expect(getNotificationLink(notification('EmailVerified'))).toBeNull();
    expect(getNotificationLink(notification('Unknown', 'whatever'))).toBeNull();
  });

  it('ведёт в чат по MessageReceived, не пытаясь открыть сообщение по id', () => {
    expect(getNotificationLink(notification('MessageReceived', 'msg-1')))
      .toEqual({ commands: ['/dashboard/messages'] });
  });

  it('уводит админа к статусу лимита НПД по IncomeLimitWarning', () => {
    expect(getNotificationLink(notification('IncomeLimitWarning')))
      .toEqual({ commands: ['/admin/subscriptions'] });
  });

  it('ведёт к списку заказов по ServiceOrderFulfilled', () => {
    expect(getNotificationLink(notification('ServiceOrderFulfilled', 'order-1')))
      .toEqual({ commands: ['/dashboard/service-orders'] });
  });
});

describe('getNotificationIcon', () => {
  it('даёт нейтральный колокольчик неизвестному типу', () => {
    expect(getNotificationIcon('Unknown')).toBe('🔔');
  });

  it('различает иконки основных типов', () => {
    expect(getNotificationIcon('MessageReceived')).not.toBe(getNotificationIcon('CommunityStandardsIncomplete'));
  });
});
