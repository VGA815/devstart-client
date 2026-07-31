import {
  ServiceCatalogItem,
  ServiceOrder,
  ServiceOrderCheckout,
  ServiceOrderStatus,
  ServiceTargetKind,
  ServiceType,
} from '../service-order.model';

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

const TARGET_KIND_MAP: Record<number, ServiceTargetKind> = {
  0: 'None',
  1: 'Startup',
  2: 'Deal',
};

const ORDER_STATUS_MAP: Record<number, ServiceOrderStatus> = {
  0: 'Pending',
  1: 'Paid',
  2: 'Fulfilled',
  3: 'Cancelled',
  4: 'Refunded',
};

export interface ServiceCatalogItemDto {
  serviceType: number;
  price: number;
  currency: string | null;
  description: string | null;
  accessDays: number;
  targetKind: number;
}

export interface ServiceOrderCheckoutDto {
  serviceOrderId: string;
  paymentId: string;
  confirmationUrl: string | null;
}

export interface ServiceOrderDto {
  id: string;
  serviceType: number;
  targetKind: number;
  targetId: string | null;
  targetName: string | null;
  amount: number;
  currency: string | null;
  status: number;
  isActive: boolean;
  createdAt: string;
  paidAt: string | null;
  fulfilledAt: string | null;
  expiresAt: string | null;
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
      accessDays: dto.accessDays ?? 0,
      targetKind: TARGET_KIND_MAP[dto.targetKind] ?? 'None',
    }));
}

export function mapServiceOrderCheckoutDto(dto: ServiceOrderCheckoutDto): ServiceOrderCheckout {
  return {
    serviceOrderId: dto.serviceOrderId,
    paymentId: dto.paymentId,
    confirmationUrl: dto.confirmationUrl ?? null,
  };
}

/**
 * В отличие от каталога, заказ с незнакомым кодом услуги не выбрасываем: это уже оплаченная
 * история пользователя, и скрыть её было бы хуже, чем показать под техническим названием.
 */
export function mapServiceOrderDto(dto: ServiceOrderDto): ServiceOrder {
  return {
    id: dto.id,
    serviceType: SERVICE_TYPE_MAP[dto.serviceType] ?? 'ScoringReport',
    targetKind: TARGET_KIND_MAP[dto.targetKind] ?? 'None',
    targetId: dto.targetId ?? null,
    targetName: dto.targetName ?? null,
    amount: dto.amount,
    currency: dto.currency ?? 'RUB',
    status: ORDER_STATUS_MAP[dto.status] ?? 'Pending',
    isActive: dto.isActive,
    createdAt: dto.createdAt,
    paidAt: dto.paidAt ?? null,
    fulfilledAt: dto.fulfilledAt ?? null,
    expiresAt: dto.expiresAt ?? null,
  };
}
