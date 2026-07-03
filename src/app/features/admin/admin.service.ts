import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AddBenchmarkRequest,
  AdminAuditEntry,
  AdminPayment,
  AdminPromoCode,
  AdminStartupListItem,
  AdminStartupsFilter,
  AdminSubscription,
  AdminSubscriptionsFilter,
  AdminUserDetail,
  AdminUserListItem,
  AdminUsersFilter,
  ConsentDocument,
  CreateConsentDocumentRequest,
  CreatePromoCodeRequest,
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

  // Full refund when amount is null. POST api/payments/{id}/refund (admin permission).
  refundPayment(paymentId: string, amount: number | null): Observable<void> {
    return this.http.post<void>(`${this.api}/payments/${paymentId}/refund`, { amount });
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
