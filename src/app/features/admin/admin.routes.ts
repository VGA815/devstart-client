import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    redirectTo: 'users',
    pathMatch: 'full',
  },
  {
    path: 'users',
    loadComponent: () =>
      import('./users/admin-users.component').then(m => m.AdminUsersComponent),
  },
  {
    path: 'users/:id',
    loadComponent: () =>
      import('./users/admin-user-detail.component').then(m => m.AdminUserDetailComponent),
  },
  {
    path: 'startups',
    loadComponent: () =>
      import('./startups/admin-startups.component').then(m => m.AdminStartupsComponent),
  },
  {
    path: 'subscriptions',
    loadComponent: () =>
      import('./subscriptions/admin-subscriptions.component').then(m => m.AdminSubscriptionsComponent),
  },
  {
    path: 'promo-codes',
    loadComponent: () =>
      import('./promo-codes/admin-promo-codes.component').then(m => m.AdminPromoCodesComponent),
  },
  {
    path: 'benchmarks',
    loadComponent: () =>
      import('./benchmarks/admin-benchmarks.component').then(m => m.AdminBenchmarksComponent),
  },
  {
    path: 'legal',
    loadComponent: () =>
      import('./legal/admin-legal-docs.component').then(m => m.AdminLegalDocsComponent),
  },
  {
    path: 'audit',
    loadComponent: () =>
      import('./audit/admin-audit.component').then(m => m.AdminAuditComponent),
  },
];
