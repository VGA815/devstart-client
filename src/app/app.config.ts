import {
  ApplicationConfig, inject, provideAppInitializer,
  provideExperimentalZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { captchaInterceptor } from './core/captcha/captcha.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { IdlePreloadStrategy } from './core/routing/idle-preload.strategy';
import { MatomoService } from './core/analytics/matomo.service';

export const appConfig: ApplicationConfig = {
  providers: [
    // Zoneless: zone.js убран и из polyfills в angular.json. Весь рендерящийся
    // стейт живёт в сигналах, поэтому планировщику хватает их записей —
    // плоские поля в компонентах приватные и в шаблоны не попадают.
    provideExperimentalZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding(), withPreloading(IdlePreloadStrategy)),
    // captchaInterceptor идёт первым: токен должен появиться до того, как authInterceptor
    // клонирует запрос ради Authorization. No-op при пустом environment.captchaSiteKey.
    provideHttpClient(
      withInterceptors([captchaInterceptor, authInterceptor, errorInterceptor])
    ),
    // Analytics. Here rather than in AppComponent.ngOnInit so the router subscription exists
    // before the first NavigationEnd (this runs before the root component is created), and so
    // component TestBed specs never boot the tracker. Returns void — bootstrap is not blocked.
    // No-ops entirely when environment.matomoUrl is empty (ng serve, unit tests).
    provideAppInitializer(() => inject(MatomoService).init()),
  ],
};
