/** Зеркало `DevStart.Domain.ServiceOrders.ServiceType` (SC-49). Значения на проводе — числа. */
export type ServiceType = 'ScoringReport' | 'TermSheet' | 'Promotion';

/** Позиция каталога разовых услуг. Цена фиксированная — задаётся конфигом бэка, не процентом. */
export interface ServiceCatalogItem {
  serviceType: ServiceType;
  price: number;
  currency: string;
  description: string;
}

export interface ServiceOrderCheckout {
  serviceOrderId: string;
  paymentId: string;
  /** null — провайдер не вернул ссылку на оплату; оплатить в этом заходе не получится. */
  confirmationUrl: string | null;
}
