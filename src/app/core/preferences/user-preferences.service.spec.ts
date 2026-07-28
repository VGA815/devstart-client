import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserPreferencesService } from './user-preferences.service';
import { THEME_STORAGE_KEY } from './theme.constants';
import { AuthService } from '../auth/auth.service';
import { User } from '../../shared/models/user.model';
import { environment } from '../../../environments/environment';

const USER = { id: 'u-1' } as User;

describe('UserPreferencesService', () => {
  let httpMock: HttpTestingController;
  let user: ReturnType<typeof signal<User | null>>;
  let mqListeners: ((e: MediaQueryListEvent) => void)[];
  let systemLight: boolean;

  /** Builds the service AFTER localStorage/matchMedia are staged for the case at hand. */
  function make(): UserPreferencesService {
    return TestBed.inject(UserPreferencesService);
  }

  function fireSystemChange(matches: boolean): void {
    mqListeners.forEach(fn => fn({ matches } as MediaQueryListEvent));
    TestBed.flushEffects();
  }

  function themeAttr(): string | null {
    return document.documentElement.getAttribute('data-theme');
  }

  beforeEach(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');

    mqListeners = [];
    systemLight = false;
    spyOn(window, 'matchMedia').and.callFake(() => ({
      get matches() { return systemLight; },
      addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => { mqListeners.push(fn); },
      removeEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => {
        mqListeners = mqListeners.filter(l => l !== fn);
      },
    } as unknown as MediaQueryList));

    user = signal<User | null>(null);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { user } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');
  });

  describe('stored preference', () => {
    it('defaults to System when nothing is stored', () => {
      expect(make().theme()).toBe('System');
    });

    it('falls back to System on a garbage stored value', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'Chartreuse');
      expect(make().theme()).toBe('System');
    });

    it('honours a stored explicit choice', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'Light');
      expect(make().theme()).toBe('Light');
    });
  });

  describe('anonymous visitor', () => {
    it('applies the theme locally and issues no request', () => {
      const service = make();

      service.setTheme('Light').subscribe();
      TestBed.flushEffects();

      expect(themeAttr()).toBe('light');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('Light');
      // httpMock.verify() in afterEach fails if anything was sent.
    });
  });

  describe('authenticated visitor', () => {
    beforeEach(() => user.set(USER));

    // Regression guard: a guessed `true` here would silently re-enable
    // notifications for a user who had turned them off.
    it('fetches the notifications flag before PUTting when prefs are not loaded', () => {
      const service = make();

      service.setTheme('Light').subscribe();

      const get = httpMock.expectOne(`${environment.apiUrl}/users/preferences/${USER.id}`);
      expect(get.request.method).toBe('GET');
      get.flush({ userId: USER.id, theme: 0, receiveNotifications: false });

      const put = httpMock.expectOne(`${environment.apiUrl}/users/preferences`);
      expect(put.request.method).toBe('PUT');
      expect(put.request.body).toEqual({
        user_id: USER.id,
        theme: 1,                      // Light
        receive_notifications: false,  // сервера, а не угаданное
      });
      put.flush(null);
    });

    it('skips the GET once prefs are loaded', () => {
      const service = make();

      service.load(USER.id).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/users/preferences/${USER.id}`)
        .flush({ userId: USER.id, theme: 0, receiveNotifications: false });

      service.setTheme('Light').subscribe();

      const put = httpMock.expectOne(`${environment.apiUrl}/users/preferences`);
      expect(put.request.body.receive_notifications).toBe(false);
      put.flush(null);
    });

    it('does not PUT when the flag fetch fails, but still applies the theme', () => {
      const service = make();

      service.setTheme('Light').subscribe();

      httpMock.expectOne(`${environment.apiUrl}/users/preferences/${USER.id}`)
        .flush('boom', { status: 500, statusText: 'Server Error' });
      TestBed.flushEffects();

      expect(themeAttr()).toBe('light');
      // No PUT — httpMock.verify() in afterEach enforces it.
    });

    it('load() applies the server theme, setTheme()’s internal fetch does not', () => {
      const service = make();

      service.load(USER.id).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/users/preferences/${USER.id}`)
        .flush({ userId: USER.id, theme: 1, receiveNotifications: true });
      TestBed.flushEffects();
      expect(service.theme()).toBe('Light');

      // Server still says Light; the user picks Dark. The in-flight fetch must
      // not drag the choice back to Light.
      service.setTheme('Dark').subscribe();
      httpMock.expectOne(`${environment.apiUrl}/users/preferences`).flush(null);
      TestBed.flushEffects();

      expect(service.theme()).toBe('Dark');
      expect(themeAttr()).toBe('dark');
    });
  });

  describe('System follows the OS', () => {
    it('repaints when the OS theme flips', () => {
      const service = make();
      TestBed.flushEffects();
      expect(service.theme()).toBe('System');
      expect(themeAttr()).toBe('dark');

      systemLight = true;
      fireSystemChange(true);

      expect(themeAttr()).toBe('light');
    });

    it('ignores the OS flip once the choice is explicit', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'Dark');
      make();
      TestBed.flushEffects();
      expect(themeAttr()).toBe('dark');

      systemLight = true;
      fireSystemChange(true);

      expect(themeAttr()).toBe('dark');
    });
  });

  describe('toggleTheme', () => {
    it('converts a System preference into the explicit opposite of what is rendered', () => {
      const service = make();
      TestBed.flushEffects();
      expect(themeAttr()).toBe('dark');

      service.toggleTheme();
      TestBed.flushEffects();

      expect(service.theme()).toBe('Light');
      expect(themeAttr()).toBe('light');
    });
  });
});
