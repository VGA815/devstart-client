// DTOs for api/admin/* (responses are camelCase, enums are integers).
// Admin request bodies carry no snake_case attributes on the backend — send camelCase.

// ── Users ──────────────────────────────────────────────────────────────────────

export interface AdminUserListItem {
  id: string;
  username: string;
  email: string;
  role: number;              // 0 User, 1 Admin
  isVerified: boolean;
  isBanned: boolean;
  banReason: string | null;
  bannedAt: string | null;
  banExpiresAt: string | null;
  createdAt: string;
}

export interface AdminUserSubscriptionSummary {
  id: string;
  plan: number;
  status: number;
  source: number;
  startedAt: string;
  expiresAt: string;
}

export interface AdminUserDetail extends AdminUserListItem {
  bannedByUserId: string | null;
  currentSubscription: AdminUserSubscriptionSummary | null;
}

export interface AdminUsersFilter {
  search?: string;
  role?: number;
  isBanned?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

// ── Startups ───────────────────────────────────────────────────────────────────

export interface AdminStartupListItem {
  id: string;
  name: string;
  publicEmail: string;
  stage: number;
  isStopped: boolean;
  isBanned: boolean;
  banReason: string | null;
  bannedAt: string | null;
  banExpiresAt: string | null;
  createdAt: string;
}

export interface AdminStartupsFilter {
  search?: string;
  isBanned?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

// ── Subscriptions & payments ───────────────────────────────────────────────────

export interface AdminSubscription {
  id: string;
  userId: string;
  userEmail: string | null;
  plan: number;
  status: number;
  source: number;            // 0 Purchase, 1 AdminGrant, 2 Promo
  startedAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface AdminSubscriptionsFilter {
  userId?: string;
  status?: number;
  plan?: number;
  pageNumber?: number;
  pageSize?: number;
}

export interface AdminPayment {
  id: string;
  subscriptionId: string;
  amount: number;
  discountAmount: number;
  refundedAmount: number;
  currency: string;
  status: number;            // PaymentStatus
  promoCodeId: string | null;
  createdAt: string;
  paidAt: string | null;
}

// ── Promo codes ────────────────────────────────────────────────────────────────

export interface AdminPromoCode {
  id: string;
  code: string;
  discountType: number;      // 0 Percentage, 1 FixedAmount, 2 FreePeriod
  discountValue: number;
  freePeriodDays: number | null;
  plan: number;
  maxRedemptions: number | null;
  redeemedCount: number;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreatePromoCodeRequest {
  code: string;
  discountType: number;
  discountValue: number;
  freePeriodDays: number | null;
  plan: number;
  maxRedemptions: number | null;
  validFrom: string | null;
  validUntil: string | null;
}

// ── Valuation benchmarks ───────────────────────────────────────────────────────

export interface ValuationBenchmark {
  id: string;
  metricType: number;        // 0 PreMoneyMedian, 1 RevenueMultiple
  industry: number;          // Industry enum
  stage: number | null;      // StartupStage enum
  value: number;
  currency: string | null;
  effectiveFrom: string;
  source: string;
  createdAt: string;
  createdByUserId: string | null;
}

export interface AddBenchmarkRequest {
  metricType: number;
  industry: number;
  stage: number | null;
  value: number;
  currency: string | null;
  effectiveFrom: string;
  source: string;
}

// ── Audit ──────────────────────────────────────────────────────────────────────

export interface AdminAuditEntry {
  id: string;
  adminUserId: string | null;
  actionType: number;        // AdminActionType
  targetType: number;        // AdminTargetType
  targetId: string;
  reason: string;
  metadataJson: string | null;
  createdAt: string;
}

// ── Legal (consent documents) ──────────────────────────────────────────────────

export interface ConsentDocument {
  id: string;
  type: number;              // ConsentType
  version: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface CreateConsentDocumentRequest {
  type: number;
  version: string;
  title: string;
  content: string;
}

// ── Enum labels (RU) ───────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<number, string> = {
  0: 'Пользователь',
  1: 'Администратор',
};

export const PLAN_LABELS: Record<number, string> = {
  0: 'Free',
  1: 'Pro',
};

export const SUBSCRIPTION_STATUS_LABELS: Record<number, string> = {
  0: 'Ожидает оплаты',
  1: 'Активна',
  2: 'Отменена',
  3: 'Истекла',
};

export const SUBSCRIPTION_SOURCE_LABELS: Record<number, string> = {
  0: 'Покупка',
  1: 'Выдана вручную',
  2: 'Промокод',
};

export const PAYMENT_STATUS_LABELS: Record<number, string> = {
  0: 'Ожидает',
  1: 'Оплачен',
  2: 'Отменён',
  3: 'Ошибка',
  4: 'Возврат',
};

export const DISCOUNT_TYPE_LABELS: Record<number, string> = {
  0: 'Процент',
  1: 'Фикс. сумма',
  2: 'Бесплатный период',
};

export const METRIC_TYPE_LABELS: Record<number, string> = {
  0: 'Pre-money медиана',
  1: 'Мультипликатор выручки',
};

export const INDUSTRY_LABELS: Record<number, string> = {
  0: 'Другое',
  1: 'SaaS',
  2: 'Финтех',
  3: 'AI',
  4: 'E-commerce',
  5: 'Маркетплейс',
  6: 'Hardware',
  7: 'Биотех',
  8: 'Edtech',
};

export const STAGE_LABELS: Record<number, string> = {
  0: 'Идея',
  1: 'Pre-seed',
  2: 'MVP',
  3: 'Seed',
  4: 'Series A',
};

export const ACTION_TYPE_LABELS: Record<number, string> = {
  0: 'Бан пользователя',
  1: 'Разбан пользователя',
  2: 'Бан стартапа',
  3: 'Разбан стартапа',
  4: 'Выдача подписки',
  5: 'Продление подписки',
  6: 'Отзыв подписки',
  7: 'Создание промокода',
  8: 'Деактивация промокода',
  9: 'Добавление бенчмарка',
};

export const TARGET_TYPE_LABELS: Record<number, string> = {
  0: 'Пользователь',
  1: 'Стартап',
  2: 'Подписка',
  3: 'Промокод',
  4: 'Бенчмарк',
};

export const CONSENT_TYPE_LABELS: Record<number, string> = {
  0: 'Обработка перс. данных',
  1: 'Политика конфиденциальности',
  2: 'Условия сервиса',
  3: 'Cookies',
  4: 'Публичная оферта',
};
