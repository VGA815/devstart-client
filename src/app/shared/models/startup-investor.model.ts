export interface StartupInvestor {
  startupId: string;
  profileId: string;
  isPublic: boolean;
  /** Логотип фонда либо аватарка аккаунта у физлица — считается на бэкенде. */
  avatarId: string | null;
  isFund: boolean;
  createdAt: string;
  updatedAt: string;
}
