import { Injectable } from '@angular/core';
import { TrustedDeviceGrantDto } from '../../shared/models/dto/auth.dto';

const TOKEN_KEY   = 'devstart_device_token';
const DEVICE_KEY  = 'devstart_device_id';
const EXPIRES_KEY = 'devstart_device_expires';

/**
 * Holds the "remember this device" secret that lets this browser skip the 2FA code on the next
 * sign-in.
 *
 * Kept out of AuthService on purpose: it deliberately outlives a session. Logging out must NOT clear
 * it — that is the entire point of the feature. Only revoking the device or turning 2FA off does.
 */
@Injectable({ providedIn: 'root' })
export class DeviceTrustStore {
  /**
   * The stored token, or null once it has expired. Expiry is checked here so a stale token quietly
   * disappears instead of being sent and rejected — the server deliberately gives no distinct
   * "bad device token" answer, so the client cannot learn it that way.
   */
  token(): string | null {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    const expires = localStorage.getItem(EXPIRES_KEY);
    if (expires && Date.parse(expires) <= Date.now()) {
      this.clear();
      return null;
    }
    return token;
  }

  /** Id of this browser's trusted-device row, used to mark "это устройство" in the settings list. */
  deviceId(): string | null {
    return this.token() ? localStorage.getItem(DEVICE_KEY) : null;
  }

  save(grant: TrustedDeviceGrantDto): void {
    localStorage.setItem(TOKEN_KEY,   grant.deviceToken);
    localStorage.setItem(DEVICE_KEY,  grant.deviceId);
    localStorage.setItem(EXPIRES_KEY, grant.expiresAt);
  }

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(DEVICE_KEY);
    localStorage.removeItem(EXPIRES_KEY);
  }
}
