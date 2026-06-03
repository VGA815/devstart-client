import { HttpInterceptorFn, HttpErrorResponse, HttpContextToken } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

export const BYPASS_403 = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      switch (err.status) {
        case 403:
          if (!req.context.get(BYPASS_403)) {
            router.navigateByUrl('/403');
          }
          break;
        case 500:
        case 502:
        case 503:
          console.error('Server error', err.status);
          break;
      }
      return throwError(() => err);
    })
  );
};
