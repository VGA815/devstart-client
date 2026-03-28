import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { AuthService } from './auth.service';



let refreshing = false;
const refreshDone$ = new BehaviorSubject<string | null>(null);

function attachToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function isAuthEndpoint(url: string): boolean {
  return url.includes('/auth/refresh')
      || url.includes('/auth/logout')
      || url.includes('/users/login')
      || url.includes('/users/register')
      || url.includes('/auth/oauth/');
}

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const auth = inject(AuthService);

  const token   = auth.getAccessToken();
  const authReq = token ? attachToken(req, token) : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && token && !isAuthEndpoint(req.url)) {
        return handle401(auth, req, next);
      }
      if (err.status === 401 && token && isAuthEndpoint(req.url) && req.url.includes('/auth/refresh')) {
        auth.clearSession();
      }
      return throwError(() => err);
    })
  );
};

function handle401(
  auth: AuthService,
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<any> {
  if (!auth.getRefreshToken()) {
    auth.logout();
    return throwError(() => new HttpErrorResponse({ status: 401 }));
  }

  if (refreshing) {
    return refreshDone$.pipe(
      filter((t): t is string => t !== null),
      take(1),
      switchMap(newToken => next(attachToken(req, newToken))),
    );
  }

  refreshing = true;
  refreshDone$.next(null);

  return auth.refresh().pipe(
    switchMap(pair => {
      refreshing = false;
      refreshDone$.next(pair.accessToken);
      return next(attachToken(req, pair.accessToken));
    }),
    catchError(err => {
      refreshing = false;
      refreshDone$.next(null);
      auth.logout();
      return throwError(() => err);
    }),
  );
}
