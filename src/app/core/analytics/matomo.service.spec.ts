import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { MatomoService } from './matomo.service';
import { AuthService } from '../auth/auth.service';
import { ConsentService } from '../consents/consent.service';
import { User } from '../../shared/models/user.model';
import { environment } from '../../../environments/environment';

const TRACKER_SRC = 'http://matomo.test/matomo/matomo.js';

describe('MatomoService', () => {
  let events: Subject<NavigationEnd>;
  let user: ReturnType<typeof signal<User | null>>;
  let originalUrl: string;
  let originalSiteId: string;

  /** Command names in the order they were queued, filtered to the ones under test. */
  function queued(...names: string[]): string[] {
    return (window._paq ?? []).map(c => c[0]).filter(n => names.includes(n));
  }

  function injectedScripts(): HTMLScriptElement[] {
    return Array.from(document.head.querySelectorAll<HTMLScriptElement>('script[src*="matomo.js"]'));
  }

  function make(): MatomoService {
    return TestBed.inject(MatomoService);
  }

  beforeEach(() => {
    originalUrl = environment.matomoUrl;
    originalSiteId = environment.matomoSiteId;

    delete window._paq;
    events = new Subject<NavigationEnd>();
    user = signal<User | null>(null);

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { events } },
        { provide: AuthService, useValue: { user, getAccessToken: () => null } },
        { provide: ConsentService, useValue: { getUserConsents: () => of([]) } },
      ],
    });
  });

  afterEach(() => {
    environment.matomoUrl = originalUrl;
    environment.matomoSiteId = originalSiteId;
    injectedScripts().forEach(s => s.remove());
    delete window._paq;
  });

  describe('when not configured', () => {
    it('does nothing at all with an empty matomoUrl', () => {
      environment.matomoUrl = '';
      environment.matomoSiteId = '1';

      make().init();

      expect(window._paq).toBeUndefined();
      expect(injectedScripts().length).toBe(0);
    });

    it('does nothing at all with an empty matomoSiteId', () => {
      environment.matomoUrl = 'http://matomo.test/matomo/';
      environment.matomoSiteId = '';

      make().init();

      expect(window._paq).toBeUndefined();
      expect(injectedScripts().length).toBe(0);
    });
  });

  describe('when configured', () => {
    beforeEach(() => {
      environment.matomoUrl = 'http://matomo.test/matomo/';
      environment.matomoSiteId = '1';
    });

    it('injects the tracker once and asks for consent before any page view', () => {
      make().init();

      expect(injectedScripts().map(s => s.src)).toEqual([TRACKER_SRC]);

      const names = (window._paq ?? []).map(c => c[0]);
      const consentIdx = names.indexOf('requireCookieConsent');
      expect(consentIdx).toBeGreaterThan(-1);
      // No page view may precede requireCookieConsent, or that hit sets cookies.
      expect(names.indexOf('trackPageView')).toBe(-1);
    });

    it('does not track the landing page until the first NavigationEnd', () => {
      make().init();

      expect(queued('trackPageView').length).toBe(0);
    });

    it('emits page-view commands in the order Matomo requires', fakeAsync(() => {
      make().init();

      events.next(new NavigationEnd(1, '/startups', '/startups'));
      tick();   // the service defers one macrotask so document.title is settled

      expect(queued(
        'setReferrerUrl', 'setCustomUrl', 'setDocumentTitle', 'trackPageView', 'enableLinkTracking',
      )).toEqual([
        'setReferrerUrl', 'setCustomUrl', 'setDocumentTitle', 'trackPageView', 'enableLinkTracking',
      ]);
    }));

    it('uses the previous SPA url as the referrer of the next page view', fakeAsync(() => {
      make().init();

      events.next(new NavigationEnd(1, '/startups', '/startups'));
      tick();
      events.next(new NavigationEnd(2, '/plans', '/plans'));
      tick();

      const referrers = (window._paq ?? [])
        .filter(c => c[0] === 'setReferrerUrl')
        .map(c => c[1]);
      const urls = (window._paq ?? [])
        .filter(c => c[0] === 'setCustomUrl')
        .map(c => c[1]);

      expect(urls).toEqual(['/startups', '/plans']);
      // First hop has no internal predecessor; the second must point at the page we came from.
      expect(referrers[1]).toBe('/startups');
    }));

    it('is idempotent — a second init() does not inject a second tracker', () => {
      const service = make();
      service.init();
      service.init();

      expect(injectedScripts().length).toBe(1);
    });
  });
});
