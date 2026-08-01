import { ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { MatomoService } from './core/analytics/matomo.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor])
    ),
    // Analytics. Here rather than in AppComponent.ngOnInit so the router subscription exists
    // before the first NavigationEnd (this runs before the root component is created), and so
    // component TestBed specs never boot the tracker. Returns void — bootstrap is not blocked.
    // No-ops entirely when environment.matomoUrl is empty (ng serve, unit tests).
    provideAppInitializer(() => inject(MatomoService).init()),
  ],
};
