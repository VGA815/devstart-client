import { Routes } from '@angular/router';

export const dashboardRoutes: Routes = [
  {
    path: '',
    redirectTo: 'overview',
    pathMatch: 'full',
  },
  {
    path: 'overview',
    loadComponent: () =>
      import('./overview/dashboard-overview.component').then(m => m.DashboardOverviewComponent),
  },
  {
    path: 'my-startups',
    loadComponent: () =>
      import('./my-startups/my-startups.component').then(m => m.MyStartupsComponent),
  },
  {
    path: 'applications',
    loadComponent: () =>
      import('./applications/applications.component').then(m => m.ApplicationsComponent),
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./notifications/notifications.component').then(m => m.NotificationsComponent),
  },
  {
    path: 'subscriptions',
    loadComponent: () =>
      import('./subscriptions/subscriptions.component').then(m => m.SubscriptionsComponent),
  },
  {
    path: 'investments',
    loadComponent: () =>
      import('./investments/investments.component').then(m => m.InvestmentsComponent),
  },
  {
    path: 'investments/deals/:dealId',
    loadComponent: () =>
      import('./investments/deal-detail/deal-detail.component').then(m => m.DealDetailComponent),
  },
  {
    path: 'documents',
    loadComponent: () =>
      import('./documents/documents.component').then(m => m.DocumentsComponent),
  },
  {
    path: 'consents',
    loadComponent: () =>
      import('./consents/consents.component').then(m => m.ConsentsComponent),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./settings/settings.component').then(m => m.SettingsComponent),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./profile/profile-page.component').then(m => m.ProfilePageComponent),
  },
  {
    path: 'messages',
    loadComponent: () =>
      import('./messages/messages-page.component').then(m => m.MessagesPageComponent),
  },
  {
    path: 'expert-profile',
    loadComponent: () =>
      import('./expert-profile/expert-profile.component').then(m => m.DashboardExpertProfileComponent),
  },
  {
    path: 'collaboration-requests',
    loadComponent: () =>
      import('./collaboration-requests/collaboration-requests.component').then(m => m.CollaborationRequestsComponent),
  },
];
