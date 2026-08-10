export type InvestorProfileType = 'Individual' | 'Fund';
export type InvestorSortBy = 'DisplayName' | 'CreatedAt';

export interface InvestorProfile {
  id: string;         // == userId
  userId: string;
  type: InvestorProfileType;
  displayName: string;
  bio: string | null;
  website: string | null;
  isPublic: boolean;
  /** Что показывать: логотип фонда либо аватарка аккаунта у физлица. */
  avatarId: string | null;
  /**
   * Собственный логотип фонда без подстановки личной аватарки — только для формы редактирования.
   * Приходит лишь из GET по id; в каталоге его нет.
   */
  fundAvatarId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvestorCatalogFilters {
  page?: number;
  pageSize?: number;
  type?: InvestorProfileType;
  sortBy?: InvestorSortBy;
}
