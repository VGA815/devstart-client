export type UserRole = 'User' | 'Admin';

export interface User {
  id: string;
  email: string;
  username: string;
  isVerified: boolean;
  role: UserRole;
  twoFactorEnabled: boolean;
}
