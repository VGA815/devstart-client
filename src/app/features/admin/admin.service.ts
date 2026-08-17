import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AddBenchmarkRequest,
  AdminAuditEntry,
  AdminPayment,
  AdminPromoCode,
  AdminServiceOrder,
  AdminServiceOrdersFilter,
  AdminStartupListItem,
  AdminStartupsFilter,
  AdminSubscription,
  AdminSubscriptionsFilter,
  AdminUserDetail,
  AdminUserListItem,
  AdminUsersFilter,
  BenchmarkDerivationParams,
  BenchmarkIndustryMapping,
  BenchmarkIssuer,
  BenchmarkSuggestions,
  ConsentDocument,
  CreateConsentDocumentRequest,
  CreatePromoCodeRequest,
  DamodaranUploadResult,
  NpdIncomeStatus,
  SaveBenchmarkIssuerRequest,
  UnmappedBenchmarkBucket,
  ValuationBenchmark,
} from './admin.models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin`;
  private readonly api  = environment.apiUrl;

  // ── Users ────────────────────────────────────────────────────────────────────

  getUsers(filter: AdminUsersFilter = {}): Observable<AdminUserListItem[]> {
    let params = new HttpParams();
    if (filter.search)              params = params.set('search', filter.search);
    if (filter.role != null)        params = params.set('role', filter.role);
    if (filter.isBanned != null)    params = params.set('isBanned', filter.isBanned);
    if (filter.pageNumber != null)  params = params.set('pageNumber', filter.pageNumber);
    if (filter.pageSize != null)    params = params.set('pageSize', filter.pageSize);
    return this.http.get<AdminUserListItem[]>(`${this.base}/users`, { params });
  }

  getUserDetail(id: string): Observable<AdminUserDetail> {
    return this.http.get<AdminUserDetail>(`${this.base}/users/${id}`);
  }

  banUser(id: string, reason: string, expiresAt: string | null): Observable<void> {
    return this.http.post<void>(`${this.base}/users/${id}/ban`, { reason, expiresAt });
  }

  unbanUser(id: string, reason?: string): Observable<void> {
    return this.http.post<void>(`${this.base}/users/${id}/unban`, { reason: reason ?? null });
  }

  getUserPayments(id: string): Observable<AdminPayment[]> {
    return this.http.get<AdminPayment[]>(`${this.base}/users/${id}/payments`);
  }

  // Support action: wipes the user's TOTP secret + recovery codes and revokes all their
  // sessions (audited). 409 TwoFactor.NotEnabled when the user has no 2FA to reset.
  resetUserTwoFactor(id: string, reason: string): Observable<void> {
    return this.http.post<void>(`${this.base}/users/${id}/2fa/reset`, { reason });
  }

  // ── Startups ─────────────────────────────────────────────────────────────────

  getStartups(filter: AdminStartupsFilter = {}): Observable<AdminStartupListItem[]> {
    let params = new HttpParams();
    if (filter.search)              params = params.set('search', filter.search);
    if (filter.isBanned != null)    params = params.set('isBanned', filter.isBanned);
    if (filter.pageNumber != null)  params = params.set('pageNumber', filter.pageNumber);
    if (filter.pageSize != null)    params = params.set('pageSize', filter.pageSize);
    return this.http.get<AdminStartupListItem[]>(`${this.base}/startups`, { params });
  }

  banStartup(id: string, reason: string, expiresAt: string | null): Observable<void> {
    return this.http.post<void>(`${this.base}/startups/${id}/ban`, { reason, expiresAt });
  }

  unbanStartup(id: string, reason?: string): Observable<void> {
    return this.http.post<void>(`${this.base}/startups/${id}/unban`, { reason: reason ?? null });
  }

  // ── Subscriptions & payments ─────────────────────────────────────────────────

  getSubscriptions(filter: AdminSubscriptionsFilter = {}): Observable<AdminSubscription[]> {
    let params = new HttpParams();
    if (filter.userId)              params = params.set('userId', filter.userId);
    if (filter.status != null)      params = params.set('status', filter.status);
    if (filter.plan != null)        params = params.set('plan', filter.plan);
    if (filter.pageNumber != null)  params = params.set('pageNumber', filter.pageNumber);
    if (filter.pageSize != null)    params = params.set('pageSize', filter.pageSize);
    return this.http.get<AdminSubscription[]>(`${this.base}/subscriptions`, { params });
  }

  grantSubscription(userId: string, durationDays: number | null, reason: string): Observable<void> {
    return this.http.post<void>(`${this.base}/subscriptions/grant`, { userId, durationDays, reason });
  }

  extendSubscription(id: string, additionalDays: number, reason: string): Observable<void> {
    return this.http.post<void>(`${this.base}/subscriptions/${id}/extend`, { additionalDays, reason });
  }

  revokeSubscription(id: string, reason: string): Observable<void> {
    return this.http.post<void>(`${this.base}/subscriptions/${id}/revoke`, { reason });
  }

  /**
   * POST api/payments/{id}/refund (admin permission). Полный возврат — `amount = null`.
   * SC-48: `proportional` возвращает неиспользованную часть оплаченного периода подписки;
   * бэк считает сумму сам, поэтому `amount` в этом режиме не передаём (валидатор отклонит).
   */
  refundPayment(paymentId: string, amount: number | null, proportional = false): Observable<void> {
    const body = proportional ? { amount: null, proportional: true } : { amount };
    return this.http.post<void>(`${this.api}/payments/${paymentId}/refund`, body);
  }

  // ── Service orders (SC-49) ───────────────────────────────────────────────────

  getServiceOrders(filter: AdminServiceOrdersFilter = {}): Observable<AdminServiceOrder[]> {
    let params = new HttpParams();
    if (filter.userId)              params = params.set('userId', filter.userId);
    if (filter.status != null)      params = params.set('status', filter.status);
    if (filter.serviceType != null) params = params.set('serviceType', filter.serviceType);
    if (filter.pageNumber != null)  params = params.set('pageNumber', filter.pageNumber);
    if (filter.pageSize != null)    params = params.set('pageSize', filter.pageSize);
    return this.http.get<AdminServiceOrder[]>(`${this.base}/service-orders`, { params });
  }

  /**
   * Закрывает заказ и отзывает выданное (доступ, приоритетное размещение). Деньги не двигает —
   * возврат делается через `refundPayment`, который отменяет заказ сам.
   */
  cancelServiceOrder(id: string, reason: string): Observable<void> {
    return this.http.post<void>(`${this.base}/service-orders/${id}/cancel`, { reason });
  }

  // ── НПД ──────────────────────────────────────────────────────────────────────

  // Год по умолчанию — текущий по таймзоне дохода (Europe/Moscow), её определяет бэк.
  getNpdIncomeStatus(year?: number): Observable<NpdIncomeStatus> {
    let params = new HttpParams();
    if (year != null) params = params.set('year', year);
    return this.http.get<NpdIncomeStatus>(`${this.base}/npd/income-status`, { params });
  }

  // ── Promo codes ──────────────────────────────────────────────────────────────

  getPromoCodes(activeOnly?: boolean): Observable<AdminPromoCode[]> {
    let params = new HttpParams();
    if (activeOnly != null) params = params.set('activeOnly', activeOnly);
    return this.http.get<AdminPromoCode[]>(`${this.base}/promo-codes`, { params });
  }

  createPromoCode(body: CreatePromoCodeRequest): Observable<string> {
    return this.http.post<string>(`${this.base}/promo-codes`, body);
  }

  deactivatePromoCode(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/promo-codes/${id}/deactivate`, {});
  }

  // ── Valuation benchmarks ─────────────────────────────────────────────────────

  getBenchmarks(asOf?: string): Observable<ValuationBenchmark[]> {
    let params = new HttpParams();
    if (asOf) params = params.set('asOf', asOf);
    return this.http.get<ValuationBenchmark[]>(`${this.base}/valuation-benchmarks`, { params });
  }

  getBenchmarkHistory(metricType: number, industry: number, stage?: number | null): Observable<ValuationBenchmark[]> {
    let params = new HttpParams()
      .set('metricType', metricType)
      .set('industry', industry);
    if (stage != null) params = params.set('stage', stage);
    return this.http.get<ValuationBenchmark[]>(`${this.base}/valuation-benchmarks/history`, { params });
  }

  addBenchmark(body: AddBenchmarkRequest): Observable<string> {
    return this.http.post<string>(`${this.base}/valuation-benchmarks`, body);
  }

  // ── Верстак бенчмарков ───────────────────────────────────────────────────────

  getBenchmarkIssuers(): Observable<BenchmarkIssuer[]> {
    return this.http.get<BenchmarkIssuer[]>(`${this.base}/valuation-benchmarks/issuers`);
  }

  saveBenchmarkIssuer(body: SaveBenchmarkIssuerRequest): Observable<string> {
    return this.http.post<string>(`${this.base}/valuation-benchmarks/issuers`, body);
  }

  getBenchmarkIndustryMappings(sourceKind?: number): Observable<BenchmarkIndustryMapping[]> {
    let params = new HttpParams();
    if (sourceKind != null) params = params.set('sourceKind', sourceKind);
    return this.http.get<BenchmarkIndustryMapping[]>(
      `${this.base}/valuation-benchmarks/industry-mappings`, { params });
  }

  saveBenchmarkIndustryMapping(
    body: { sourceKind: number; externalKey: string; industry: number | null; note: string | null },
  ): Observable<string> {
    return this.http.post<string>(`${this.base}/valuation-benchmarks/industry-mappings`, body);
  }

  deleteBenchmarkIndustryMapping(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/valuation-benchmarks/industry-mappings/${id}`);
  }

  getUnmappedBenchmarkBuckets(): Observable<UnmappedBenchmarkBucket[]> {
    return this.http.get<UnmappedBenchmarkBucket[]>(`${this.base}/valuation-benchmarks/unmapped-buckets`);
  }

  /**
   * Предложения деривации. Параметры — входы запроса: сервер их не хранит,
   * они попадают в source вместе с полученным числом.
   */
  getBenchmarkSuggestions(params?: Partial<BenchmarkDerivationParams>): Observable<BenchmarkSuggestions> {
    let httpParams = new HttpParams();
    if (params?.minComparables != null)
      httpParams = httpParams.set('minComparables', params.minComparables);
    if (params?.countryDiscount != null)
      httpParams = httpParams.set('countryDiscount', params.countryDiscount);
    if (params?.illiquidityAndSizeDiscount != null)
      httpParams = httpParams.set('illiquidityAndSizeDiscount', params.illiquidityAndSizeDiscount);
    if (params?.datasetRegion) httpParams = httpParams.set('datasetRegion', params.datasetRegion);
    return this.http.get<BenchmarkSuggestions>(
      `${this.base}/valuation-benchmarks/suggestions`, { params: httpParams });
  }

  uploadDamodaranDataset(
    file: File, datasetYear: number, datasetRegion: string,
  ): Observable<DamodaranUploadResult> {
    const form = new FormData();
    form.append('file', file, file.name);
    const params = new HttpParams()
      .set('datasetYear', datasetYear)
      .set('datasetRegion', datasetRegion);
    return this.http.post<DamodaranUploadResult>(
      `${this.base}/valuation-benchmarks/damodaran`, form, { params });
  }

  /** kind: 0 капитализация, 1 выручка, 2 обе. */
  runBenchmarkCollection(kind: number): Observable<void> {
    const params = new HttpParams().set('kind', kind);
    return this.http.post<void>(`${this.base}/valuation-benchmarks/collect`, null, { params });
  }

  // ── Audit ────────────────────────────────────────────────────────────────────

  getAuditLog(targetType?: number, targetId?: string, pageNumber = 1, pageSize = 50): Observable<AdminAuditEntry[]> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);
    if (targetType != null) params = params.set('targetType', targetType);
    if (targetId)           params = params.set('targetId', targetId);
    return this.http.get<AdminAuditEntry[]>(`${this.base}/audit`, { params });
  }

  // ── Legal documents ──────────────────────────────────────────────────────────

  getConsentDocuments(): Observable<ConsentDocument[]> {
    return this.http.get<ConsentDocument[]>(`${this.api}/consent-documents`);
  }

  createConsentDocument(body: CreateConsentDocumentRequest): Observable<string> {
    // The only admin request with explicit snake_case-free simple names (type/version/title/content).
    return this.http.post<string>(`${this.api}/consent-documents`, body);
  }

  activateConsentDocument(id: string): Observable<void> {
    return this.http.patch<void>(`${this.api}/consent-documents/${id}/activate`, {});
  }
}
