/**
 * Зеркало `DevStart.Domain.Notifications.NotificationType` (значения 0–20).
 * `Unknown` — не значение бэка, а запасной вариант фронта: если сервер пришлёт тип новее
 * этого списка, уведомление всё равно отрисуется (title и body приходят с сервера),
 * но без иконки-обманки и без ссылки в случайный раздел.
 */
export type NotificationType =
  | 'Welcome'
  | 'EmailVerified'
  | 'MessageReceived'
  | 'StartupMemberAdded'
  | 'InvestmentApplicationReceived'
  | 'InvestmentApplicationAccepted'
  | 'InvestmentApplicationRejected'
  | 'InvestmentApplicationWithdrawn'
  | 'InvestmentDealCompleted'
  | 'DealDocumentsReady'
  | 'SubscriptionActivated'
  | 'ExpertCollaborationRequestReceived'
  | 'ExpertCollaborationRequestAccepted'
  | 'ExpertCollaborationRequestRejected'
  | 'ExpertCollaborationRequestWithdrawn'
  | 'ExpertCollaborationRequestExpired'
  // Зеркало Request*-семейства для приглашений, которые открыл стартап. Тип разведён, чтобы по
  // нему одному было понятно, на чьей стороне получатель, и клик вёл в нужный дашборд.
  | 'ExpertCollaborationInvitationReceived'
  | 'ExpertCollaborationInvitationWithdrawn'
  | 'ExpertCollaborationInvitationAccepted'
  | 'ExpertCollaborationInvitationRejected'
  | 'ExpertCollaborationInvitationExpired'
  | 'SubscriptionExpiringSoon'
  | 'SubscriptionExpired'
  | 'PaymentRefunded'
  | 'CommunityStandardsIncomplete'
  // Приходит только администраторам: доход НПД достиг 80% годового лимита (SC-42).
  | 'IncomeLimitWarning'
  | 'ServiceOrderFulfilled'
  | 'Unknown';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  /**
   * Идентификатор сущности, к которой относится уведомление. Что именно в нём лежит,
   * зависит от типа (стартап, сделка, заявка, подписка) — разбор в
   * `shared/utils/notification.utils.ts`.
   */
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}
