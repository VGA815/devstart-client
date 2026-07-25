import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BYPASS_403 } from '../../core/http/error.interceptor';
import { ServiceCatalogItem, ServiceOrderCheckout, ServiceType } from '../models/service-order.model';
import {
  ServiceCatalogItemDto,
  ServiceOrderCheckoutDto,
  mapServiceCatalogDto,
  mapServiceOrderCheckoutDto,
  serviceTypeCode,
} from '../models/dto/service-order.dto';

/**
 * ЮKassa возвращает пользователя на один и тот же `ReturnUrl` и после подписки, и после разовой
 * услуги (на бэке это одна настройка). Чтобы страница возврата поняла, чем закончился заход,
 * оставляем заказ в sessionStorage перед редиректом на оплату.
 */
const PENDING_KEY = 'devstart_pending_service_order';

export interface PendingServiceOrder {
  paymentId: string;
  serviceType: ServiceType;
}

@Injectable({ providedIn: 'root' })
export class ServiceOrderService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/service-orders`;

  /** Каталог доступен анонимно — цены видно на /plans до входа. */
  getCatalog(): Observable<ServiceCatalogItem[]> {
    return this.http.get<ServiceCatalogItemDto[]>(`${this.base}/catalog`).pipe(
      map(mapServiceCatalogDto)
    );
  }

  /**
   * Заводит заказ и платёж, возвращает ссылку на оплату. 409 `Payments.IncomeLimitReached` —
   * достигнут годовой лимит НПД, новые платные операции не создаются до следующего года.
   * 403 обрабатывается инлайн на странице планов, а не общим редиректом на /403.
   */
  checkout(serviceType: ServiceType): Observable<ServiceOrderCheckout> {
    return this.http.post<ServiceOrderCheckoutDto>(
      `${this.base}/checkout`,
      { serviceType: serviceTypeCode(serviceType) },
      { context: new HttpContext().set(BYPASS_403, true) },
    ).pipe(
      map(mapServiceOrderCheckoutDto)
    );
  }

  rememberPending(paymentId: string, serviceType: ServiceType): void {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ paymentId, serviceType }));
  }

  /** Читает отложенный заказ, не стирая его: страница возврата опрашивает статус в цикле. */
  readPending(): PendingServiceOrder | null {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<PendingServiceOrder>;
      return parsed.paymentId && parsed.serviceType
        ? { paymentId: parsed.paymentId, serviceType: parsed.serviceType }
        : null;
    } catch {
      return null;
    }
  }

  clearPending(): void {
    sessionStorage.removeItem(PENDING_KEY);
  }
}
