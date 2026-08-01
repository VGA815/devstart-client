import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { catchError, distinctUntilChanged, filter, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { ConsentService } from '../consents/consent.service';

/** Backend ConsentType.Cookies (0 PDP, 1 Privacy, 2 ToS, 3 Cookies, 4 Offer). */
const COOKIES_CONSENT_TYPE = 3;

type PaqCommand = [string, ...unknown[]];

declare global {
  interface Window { _paq?: PaqCommand[]; }
}

/**
 * Self-hosted Matomo, served same-origin at environment.matomoUrl (prod: "/matomo/").
 *
 * Cookieless by default: the tracker starts in `requireCookieConsent` mode, so visits are
 * recorded without any _pk_* cookie until the signed-in user has an active ConsentType.Cookies
 * (3). Anonymous visitors never trigger an HTTP call — GET /api/consents is authenticated-only.
 *
 * Fully disabled (no script injected, every method a no-op) when matomoUrl or matomoSiteId is
 * empty — the default for `ng serve` and for unit tests.
 */
@Injectable({ providedIn: 'root' })
export class MatomoService {
  private readonly doc      = inject(DOCUMENT);
  private readonly router   = inject(Router);
  private readonly auth     = inject(AuthService);
  private readonly consents = inject(ConsentService);

  // toObservable() needs an injection context; this field initialiser runs inside the service
  // constructor, which has one. It is not subscribed until init() decides Matomo is configured.
  private readonly user$ = toObservable(this.auth.user);

  private started = false;
  /** Previous SPA URL, so each virtual page view gets the correct internal referrer. */
  private lastUrl: string | null = null;

  private get configured(): boolean {
    return !!environment.matomoUrl && !!environment.matomoSiteId;
  }

  init(): void {
    if (this.started || !this.configured) { return; }
    this.started = true;

    const base = environment.matomoUrl.endsWith('/')
      ? environment.matomoUrl
      : `${environment.matomoUrl}/`;

    // No inline <script>: the command queue is built here in TS and only the external matomo.js
    // is injected, so a `script-src 'self'` CSP (see nginx.conf) stays sufficient — Matomo is
    // same-origin, so neither 'unsafe-inline' nor an extra CSP host is needed.
    const paq: PaqCommand[] = (window._paq ??= []);
    paq.push(['setTrackerUrl', `${base}matomo.php`]);
    paq.push(['setSiteId', environment.matomoSiteId]);
    // Cookieless until consent. MUST be queued before the first trackPageView.
    paq.push(['requireCookieConsent']);
    paq.push(['setCookieSameSite', 'Lax']);
    paq.push(['setSecureCookie', this.doc.location.protocol === 'https:']);
    // Deliberately NO trackPageView here: the first NavigationEnd below fires it. Doing both
    // double-counts the landing page.

    this.injectTracker(base);
    this.trackRouteChanges();
    this.followCookieConsent();
  }

  /** Manual page view, for pages that set their <title> asynchronously (e.g. after a fetch). */
  trackPageView(title?: string): void {
    if (!this.started) { return; }
    this.push(['setDocumentTitle', title ?? this.doc.title]);
    this.push(['trackPageView']);
  }

  private injectTracker(base: string): void {
    const script = this.doc.createElement('script');
    script.async = true;
    script.defer = true;
    script.src = `${base}matomo.js`;
    this.doc.head.appendChild(script);
  }

  private trackRouteChanges(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => {
        // Titles are set imperatively by the routed component, and a lazy loadComponent is only
        // instantiated during the change-detection pass that FOLLOWS NavigationEnd — so
        // document.title right now is still the previous page's. Defer one macrotask.
        setTimeout(() => {
          const url = e.urlAfterRedirects;
          // Order matters; getting it wrong is the classic SPA-Matomo bug:
          //  1. referrer  — the page we came FROM. document.referrer only knows the external
          //                 entry point, so every internal hop would be mis-attributed to it.
          //  2. custom URL — the page we are ON.
          //  3. title.
          //  4. trackPageView — reads the three values set above.
          //  5. enableLinkTracking — (re)binds outlink/download handlers to the DOM that was just
          //     rendered. It is per-page-view, not once per app.
          this.push(['setReferrerUrl', this.lastUrl ?? this.doc.referrer]);
          this.push(['setCustomUrl', url]);
          this.push(['setDocumentTitle', this.doc.title]);
          this.push(['trackPageView']);
          this.push(['enableLinkTracking']);
          this.lastUrl = url;
        });
      });
  }

  private followCookieConsent(): void {
    this.user$
      .pipe(
        // While a stored token is being exchanged for a user (AppComponent.ngOnInit ->
        // loadCurrentUser), auth.user() is still null. Swallow that transient null so a returning
        // consenting user is not flipped to "no consent" and back on every page load. If
        // loadCurrentUser() fails, AppComponent calls logout() -> the token is cleared -> this
        // filter opens and we correctly fall back to cookieless.
        filter(user => user !== null || !this.auth.getAccessToken()),
        distinctUntilChanged((a, b) => a?.id === b?.id),
        switchMap(user =>
          user === null
            // Anonymous: stay cookieless and never call the authenticated /consents endpoint.
            ? of(false)
            : this.consents.getUserConsents().pipe(
                // GET /api/consents returns the full HISTORY (a revoke + re-accept yields two
                // rows for type 3), so `.some` on isActive is the right predicate, not `.find`.
                map(list => list.some(c => c.type === COOKIES_CONSENT_TYPE && c.isActive)),
                catchError(() => of(false)),   // fail closed: no consent -> stay cookieless
              ),
        ),
        distinctUntilChanged(),
      )
      .subscribe(granted =>
        this.push([granted ? 'rememberCookieConsentGiven' : 'forgetCookieConsentGiven']),
      );
  }

  private push(command: PaqCommand): void {
    window._paq?.push(command);
  }
}
