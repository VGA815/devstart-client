import { ThemePreference } from '../../shared/models/user-preference.model';

// Контракт хранения темы. ЗЕРКАЛИТСЯ инлайн-скриптом в src/index.html —
// он ставит data-theme до первой отрисовки, иначе Light-пользователь видит
// вспышку тёмной темы. Правьте оба места вместе; расхождение ловит
// theme-bootstrap.spec.ts.
export const THEME_STORAGE_KEY = 'devstart_theme';

// Совпадает с дефолтом бэкенда: UserPreference.Create(..., UserPreferenceTheme.System)
// в RegisterUserCommandHandler и CompleteOAuthRegistrationCommandHandler.
export const DEFAULT_THEME: ThemePreference = 'System';

export function normalizeTheme(raw: string | null): ThemePreference {
  return raw === 'Dark' || raw === 'Light' || raw === 'System' ? raw : DEFAULT_THEME;
}

export function resolveTheme(pref: ThemePreference, systemPrefersLight: boolean): 'dark' | 'light' {
  if (pref === 'System') return systemPrefersLight ? 'light' : 'dark';
  return pref === 'Light' ? 'light' : 'dark';
}
