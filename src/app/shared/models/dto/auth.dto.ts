// Token pair (access + refresh)
// Returned by /users/login, /auth/refresh and /auth/oauth/{p}/callback.
export interface TokenPairDto {
  accessToken:  string;
  refreshToken: string;
  expiresIn:    number;
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
