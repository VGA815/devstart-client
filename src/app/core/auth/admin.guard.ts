import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AuthService } from './auth.service';

// Self-contained: loads the current user first if needed, so the role check
// never runs against a not-yet-loaded session.
export const AdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const check = () =>
    auth.role() === 'Admin' ? true : router.createUrlTree(['/403']);

  if (auth.isAuthenticated()) {
    return check();
  }

  if (!auth.getAccessToken()) {
    return router.createUrlTree(['/login']);
  }

  return auth.loadCurrentUser().pipe(
    map(check),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};
