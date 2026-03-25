export type SubscriptionPlan = 'Free' | 'Pro';
export type SubscriptionStatus = 'Pending' | 'Active' | 'Cancelled' | 'Expired';

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
  confirmationUrl: string;
}
