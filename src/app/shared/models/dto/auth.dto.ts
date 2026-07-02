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

// Envelope returned by /users/login and /auth/oauth/{p}/callback.
// Exactly one of `tokens` / `consent` is non-null.
export interface AuthResultDto {
  tokens:  TokenPairDto | null;
  consent: ConsentChallengeDto | null;
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
