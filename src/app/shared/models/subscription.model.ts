export type SubscriptionPlan = 'Free' | 'Pro';
export type SubscriptionStatus = 'Pending' | 'Active' | 'Cancelled' | 'Expired';
export type PaymentStatus = 'Pending' | 'Succeeded' | 'Cancelled' | 'Failed' | 'Refunded';
/** За что платёж: подписка или разовая услуга (SC-49). История платежей общая. */
export type PaymentPurpose = 'Subscription' | 'ServiceOrder';

export interface CurrentSubscription {
  subscriptionId: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus | null;
  startedAt: string | null;
  expiresAt: string | null;
  isActivePro: boolean;
}

export interface CheckoutSession {
  subscriptionId: string;
  paymentId: string;
  // null when a free promo activated the subscription without a payment redirect
  confirmationUrl: string | null;
  activated: boolean;
}

export interface PaymentHistoryItem {
  id: string;
  /** null у платежей за разовые услуги — они не привязаны к подписке. */
  subscriptionId: string | null;
  purpose: PaymentPurpose;
  plan: SubscriptionPlan;
  amount: number;
  refundedAmount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  paidAt: string | null;
}
