import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BYPASS_403 } from '../../core/http/error.interceptor';
import { CheckoutSession, CurrentSubscription, PaymentHistoryItem } from '../models/subscription.model';
import {
  CheckoutSessionDto,
  CurrentSubscriptionDto,
  PaymentHistoryDto,
  mapCheckoutSessionDto,
  mapCurrentSubscriptionDto,
  mapPaymentHistoryDto,
} from '../models/dto/subscription.dto';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/subscriptions`;

  getCurrent(): Observable<CurrentSubscription> {
    return this.http.get<CurrentSubscriptionDto>(`${this.base}/current`).pipe(
      map(mapCurrentSubscriptionDto)
    );
  }

  getPayments(): Observable<PaymentHistoryItem[]> {
    return this.http.get<PaymentHistoryDto[]>(`${this.base}/payments`).pipe(
      map(list => list.map(mapPaymentHistoryDto))
    );
  }

  // An already-active subscription returns 403, handled inline on the plans page —
  // opt out of the global /403 redirect. An eligible promo code may activate the plan
  // for free: the response then has activated=true and no confirmationUrl.
  checkout(promoCode?: string): Observable<CheckoutSession> {
    const body = promoCode ? { promoCode } : {};
    return this.http.post<CheckoutSessionDto>(`${this.base}/checkout`, body, {
      context: new HttpContext().set(BYPASS_403, true),
    }).pipe(
      map(mapCheckoutSessionDto)
    );
  }
}
