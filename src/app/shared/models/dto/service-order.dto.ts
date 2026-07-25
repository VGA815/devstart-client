import { ServiceCatalogItem, ServiceOrderCheckout, ServiceType } from '../service-order.model';

// Порядок значений задан бэком (DevStart.Domain.ServiceOrders.ServiceType).
const SERVICE_TYPE_MAP: Record<number, ServiceType> = {
  0: 'ScoringReport',
  1: 'TermSheet',
  2: 'Promotion',
};

const SERVICE_TYPE_CODE: Record<ServiceType, number> = {
  ScoringReport: 0,
  TermSheet:     1,
  Promotion:     2,
};

export interface ServiceCatalogItemDto {
  serviceType: number;
  price: number;
  currency: string | null;
  description: string | null;
}

export interface ServiceOrderCheckoutDto {
  serviceOrderId: string;
  paymentId: string;
  confirmationUrl: string | null;
}

/** Код услуги для тела запроса чекаута: enum уходит на бэк числом. */
export function serviceTypeCode(serviceType: ServiceType): number {
  return SERVICE_TYPE_CODE[serviceType];
}

/**
 * Позицию с незнакомым кодом услуги отбрасываем: показать карточку, которую невозможно
 * купить (чекаут не примет неизвестный тип), хуже, чем не показать её вовсе.
 */
export function mapServiceCatalogDto(items: ServiceCatalogItemDto[]): ServiceCatalogItem[] {
  return items
    .filter(dto => SERVICE_TYPE_MAP[dto.serviceType] !== undefined)
    .map(dto => ({
      serviceType: SERVICE_TYPE_MAP[dto.serviceType],
      price: dto.price,
      currency: dto.currency ?? 'RUB',
      description: dto.description ?? '',
    }));
}

export function mapServiceOrderCheckoutDto(dto: ServiceOrderCheckoutDto): ServiceOrderCheckout {
  return {
    serviceOrderId: dto.serviceOrderId,
    paymentId: dto.paymentId,
    confirmationUrl: dto.confirmationUrl ?? null,
  };
}
