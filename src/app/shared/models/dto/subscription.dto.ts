import {
  CheckoutSession,
  CurrentSubscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../subscription.model';

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
  confirmationUrl: string;
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
  };
}
