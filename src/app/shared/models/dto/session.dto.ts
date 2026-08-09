// Responses are camelCase, request bodies snake_case — the convention across this API.

/** GET /users/me/sessions — one entry per active refresh-token chain. */
export interface SessionDto {
  id:         string;   // session id: stable across refreshes, unlike the underlying token row
  current:    boolean;
  createdAt:  string;
  lastUsedAt: string;
  expiresAt:  string;
  ipAddress:  string | null;
  browser:    string;
  os:         string;
  deviceKind: string;
}

/** GET /users/me/devices — browsers allowed to skip the 2FA code until they expire. */
export interface TrustedDeviceDto {
  id:         string;
  label:      string | null;
  browser:    string;
  os:         string;
  createdAt:  string;
  lastUsedAt: string;
  expiresAt:  string;
  ipAddress:  string | null;
}

/** 0 = code every login, 1 = remember device, 2 = remember device only on the same network. */
export type TwoFactorStrictness = 0 | 1 | 2;

/**
 * GET /users/me/security. `maxTrustDurationDays` and `availableDurations` already account for the
 * caller's role, so the client never needs to know about admin caps or the preset list.
 */
export interface SecuritySettingsDto {
  strictness:             TwoFactorStrictness;
  trustDurationDays:      number;
  notifyOnNewDeviceLogin: boolean;
  maxTrustDurationDays:   number;
  availableDurations:     number[];
}

/** PUT /users/me/security */
export interface UpdateSecuritySettingsRequestDto {
  strictness:                 TwoFactorStrictness;
  trust_duration_days:        number;
  notify_on_new_device_login: boolean;
}

/** POST /users/me/sessions/revoke-all */
export interface RevokeAllSessionsRequestDto {
  include_current: boolean;
}
