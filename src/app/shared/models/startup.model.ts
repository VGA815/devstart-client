export type StartupStage = 'Idea' | 'PreSeed' | 'Mvp' | 'Seed' | 'SeriesA';
export type StartupLocation = 'Russia' | 'USA' | 'China' | 'India' | 'Other';
export type StartupRole = 'Founder' | 'Administration' | 'Member';

/** Maps to DevStart.Domain.StartupMembers.StartupPosition enum */
export type StartupPosition = 'Other' | 'CEO' | 'CTO' | 'CMO' | 'COO' | 'CFO' | 'CPO';

import { CommunityStandardsLevel } from './community-standards.model';

export interface Startup {
  id: string;
  name: string;
  publicEmail: string;
  shortDescription: string | null;
  description: string | null;
  url: string | null;
  isStopped: boolean;
  stage: StartupStage;
  socialMediaLinks: string[];
  location: StartupLocation | null;
  billingEmail: string | null;
  avatarId: string | null;
  tam: number | null;
  sam: number | null;
  som: number | null;
  hasPatents: boolean;
  marketGrowthRate: number | null;
  /**
   * Доля выполненного чек-листа сообщества, 0–100. Приходит из проекции и может немного
   * отставать от живого расчёта на `api/startups/{id}/community`.
   */
  communityStandardsPercent: number;
  communityStandardsLevel: CommunityStandardsLevel;
  createdAt: string;
  updatedAt: string;
}

export interface StartupMember {
  profileId: string;
  startupId: string;
  role: StartupRole;
  isPublic: boolean;
  position: StartupPosition | null;
  bio: string | null;
  yearsOfExperience: number | null;
  hasPriorExit: boolean | null;
  previousStartupsCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface StartupFilters {
  page?: number;
  pageSize?: number;
  stage?: StartupStage;
  location?: StartupLocation;
  isStopped?: boolean;
  /** Отбирает стартапы с уровнем стандартов сообщества не ниже указанного. */
  minCommunityStandards?: CommunityStandardsLevel;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
