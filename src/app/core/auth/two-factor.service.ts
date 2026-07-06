import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TwoFactorSetupDataDto,
  RecoveryCodesResponseDto,
} from '../../shared/models/dto/auth.dto';

/** Authenticated self-service TOTP management (api/users/me/2fa/*). */
@Injectable({ providedIn: 'root' })
export class TwoFactorService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/users/me/2fa`;

  // Creates (or rotates, while unconfirmed) the pending TOTP secret.
  setup(): Observable<TwoFactorSetupDataDto> {
    return this.http.post<TwoFactorSetupDataDto>(`${this.base}/setup`, {});
  }

  // Confirms the pending secret with a first code and activates 2FA.
  // Returns the recovery codes — the only time they are visible.
  enable(code: string): Observable<string[]> {
    return this.http.post<RecoveryCodesResponseDto>(`${this.base}/enable`, { code }).pipe(
      map(res => res.recoveryCodes),
    );
  }

  // Password is required for accounts that have one; the code may be TOTP or a recovery code.
  disable(password: string | null, code: string): Observable<void> {
    return this.http.post<void>(`${this.base}/disable`, { password: password || null, code });
  }

  // Replaces all recovery codes; requires a valid TOTP code.
  regenerateRecoveryCodes(code: string): Observable<string[]> {
    return this.http.post<RecoveryCodesResponseDto>(`${this.base}/recovery-codes`, { code }).pipe(
      map(res => res.recoveryCodes),
    );
  }
}
