import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { ThemePreference, UserPreference } from '../../shared/models/user-preference.model';
import {
  UserPreferenceDto,
  mapUserPreferenceDto,
  themeToNumber,
} from '../../shared/models/dto/user-preference.dto';
import { THEME_STORAGE_KEY, normalizeTheme, resolveTheme } from './theme.constants';

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${environment.apiUrl}/users/preferences`;

  private readonly _theme = signal<ThemePreference>(normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY)));
  readonly theme = this._theme.asReadonly();

  private readonly mq = window.matchMedia('(prefers-color-scheme: light)');
  private readonly _systemLight = signal(this.mq.matches);

  /** Тема, которая реально отрисована: 'System' разрешён по настройке ОС. */
  readonly effective = computed<'dark' | 'light'>(() => resolveTheme(this._theme(), this._systemLight()));

  // Флаг уведомлений — серверное поле, но PUT требует его вместе с темой.
  // Держим здесь (а не в settings.component), чтобы переключатель в шапке
  // не отправлял угаданное значение и молча не включал уведомления обратно.
  private readonly _notify    = signal<boolean | null>(null);
  private readonly _notifyFor = signal<string | null>(null);

  readonly receiveNotifications = computed(() => this._notify() ?? true);

  /** Флаг получен с сервера И принадлежит текущему пользователю. Без этого PUT запрещён. */
  readonly prefsLoaded = computed(() => {
    const uid = this.auth.user()?.id ?? null;
    return uid !== null && this._notifyFor() === uid;
  });

  constructor() {
    const onChange = (e: MediaQueryListEvent) => this._systemLight.set(e.matches);
    this.mq.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => this.mq.removeEventListener('change', onChange));

    // Единственное место, пишущее тему в DOM. При явном Dark/Light значение
    // effective() не зависит от _systemLight, поэтому смена темы ОС его не трогает.
    effect(() => {
      const eff = this.effective();
      document.documentElement.setAttribute('data-theme', eff);
      document.documentElement.style.colorScheme = eff;
    });
  }

  /** Локально: сигнал + localStorage. В DOM пишет effect() выше. */
  applyTheme(theme: ThemePreference): void {
    this._theme.set(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  applyStoredTheme(): void {
    this.applyTheme(this._theme());
  }

  /** Первичная загрузка: сервер — источник правды для обоих полей. */
  load(userId: string): Observable<UserPreference> {
    return this.fetch(userId).pipe(
      tap(pref => {
        this._notify.set(pref.receiveNotifications);
        this._notifyFor.set(userId);
        this.applyTheme(pref.theme);
      }),
    );
  }

  /** Переключатель в шапке: всегда пишет явное значение, никогда 'System'. */
  toggleTheme(): void {
    this.setTheme(this.effective() === 'light' ? 'Dark' : 'Light').subscribe({ error: () => { /* тема уже применена локально */ } });
  }

  setTheme(theme: ThemePreference): Observable<void> {
    if (this._theme() === theme) return of(void 0);

    // Оптимистично: мгновенная перекраска, выбор переживает перезагрузку
    // даже если сохранение на сервер не удастся.
    this.applyTheme(theme);

    const user = this.auth.user();
    if (!user) return of(void 0);   // аноним — только localStorage

    const flag$ = this.prefsLoaded()
      ? of(this._notify()!)
      : this.fetch(user.id).pipe(
          tap(pref => {
            this._notify.set(pref.receiveNotifications);
            this._notifyFor.set(user.id);
          }),
          map(pref => pref.receiveNotifications),
        );

    return flag$.pipe(
      switchMap(flag => this.put(user.id, theme, flag)),
      // GET не удался ⇒ флаг уведомлений неизвестен ⇒ PUT НЕ отправляем,
      // иначе перезапишем чужое значение угаданным. Тема остаётся локальной
      // и уедет на сервер при следующем успешном сохранении в настройках.
      catchError(() => of(void 0)),
    );
  }

  setReceiveNotifications(value: boolean): Observable<void> {
    const user = this.auth.user();
    if (!user || !this.prefsLoaded()) return of(void 0);

    const previous = this._notify();
    this._notify.set(value);

    return this.put(user.id, this._theme(), value).pipe(
      catchError(err => {
        this._notify.set(previous);
        return throwError(() => err);
      }),
    );
  }

  /** GET без tap(applyTheme): в setTheme() он затёр бы только что выбранную тему. */
  private fetch(userId: string): Observable<UserPreference> {
    return this.http.get<UserPreferenceDto>(`${this.base}/${userId}`).pipe(map(mapUserPreferenceDto));
  }

  private put(userId: string, theme: ThemePreference, receiveNotifications: boolean): Observable<void> {
    return this.http.put<void>(this.base, {
      user_id: userId,
      theme: themeToNumber(theme),
      receive_notifications: receiveNotifications,
    });
  }
}
