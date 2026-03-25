export type ExpertSpecialization =
  | 'Marketing'
  | 'Product'
  | 'Engineering'
  | 'Finance'
  | 'Legal'
  | 'Operations'
  | 'Sales'
  | 'HumanResources'
  | 'Design';

export type ExpertSortBy = 'DisplayName' | 'CreatedAt';

export interface ExpertProfile {
  id: string;          // == userId
  userId: string;
  displayName: string;
  bio: string | null;
  website: string | null;
  isPublic: boolean;
  linkedInUrl: string | null;
  twitterUrl: string | null;
  gitHubUrl: string | null;
  telegramUrl: string | null;
  specializations: ExpertSpecialization[];
  experiencesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExpertCatalogFilters {
  page?: number;
  pageSize?: number;
  specialization?: ExpertSpecialization;
  sortBy?: ExpertSortBy;
}
