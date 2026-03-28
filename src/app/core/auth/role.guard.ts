import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { UserRole } from '../../shared/models/user.model';

export const RoleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const requiredRole: UserRole = route.data['role'];

  if (auth.role() === requiredRole || auth.role() === 'Admin') {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
