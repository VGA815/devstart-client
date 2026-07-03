import { ThemePreference, UserPreference } from '../user-preference.model';

// UserPreferenceTheme on the backend: 0 = Dark, 1 = Light, 2 = System.
const THEME_MAP: Record<number, ThemePreference> = {
  0: 'Dark',
  1: 'Light',
  2: 'System',
};

const THEME_NUM: Record<ThemePreference, number> = {
  Dark: 0,
  Light: 1,
  System: 2,
};

// GET api/users/preferences/{userId} — the path parameter is the user id
// (own-account gated; someone else's id yields 404).
export interface UserPreferenceDto {
  userId: string;
  theme: number;
  receiveNotifications: boolean;
}

// PUT api/users/preferences — request body is snake_case.
export interface UpdateUserPreferenceRequestDto {
  user_id: string;
  theme: number;
  receive_notifications: boolean;
}

export function mapUserPreferenceDto(dto: UserPreferenceDto): UserPreference {
  return {
    userId: dto.userId,
    theme: THEME_MAP[dto.theme] ?? 'Dark',
    receiveNotifications: dto.receiveNotifications,
  };
}

export function themeToNumber(theme: ThemePreference): number {
  return THEME_NUM[theme];
}
