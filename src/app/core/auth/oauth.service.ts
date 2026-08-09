import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  OAuthProvider,
  OAuthStartResponseDto,
  AuthResultDto,
} from '../../shared/models/dto/auth.dto';
import { DeviceTrustStore } from './device-trust.store';

@Injectable({ providedIn: 'root' })
export class OAuthService {
  private readonly http        = inject(HttpClient);
  private readonly deviceTrust = inject(DeviceTrustStore);
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


  // Returns the `{ tokens, consent }` envelope — feed it to AuthService.handleAuthResult().
  // The trusted-device token travels in a header, never a query parameter (query strings land in
  // nginx and Serilog request logs), and only on this call — attaching it in the interceptor would
  // leak it to every endpoint.
  handleCallback(provider: OAuthProvider, code: string, state: string): Observable<AuthResultDto> {
    const deviceToken = this.deviceTrust.token();
    return this.http.get<AuthResultDto>(
      `${this.base}/${provider}/callback`,
      {
        params: new HttpParams().set('code', code).set('state', state),
        headers: deviceToken ? { 'X-Device-Token': deviceToken } : {},
      }
    );
  }

  unlink(provider: OAuthProvider): Observable<void> {
    return this.http.delete<void>(`${this.base}/${provider}/unlink`);
  }
}
