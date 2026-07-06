import { ConsentItemDto } from './consent.dto';

// Token pair (access + refresh). Returned directly by /auth/refresh, and nested
// under AuthResultDto.tokens by /users/login, the OAuth callback and /auth/oauth/complete.
export interface TokenPairDto {
  accessToken:  string;
  refreshToken: string;
  expiresIn:    number;
}

// One document the user must (re-)accept before tokens are issued (response → camelCase).
export interface ConsentRequirementDto {
  type:            number;
  documentVersion: string;
}

// Consent challenge returned instead of tokens when required consents are out of date.
export interface ConsentChallengeDto {
  pendingToken: string;
  required:     ConsentRequirementDto[];
}

// 2FA challenge: the account has TOTP enabled — a code is required to finish the login.
export interface TwoFactorChallengeDto {
  pendingToken: string;
}

// Mandatory 2FA enrollment challenge (admins): the user must set up TOTP before tokens are issued.
export interface TwoFactorSetupChallengeDto {
  pendingToken: string;
}

// Envelope returned by /users/login, /auth/oauth/{p}/callback and /auth/2fa/verify.
// Exactly one of the four fields is non-null.
export interface AuthResultDto {
  tokens:          TokenPairDto | null;
  consent:         ConsentChallengeDto | null;
  twoFactor?:      TwoFactorChallengeDto | null;
  twoFactorSetup?: TwoFactorSetupChallengeDto | null;
}

// POST /auth/2fa/verify — snake_case request. `code` is a 6-digit TOTP or a recovery code.
export interface TwoFactorVerifyRequestDto {
  pending_token: string;
  code:          string;
}

// POST /auth/2fa/setup (login-time mandatory enrollment) → secret + otpauth URI + a fresh pending token.
export interface TwoFactorLoginSetupResponseDto {
  secret:       string;
  otpAuthUri:   string;
  pendingToken: string;
}

// POST /auth/2fa/setup/confirm → recovery codes (shown exactly once) + the auth outcome.
export interface TwoFactorSetupCompleteResponseDto {
  recoveryCodes: string[];
  auth:          AuthResultDto;
}

// POST /users/me/2fa/setup (authenticated self-service enrollment).
export interface TwoFactorSetupDataDto {
  secret:     string;
  otpAuthUri: string;
}

// POST /users/me/2fa/enable and /users/me/2fa/recovery-codes.
export interface RecoveryCodesResponseDto {
  recoveryCodes: string[];
}

// Request to finish a consent-gated sign-in (password OR OAuth) — snake_case.
// POST /auth/oauth/complete
export interface CompleteConsentRequestDto {
  pending_token: string;
  consents:      ConsentItemDto[];
}

// OAuth provider keys (route segment + UI label)
export type OAuthProvider = 'google' | 'github';


export interface OAuthStartResponseDto {
  authorizationUrl: string;
  state:            string;
}


export interface RefreshTokenRequestDto { refreshToken: string; }
export interface LogoutRequestDto       { refreshToken: string; }


export type AuthErrorCode =
  | 'EmailMatchesUnverifiedAccount'
  | 'AlreadyLinkedToAnotherUser'
  | 'CannotUnlinkLastCredential'
  | 'Invalid'
  | 'Expired'
  | 'ReuseDetected'
  | 'NotFound';
