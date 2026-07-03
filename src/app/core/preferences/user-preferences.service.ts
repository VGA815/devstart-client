import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ThemePreference, UserPreference } from '../../shared/models/user-preference.model';
import {
  UserPreferenceDto,
  mapUserPreferenceDto,
  themeToNumber,
} from '../../shared/models/dto/user-preference.dto';

const THEME_KEY = 'devstart_theme';

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/users/preferences`;

  private readonly _theme = signal<ThemePreference>(readStoredTheme());
  readonly theme = this._theme.asReadonly();

  get(userId: string): Observable<UserPreference> {
    return this.http.get<UserPreferenceDto>(`${this.base}/${userId}`).pipe(
      map(mapUserPreferenceDto),
      tap(pref => this.applyTheme(pref.theme)),
    );
  }

  update(userId: string, theme: ThemePreference, receiveNotifications: boolean): Observable<void> {
    return this.http.put<void>(this.base, {
      user_id: userId,
      theme: themeToNumber(theme),
      receive_notifications: receiveNotifications,
    }).pipe(
      tap(() => this.applyTheme(theme)),
    );
  }

  // The client is currently styled in a single dark palette; the attribute is the hook
  // a future light palette binds to, and the stored value survives reloads.
  applyTheme(theme: ThemePreference): void {
    this._theme.set(theme);
    localStorage.setItem(THEME_KEY, theme);
    const effective = theme === 'System'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : theme.toLowerCase();
    document.documentElement.setAttribute('data-theme', effective);
  }

  applyStoredTheme(): void {
    this.applyTheme(this._theme());
  }
}

function readStoredTheme(): ThemePreference {
  const raw = localStorage.getItem(THEME_KEY);
  return raw === 'Light' || raw === 'System' ? raw : 'Dark';
}
