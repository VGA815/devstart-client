export type ThemePreference = 'Dark' | 'Light' | 'System';

export interface UserPreference {
  userId: string;
  theme: ThemePreference;
  receiveNotifications: boolean;
}
