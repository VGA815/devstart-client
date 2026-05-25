import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing.component').then(m => m.LandingComponent),
  },
  {
    path: 'startups',
    loadComponent: () =>
      import('./features/startups/catalog/startup-catalog.component').then(m => m.StartupCatalogComponent),
  },
  {
    path: 'plans',
    loadComponent: () =>
      import('./features/plans/plans.component').then(m => m.PlansComponent),
  },
  {
    path: 'startups/new',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/startups/create/startup-create.component').then(m => m.StartupCreateComponent),
  },
  {
    path: 'startups/:id',
    loadComponent: () =>
      import('./features/startups/detail/startup-detail.component').then(m => m.StartupDetailComponent),
  },
  {
    path: 'startups/:id/edit',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/startups/edit/startup-edit.component').then(m => m.StartupEditComponent),
  },
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then(m => m.dashboardRoutes),
  },
  {
    path: 'profile/:id',
    loadComponent: () =>
      import('./features/profile/user-profile.component').then(m => m.UserProfileComponent),
  },
  {
    path: 'investors',
    loadComponent: () =>
      import('./features/investors/investors.component').then(m => m.InvestorsComponent),
  },
  {
    path: 'investors/:id',
    loadComponent: () =>
      import('./features/investors/detail/investor-detail.component').then(m => m.InvestorDetailComponent),
  },
  {
    path: 'experts',
    loadComponent: () =>
      import('./features/experts/experts.component').then(m => m.ExpertsComponent),
  },
  {
    path: 'experts/:id',
    loadComponent: () =>
      import('./features/experts/detail/expert-detail.component').then(m => m.ExpertDetailComponent),
  },
  {
    path: 'invite/:tokenId',
    loadComponent: () =>
      import('./features/invite/invite.component').then(m => m.InviteComponent),
  },
  {
    path: 'legal-details',
    loadComponent: () =>
      import('./features/legal/legal-details/legal-details.component').then(m => m.LegalDetailsComponent),
  },
  {
    path: 'legal/:type',
    loadComponent: () =>
      import('./features/legal/legal-document/legal-document.component').then(m => m.LegalDocumentComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'register/investor',
    loadComponent: () =>
      import('./features/auth/register-investor/register-investor.component').then(m => m.RegisterInvestorComponent),
  },
  {
    path: 'register/expert',
    loadComponent: () =>
      import('./features/auth/register-expert/register-expert.component').then(m => m.RegisterExpertComponent),
  },
  {
    path: 'auth/callback/:provider',
    loadComponent: () =>
      import('./features/auth/oauth-callback/oauth-callback.component').then(m => m.OAuthCallbackComponent),
  },
  {
    path: 'email/confirmed',
    loadComponent: () =>
      import('./features/email-confirm/email-confirmed.component').then(m => m.EmailConfirmedComponent),
  },
  {
    path: 'billing/return',
    loadComponent: () =>
      import('./features/billing/billing-return.component').then(m => m.BillingReturnComponent),
  },
  {
    path: '403',
    loadComponent: () =>
      import('./features/forbidden/forbidden.component').then(m => m.ForbiddenComponent),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then(m => m.NotFoundComponent),
  },
];
