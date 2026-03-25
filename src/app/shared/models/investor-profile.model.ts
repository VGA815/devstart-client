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
  createdAt: string;
  updatedAt: string;
}

export interface InvestorCatalogFilters {
  page?: number;
  pageSize?: number;
  type?: InvestorProfileType;
  sortBy?: InvestorSortBy;
}
