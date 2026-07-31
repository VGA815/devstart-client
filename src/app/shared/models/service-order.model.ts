/** Зеркало `DevStart.Domain.ServiceOrders.ServiceType` (SC-49). Значения на проводе — числа. */
export type ServiceType = 'ScoringReport' | 'TermSheet' | 'Promotion';

/** Зеркало `DevStart.Domain.ServiceOrders.ServiceTargetKind` — что нужно выбрать перед оплатой. */
export type ServiceTargetKind = 'None' | 'Startup' | 'Deal';

/** Зеркало `DevStart.Domain.ServiceOrders.ServiceOrderStatus`. */
export type ServiceOrderStatus = 'Pending' | 'Paid' | 'Fulfilled' | 'Cancelled' | 'Refunded';

/** Позиция каталога разовых услуг. Цена фиксированная — задаётся конфигом бэка, не процентом. */
export interface ServiceCatalogItem {
  serviceType: ServiceType;
  price: number;
  currency: string;
  description: string;
  /** Срок доступа в днях; 0 — бессрочно. */
  accessDays: number;
  /** К чему привязывается заказ: стартап, сделка или ничего. */
  targetKind: ServiceTargetKind;
}

export interface ServiceOrderCheckout {
  serviceOrderId: string;
  paymentId: string;
  /** null — провайдер не вернул ссылку на оплату; оплатить в этом заходе не получится. */
  confirmationUrl: string | null;
}

/** Заказ разовой услуги в кабинете пользователя. */
export interface ServiceOrder {
  id: string;
  serviceType: ServiceType;
  targetKind: ServiceTargetKind;
  targetId: string | null;
  /** Название объекта, если оно есть (стартап). Для сделок — null. */
  targetName: string | null;
  amount: number;
  currency: string;
  status: ServiceOrderStatus;
  /** Доступ действует прямо сейчас (исполнен и не истёк). */
  isActive: boolean;
  createdAt: string;
  paidAt: string | null;
  fulfilledAt: string | null;
  expiresAt: string | null;
}

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  ScoringReport: 'Скоринг-отчёт',
  TermSheet:     'Генерация term sheet',
  Promotion:     'Продвижение',
};

export const SERVICE_ORDER_STATUS_LABELS: Record<ServiceOrderStatus, string> = {
  Pending:   'Ожидает оплаты',
  Paid:      'Оплачен',
  Fulfilled: 'Исполнен',
  Cancelled: 'Отменён',
  Refunded:  'Возвращён',
};
