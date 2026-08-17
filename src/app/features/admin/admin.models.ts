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
  // null у платежей за разовые услуги — они не привязаны к подписке.
  subscriptionId: string | null;
  serviceOrderId: string | null;
  purpose: number;           // 0 Subscription, 1 ServiceOrder
  amount: number;
  discountAmount: number;
  refundedAmount: number;
  currency: string;
  status: number;            // PaymentStatus
  promoCodeId: string | null;
  createdAt: string;
  paidAt: string | null;
}

// ── Разовые услуги (SC-49) ────────────────────────────────────────────────────

export interface AdminServiceOrder {
  id: string;
  userId: string;
  userEmail: string | null;
  serviceType: number;       // 0 ScoringReport, 1 TermSheet, 2 Promotion
  targetKind: number;        // 0 None, 1 Startup, 2 Deal
  targetId: string | null;
  amount: number;
  currency: string;
  status: number;            // ServiceOrderStatus
  /** Доступ действует прямо сейчас (исполнен и не истёк). */
  isActive: boolean;
  createdAt: string;
  paidAt: string | null;
  fulfilledAt: string | null;
  expiresAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
}

export interface AdminServiceOrdersFilter {
  userId?: string;
  status?: number;
  serviceType?: number;
  pageNumber?: number;
  pageSize?: number;
}

export const SERVICE_TYPE_LABELS: Record<number, string> = {
  0: 'Скоринг-отчёт',
  1: 'Term sheet',
  2: 'Продвижение',
};

export const SERVICE_ORDER_STATUS_LABELS: Record<number, string> = {
  0: 'Ожидает оплаты',
  1: 'Оплачен',
  2: 'Исполнен',
  3: 'Отменён',
  4: 'Возвращён',
};

export const SERVICE_TARGET_KIND_LABELS: Record<number, string> = {
  0: '—',
  1: 'Стартап',
  2: 'Сделка',
};

// ── НПД: статус годового лимита дохода (SC-42) ────────────────────────────────

export interface NpdIncomeStatus {
  year: number;
  incomeToDate: number;
  limit: number;
  /** Сумма, с которой бэк рассылает админам предупреждение (80% лимита). */
  warningAmount: number;
  remaining: number;
  warningReached: boolean;
  /** true — новые платные операции блокируются до следующего календарного года. */
  limitReached: boolean;
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

// ── Верстак бенчмарков: реестр, staging, деривация ─────────────────────────────

export interface BenchmarkIssuer {
  id: string;
  ticker: string;
  inn: string | null;
  displayName: string;
  industry: number;
  isActive: boolean;
  revenueOverride: number | null;
  revenueOverrideFiscalYear: number | null;
  revenueOverrideNote: string | null;
  note: string | null;
  latestMarketCap: number | null;
  latestMarketCapAsOf: string | null;
  latestRevenue: number | null;
  latestRevenueFiscalYear: number | null;
  latestRevenueIsManual: boolean;
}

export interface SaveBenchmarkIssuerRequest {
  id: string | null;
  ticker: string;
  inn: string | null;
  displayName: string;
  industry: number;
  isActive: boolean;
  revenueOverride: number | null;
  revenueOverrideFiscalYear: number | null;
  revenueOverrideNote: string | null;
  note: string | null;
}

export interface BenchmarkIndustryMapping {
  id: string;
  sourceKind: number;           // 0 Damodaran, 1 Okved
  externalKey: string;
  industry: number | null;      // null = «не сопоставляется»
  note: string | null;
}

export interface UnmappedBenchmarkBucket {
  externalKey: string;
  value: number;
  asOf: string;
  datasetRegion: string | null;
}

export interface DerivationStep {
  label: string;
  value: number | null;
  detail: string;
}

export interface BenchmarkSuggestion {
  metricType: number;           // 1 RevenueMultiple, 2 CompetitionIntensity
  industry: number;
  value: number | null;
  comparableCount: number;
  isDerived: boolean;
  chain: DerivationStep[];
  fiscalYears: number[];
  source: string | null;
  noSuggestionReason: string | null;
  effectiveFrom: string;
  currentValue: number | null;
  deltaPercent: number | null;
  collidesWithExisting: boolean;
}

export interface BenchmarkSuggestions {
  minComparables: number;
  countryDiscount: number;
  illiquidityAndSizeDiscount: number;
  datasetRegion: string;
  asOf: string;
  quarterLabel: string;
  hasObservations: boolean;
  lastMarketCapCollectedAt: string | null;
  lastRevenueCollectedAt: string | null;
  damodaranDatasetYear: number | null;
  damodaranDatasetRegion: string | null;
  suggestions: BenchmarkSuggestion[];
}

/** Параметры деривации. Не сохраняются — едут в запрос и в source полученного числа. */
export interface BenchmarkDerivationParams {
  minComparables: number;
  countryDiscount: number;
  illiquidityAndSizeDiscount: number;
  datasetRegion: string;
}

export interface DamodaranUploadResult {
  bucketsImported: number;
  unmappedBuckets: number;
  objectKey: string;
}

export const MAPPING_SOURCE_KIND_LABELS: Record<number, string> = {
  0: 'Damodaran',
  1: 'ОКВЭД',
};

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
  2: 'Интенсивность конкуренции',
};

/** Метрики без стадии и без валюты: 1 RevenueMultiple, 2 CompetitionIntensity. */
export const SECTOR_ONLY_METRICS = [1, 2];

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
