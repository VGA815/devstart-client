import {
  CheckoutSession,
  CurrentSubscription,
  PaymentHistoryItem,
  PaymentPurpose,
  PaymentStatus,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../subscription.model';
import { ServiceType } from '../service-order.model';

// Дублирует карту из service-order.dto.ts намеренно: история платежей не должна зависеть от
// модуля каталога услуг, а порядок значений задан бэком и не меняется.
const SERVICE_TYPE_MAP: Record<number, ServiceType> = {
  0: 'ScoringReport',
  1: 'TermSheet',
  2: 'Promotion',
};

const PLAN_MAP: Record<number, SubscriptionPlan> = {
  0: 'Free',
  1: 'Pro',
};

const STATUS_MAP: Record<number, SubscriptionStatus> = {
  0: 'Pending',
  1: 'Active',
  2: 'Cancelled',
  3: 'Expired',
};

const PAYMENT_STATUS_MAP: Record<number, PaymentStatus> = {
  0: 'Pending',
  1: 'Succeeded',
  2: 'Cancelled',
  3: 'Failed',
  4: 'Refunded',
};

// DevStart.Domain.Payments.PaymentPurpose
const PAYMENT_PURPOSE_MAP: Record<number, PaymentPurpose> = {
  0: 'Subscription',
  1: 'ServiceOrder',
};

export interface CurrentSubscriptionDto {
  subscriptionId: string | null;
  plan: number;
  status: number | null;
  startedAt: string | null;
  expiresAt: string | null;
  isActivePro: boolean;
}

export interface CheckoutSessionDto {
  subscriptionId: string;
  paymentId: string;
  confirmationUrl: string | null;
  activated: boolean;
}

export interface PaymentHistoryDto {
  id: string;
  subscriptionId: string | null;
  serviceOrderId: string | null;
  purpose: number;
  plan: number | null;
  serviceType: number | null;
  amount: number;
  refundedAmount: number;
  currency: string;
  status: number;
  createdAt: string;
  paidAt: string | null;
}

export function mapCurrentSubscriptionDto(dto: CurrentSubscriptionDto): CurrentSubscription {
  return {
    subscriptionId: dto.subscriptionId,
    plan: PLAN_MAP[dto.plan] ?? 'Free',
    status: dto.status == null ? null : STATUS_MAP[dto.status] ?? null,
    startedAt: dto.startedAt,
    expiresAt: dto.expiresAt,
    isActivePro: dto.isActivePro,
  };
}

export function mapCheckoutSessionDto(dto: CheckoutSessionDto): CheckoutSession {
  return {
    subscriptionId: dto.subscriptionId,
    paymentId: dto.paymentId,
    confirmationUrl: dto.confirmationUrl,
    activated: dto.activated,
  };
}

export function mapPaymentHistoryDto(dto: PaymentHistoryDto): PaymentHistoryItem {
  return {
    id: dto.id,
    subscriptionId: dto.subscriptionId ?? null,
    serviceOrderId: dto.serviceOrderId ?? null,
    purpose: PAYMENT_PURPOSE_MAP[dto.purpose] ?? 'Subscription',
    // Оба поля взаимоисключающие: у платежа за услугу плана нет, у платежа за подписку — услуги.
    plan: dto.plan == null ? null : PLAN_MAP[dto.plan] ?? null,
    serviceType: dto.serviceType == null ? null : SERVICE_TYPE_MAP[dto.serviceType] ?? null,
    amount: dto.amount,
    refundedAmount: dto.refundedAmount,
    currency: dto.currency,
    status: PAYMENT_STATUS_MAP[dto.status] ?? 'Pending',
    createdAt: dto.createdAt,
    paidAt: dto.paidAt,
  };
}
