import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InviteTokenService {
  private readonly http = inject(HttpClient);
  private readonly inviteBase = `${environment.apiUrl}/invite-tokens`;
  private readonly orgBase    = `${environment.apiUrl}/organizations`;

  createToken(startupId: string): Observable<string> {
    const params = new HttpParams().set('startupId', startupId);
    return this.http.post<string>(this.inviteBase, null, { params });
  }

  validateToken(tokenId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.inviteBase}/${tokenId}`);
  }

  joinByToken(tokenId: string): Observable<string> {
    const params = new HttpParams().set('tokenId', tokenId);
    return this.http.post<string>(`${this.orgBase}/join`, null, { params });
  }
}
