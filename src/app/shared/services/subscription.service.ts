import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BYPASS_403 } from '../../core/http/error.interceptor';
import { CheckoutSession, CurrentSubscription } from '../models/subscription.model';
import {
  CheckoutSessionDto,
  CurrentSubscriptionDto,
  mapCheckoutSessionDto,
  mapCurrentSubscriptionDto,
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

  // An already-active subscription returns 403, handled inline on the plans page —
  // opt out of the global /403 redirect.
  checkout(): Observable<CheckoutSession> {
    return this.http.post<CheckoutSessionDto>(`${this.base}/checkout`, {}, {
      context: new HttpContext().set(BYPASS_403, true),
    }).pipe(
      map(mapCheckoutSessionDto)
    );
  }
}
