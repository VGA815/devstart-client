import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  OAuthProvider,
  OAuthStartResponseDto,
  TokenPairDto,
} from '../../shared/models/dto/auth.dto';

@Injectable({ providedIn: 'root' })
export class OAuthService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/auth/oauth`;

  buildRedirectUri(provider: OAuthProvider): string {
    return `${window.location.origin}/auth/callback/${provider}`;
  }

  start(provider: OAuthProvider, redirectUri: string): Observable<OAuthStartResponseDto> {
    return this.http.get<OAuthStartResponseDto>(
      `${this.base}/${provider}/start`,
      { params: new HttpParams().set('redirectUri', redirectUri) }
    );
  }

  linkStart(provider: OAuthProvider, redirectUri: string): Observable<OAuthStartResponseDto> {
    return this.http.post<OAuthStartResponseDto>(
      `${this.base}/${provider}/link/start`,
      { redirectUri }
    );
  }


  handleCallback(provider: OAuthProvider, code: string, state: string): Observable<TokenPairDto> {
    return this.http.get<TokenPairDto>(
      `${this.base}/${provider}/callback`,
      { params: new HttpParams().set('code', code).set('state', state) }
    );
  }

  unlink(provider: OAuthProvider): Observable<void> {
    return this.http.delete<void>(`${this.base}/${provider}/unlink`);
  }
}
