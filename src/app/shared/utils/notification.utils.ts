import { Notification, NotificationType } from '../models/notification.model';

/** Куда ведёт клик по уведомлению. `null` — уведомление информационное, переходить некуда. */
export interface NotificationLink {
  commands: unknown[];
  queryParams?: Record<string, string>;
}

const ICON: Record<NotificationType, string> = {
  Welcome:                            '👋',
  EmailVerified:                      '✅',
  MessageReceived:                    '💬',
  StartupMemberAdded:                 '👥',
  InvestmentApplicationReceived:      '📨',
  InvestmentApplicationAccepted:      '🤝',
  InvestmentApplicationRejected:      '✕',
  InvestmentApplicationWithdrawn:     '↩',
  InvestmentDealCompleted:            '🏁',
  DealDocumentsReady:                 '📄',
  SubscriptionActivated:              '★',
  ExpertCollaborationRequestReceived: '🎓',
  ExpertCollaborationRequestAccepted: '🤝',
  ExpertCollaborationRequestRejected: '✕',
  ExpertCollaborationRequestWithdrawn:'↩',
  SubscriptionExpiringSoon:           '⏳',
  SubscriptionExpired:                '⌛',
  PaymentRefunded:                    '💸',
  CommunityStandardsIncomplete:       '◍',
  IncomeLimitWarning:                 '⚠',
  ServiceOrderFulfilled:              '🧾',
  Unknown:                            '🔔',
};

export function getNotificationIcon(type: NotificationType): string {
  return ICON[type] ?? ICON.Unknown;
}

/**
 * Разбирает `referenceId` по смыслу типа. Что в нём лежит, задаёт бэк на стороне
 * отправителя уведомления:
 *
 * - стартап — `StartupMemberAdded`, `CommunityStandardsIncomplete`;
 * - сделка — `InvestmentApplicationAccepted` (именно сделка, не заявка!),
 *   `InvestmentDealCompleted`, `DealDocumentsReady`;
 * - заявка на инвестиции — `InvestmentApplication*` остальные;
 * - заявка эксперта — `ExpertCollaborationRequest*`;
 * - подписка — `Subscription*`, `PaymentRefunded`;
 * - заказ услуги — `ServiceOrderFulfilled`;
 * - сообщение — `MessageReceived`;
 * - без ссылки на сущность — `IncomeLimitWarning` (событие платформы, не объекта).
 *
 * Ссылку строим только туда, где маршрут действительно принимает этот идентификатор:
 * для заявок и сообщений отдельных страниц нет, поэтому ведём на соответствующий список.
 */
export function getNotificationLink(notification: Notification): NotificationLink | null {
  const ref = notification.referenceId;

  switch (notification.type) {
    case 'MessageReceived':
      // Чат открывается по собеседнику, а referenceId — идентификатор сообщения.
      return { commands: ['/dashboard/messages'] };

    case 'StartupMemberAdded':
      return ref ? { commands: ['/startups', ref] } : null;

    // Приходят участникам стартапа — им заявки видны во «Входящих».
    case 'InvestmentApplicationReceived':
    case 'InvestmentApplicationWithdrawn':
      return { commands: ['/dashboard/applications'] };

    // Приходит инвестору — его заявки живут в разделе «Инвестиции».
    case 'InvestmentApplicationRejected':
      return { commands: ['/dashboard/investments'] };

    case 'InvestmentApplicationAccepted':
    case 'InvestmentDealCompleted':
    case 'DealDocumentsReady':
      return ref
        ? { commands: ['/dashboard/investments/deals', ref] }
        : { commands: ['/dashboard/investments'] };

    case 'SubscriptionActivated':
    case 'SubscriptionExpiringSoon':
    case 'SubscriptionExpired':
    case 'PaymentRefunded':
      return { commands: ['/dashboard/subscriptions'] };

    // Приходят основателям стартапа — входящие заявки экспертов лежат в «Моих стартапах».
    case 'ExpertCollaborationRequestReceived':
    case 'ExpertCollaborationRequestWithdrawn':
      return { commands: ['/dashboard/my-startups'] };

    // Приходят эксперту — это его исходящие заявки.
    case 'ExpertCollaborationRequestAccepted':
    case 'ExpertCollaborationRequestRejected':
      return { commands: ['/dashboard/collaboration-requests'] };

    case 'CommunityStandardsIncomplete':
      return ref
        ? { commands: ['/startups', ref], queryParams: { tab: 'community' } }
        : { commands: ['/dashboard/my-startups'] };

    // Только у админов: ведём на раздел с виджетом статуса лимита НПД.
    case 'IncomeLimitWarning':
      return { commands: ['/admin/subscriptions'] };

    case 'ServiceOrderFulfilled':
      return { commands: ['/dashboard/service-orders'] };

    case 'Welcome':
    case 'EmailVerified':
    case 'Unknown':
      return null;
  }
}
