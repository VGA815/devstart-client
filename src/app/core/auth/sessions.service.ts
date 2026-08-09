import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  SessionDto,
  TrustedDeviceDto,
  SecuritySettingsDto,
  UpdateSecuritySettingsRequestDto,
  RevokeAllSessionsRequestDto,
} from '../../shared/models/dto/session.dto';
import { DeviceTrustStore } from './device-trust.store';

/** Active sessions, trusted devices and the 2FA policy (api/users/me/{sessions,devices,security}). */
@Injectable({ providedIn: 'root' })
export class SessionsService {
  private readonly http        = inject(HttpClient);
  private readonly deviceTrust = inject(DeviceTrustStore);
  private readonly base = `${environment.apiUrl}/users/me`;

  listSessions(): Observable<SessionDto[]> {
    return this.http.get<SessionDto[]>(`${this.base}/sessions`);
  }

  revokeSession(sessionId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/sessions/${sessionId}`);
  }

  /** Defaults to sparing the caller's own session — otherwise the user signs themselves out. */
  revokeAllSessions(includeCurrent = false): Observable<void> {
    const body: RevokeAllSessionsRequestDto = { include_current: includeCurrent };
    return this.http.post<void>(`${this.base}/sessions/revoke-all`, body);
  }

  listDevices(): Observable<TrustedDeviceDto[]> {
    return this.http.get<TrustedDeviceDto[]>(`${this.base}/devices`);
  }

  revokeDevice(deviceId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/devices/${deviceId}`).pipe(
      // Revoking this very browser must also drop its local token, or the next login would send a
      // token the server has already retired.
      tap(() => { if (this.deviceTrust.deviceId() === deviceId) this.deviceTrust.clear(); }),
    );
  }

  revokeAllDevices(): Observable<void> {
    return this.http.post<void>(`${this.base}/devices/revoke-all`, {}).pipe(
      tap(() => this.deviceTrust.clear()),
    );
  }

  getSecurity(): Observable<SecuritySettingsDto> {
    return this.http.get<SecuritySettingsDto>(`${this.base}/security`);
  }

  updateSecurity(body: UpdateSecuritySettingsRequestDto): Observable<void> {
    return this.http.put<void>(`${this.base}/security`, body).pipe(
      // The server drops every trusted device whenever the trust policy changes.
      tap(() => this.deviceTrust.clear()),
    );
  }
}
