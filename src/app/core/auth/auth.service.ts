import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, switchMap, tap, map, throwError, finalize, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BYPASS_403 } from '../http/error.interceptor';
import { User } from '../../shared/models/user.model';
import {
  UserDto,
  LoginRequestDto,
  RegisterRequestDto,
  ForgotPasswordRequestDto,
  ResetPasswordRequestDto,
  ChangePasswordRequestDto,
  mapUserDto,
} from '../../shared/models/dto/user.dto';
import {
  TokenPairDto,
  AuthResultDto,
  ConsentChallengeDto,
  CompleteConsentRequestDto,
} from '../../shared/models/dto/auth.dto';
import { ConsentItemDto } from '../../shared/models/dto/consent.dto';

const ACCESS_KEY  = 'devstart_access';
const REFRESH_KEY = 'devstart_refresh';

interface JwtClaims {
  sub: string;
  email: string;
  exp: number;
  jti?: string;
}

/** Result of a sign-in attempt: either fully authenticated, or a consent challenge to satisfy. */
export type AuthOutcome =
  | { kind: 'authenticated'; user: User }
  | { kind: 'consent'; challenge: ConsentChallengeDto };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _user    = signal<User | null>(null);
  private readonly _loading = signal(false);
  private readonly _pendingChallenge = signal<ConsentChallengeDto | null>(null);

  readonly user             = this._user.asReadonly();
  readonly loading          = this._loading.asReadonly();
  readonly isAuthenticated  = computed(() => this._user() !== null);
  /** Set when login/OAuth returned a consent challenge instead of tokens. */
  readonly pendingChallenge = this._pendingChallenge.asReadonly();


  getAccessToken():  string | null { return localStorage.getItem(ACCESS_KEY); }
  getRefreshToken(): string | null { return localStorage.getItem(REFRESH_KEY); }

  setSession(pair: TokenPairDto): void {
    localStorage.setItem(ACCESS_KEY,  pair.accessToken);
    localStorage.setItem(REFRESH_KEY, pair.refreshToken);
  }

  clearSession(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    this._user.set(null);
  }

  decodeToken(token: string): JwtClaims | null {
    try {
      const payload = token.split('.')[1];
      const padded  = payload.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(padded)) as JwtClaims;
    } catch {
      return null;
    }
  }


  // Returns either an authenticated user or a consent challenge to satisfy.
  // 403 here means "email not verified" — surfaced inline by the login/register
  // forms, so opt out of the global /403 redirect.
  login(body: LoginRequestDto): Observable<AuthOutcome> {
    this._loading.set(true);
    return this.http.post<AuthResultDto>(
      `${environment.apiUrl}/users/login`,
      body,
      { context: new HttpContext().set(BYPASS_403, true) }
    ).pipe(
      switchMap(res => this.processAuthResult(res)),
      finalize(() => this._loading.set(false)),
    );
  }


  
  register(body: RegisterRequestDto): Observable<AuthOutcome> {
    this._loading.set(true);
    return this.http.post<string>(
      `${environment.apiUrl}/users/register`,
      body,
      { context: new HttpContext().set(BYPASS_403, true) }
    ).pipe(
      switchMap(() => this.login({ email: body.email, password: body.password })),
      finalize(() => this._loading.set(false)),
    );
  }


  
  completeSession(pair: TokenPairDto): Observable<User> {
    this.setSession(pair);
    const claims = this.decodeToken(pair.accessToken);
    if (!claims?.sub) return throwError(() => new Error('Invalid token'));
    return this.http.get<UserDto>(`${environment.apiUrl}/users/${claims.sub}`).pipe(
      map(mapUserDto),
      tap(user => this._user.set(user)),
    );
  }

  // Normalize a login/OAuth response — the documented `{ tokens, consent }` envelope,
  // or (defensively) a bare token pair — into an AuthOutcome.
  private processAuthResult(res: AuthResultDto | TokenPairDto): Observable<AuthOutcome> {
    const bare = res as TokenPairDto;
    if (bare.accessToken) return this.toAuthenticated(bare);

    const env = res as AuthResultDto;
    if (env.tokens) return this.toAuthenticated(env.tokens);
    if (env.consent) {
      this._pendingChallenge.set(env.consent);
      return of<AuthOutcome>({ kind: 'consent', challenge: env.consent });
    }
    return throwError(() => new Error('Malformed auth result'));
  }

  private toAuthenticated(pair: TokenPairDto): Observable<AuthOutcome> {
    this._pendingChallenge.set(null);
    return this.completeSession(pair).pipe(
      map(user => ({ kind: 'authenticated', user }) as AuthOutcome),
    );
  }

  // Process an OAuth callback envelope (tokens or a consent challenge).
  handleAuthResult(res: AuthResultDto): Observable<AuthOutcome> {
    return this.processAuthResult(res);
  }

  // Finish a consent-gated sign-in (password OR OAuth) using the stored pending
  // challenge — the same /auth/oauth/complete endpoint serves both. → token pair → session.
  completeConsent(consents: ConsentItemDto[]): Observable<AuthOutcome> {
    const challenge = this._pendingChallenge();
    if (!challenge) return throwError(() => new Error('No pending consent challenge'));

    this._loading.set(true);
    const body: CompleteConsentRequestDto = {
      pending_token: challenge.pendingToken,
      consents,
    };
    return this.http.post<AuthResultDto>(
      `${environment.apiUrl}/auth/oauth/complete`,
      body,
    ).pipe(
      switchMap(res => this.processAuthResult(res)),
      finalize(() => this._loading.set(false)),
    );
  }

  clearPendingChallenge(): void {
    this._pendingChallenge.set(null);
  }

  loadCurrentUser(): Observable<User> {
    const token = this.getAccessToken();
    if (!token) return throwError(() => new Error('No token'));

    const claims = this.decodeToken(token);
    if (!claims?.sub) return throwError(() => new Error('Invalid token'));

    return this.http.get<UserDto>(`${environment.apiUrl}/users/${claims.sub}`).pipe(
      map(mapUserDto),
      tap(user => this._user.set(user)),
    );
  }

  resendEmailVerification(email: string): Observable<void> {
    // Backend binds the address from the query string ([FromQuery] string email).
    return this.http.post<void>(
      `${environment.apiUrl}/email-verification/resend`,
      null,
      { params: new HttpParams().set('email', email) }
    );
  }

  // Always resolves with 204 regardless of whether the email is registered
  // (backend is enumeration-safe), so callers should show the same "check your inbox" state.
  forgotPassword(email: string): Observable<void> {
    const body: ForgotPasswordRequestDto = { email };
    return this.http.post<void>(`${environment.apiUrl}/users/forgot-password`, body);
  }

  // 404 → token missing/expired/already used.
  resetPassword(token: string, newPassword: string): Observable<void> {
    const body: ResetPasswordRequestDto = { token, new_password: newPassword };
    return this.http.post<void>(`${environment.apiUrl}/users/reset-password`, body);
  }

  // Authenticated (Bearer added by authInterceptor). 400 → wrong current password, 409 → password not set.
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    const body: ChangePasswordRequestDto = { current_password: currentPassword, new_password: newPassword };
    return this.http.post<void>(`${environment.apiUrl}/users/change-password`, body);
  }

  
  
  refresh(): Observable<TokenPairDto> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return throwError(() => new Error('No refresh token'));

    return this.http.post<TokenPairDto>(
      `${environment.apiUrl}/auth/refresh`,
      { refreshToken }
    ).pipe(
      tap(pair => this.setSession(pair)),
    );
  }

  
  
  logout(): void {
    const refreshToken = this.getRefreshToken();
    const finishLocal = () => {
      this.clearSession();
      this.router.navigate(['/']);
    };

    if (!refreshToken) { finishLocal(); return; }

    this.http.post<void>(
      `${environment.apiUrl}/auth/logout`,
      { refreshToken }
    ).pipe(
      catchError(() => of(void 0)),
    ).subscribe({ next: finishLocal, error: finishLocal });
  }
}
