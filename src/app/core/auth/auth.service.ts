import { HttpClient } from '@angular/common/http';
import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, switchMap, tap, map, throwError, finalize, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../../shared/models/user.model';
import { UserDto, LoginRequestDto, RegisterRequestDto, mapUserDto } from '../../shared/models/dto/user.dto';
import { TokenPairDto } from '../../shared/models/dto/auth.dto';

const ACCESS_KEY  = 'devstart_access';
const REFRESH_KEY = 'devstart_refresh';

interface JwtClaims {
  sub: string;
  email: string;
  exp: number;
  jti?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http   = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _user    = signal<User | null>(null);
  private readonly _loading = signal(false);

  readonly user             = this._user.asReadonly();
  readonly loading          = this._loading.asReadonly();
  readonly isAuthenticated  = computed(() => this._user() !== null);


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


  login(body: LoginRequestDto): Observable<User> {
    this._loading.set(true);
    return this.http.post<TokenPairDto>(
      `${environment.apiUrl}/users/login`,
      body
    ).pipe(
      switchMap(pair => this.completeSession(pair)),
      finalize(() => this._loading.set(false)),
    );
  }


  
  register(body: RegisterRequestDto): Observable<User> {
    this._loading.set(true);
    return this.http.post<string>(
      `${environment.apiUrl}/users/register`,
      body
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
    return this.http.post<void>(
      `${environment.apiUrl}/email-verification/resend`,
      { email }
    );
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
