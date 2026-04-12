import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Notification } from '../../../shared/models/notification.model';
import { NotificationDto, mapNotificationDto } from '../../../shared/models/dto/notification.dto';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/notifications`;

  getAll(page = 1, pageSize = 20, isRead?: boolean): Observable<Notification[]> {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);
    if (isRead !== undefined) params = params.set('isRead', isRead);

    return this.http.get<NotificationDto[]>(this.base, { params }).pipe(
      map(list => list.map(mapNotificationDto))
    );
  }

  getUnreadCount(): Observable<number> {
    return this.http.get<number>(`${this.base}/unread-count`);
  }

  getCentrifugoToken(): Observable<{ token: string }> {
    return this.http.get<{ token: string }>(`${this.base}/centrifugo-token`);
  }

  markRead(notificationId: string): Observable<void> {
    return this.http.put<void>(`${this.base}/${notificationId}/read`, {});
  }

  markAllRead(): Observable<void> {
    return this.http.put<void>(`${this.base}/read-all`, {});
  }
}
