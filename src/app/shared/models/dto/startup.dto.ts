import { Startup, StartupMember, StartupStage, StartupLocation, StartupRole, StartupPosition } from '../startup.model';

// Stage/Location/Role/Position numeric values from API
const STAGE_MAP: Record<number, StartupStage> = {
  0: 'Idea', 1: 'PreSeed', 2: 'Mvp', 3: 'Seed', 4: 'SeriesA',
};
const LOCATION_MAP: Record<number, StartupLocation> = {
  0: 'Russia', 1: 'USA', 2: 'China', 3: 'India', 4: 'Other',
};
const ROLE_MAP: Record<number, StartupRole> = {
  0: 'Founder', 1: 'Administration', 2: 'Member',
};
const POSITION_MAP: Record<number, StartupPosition> = {
  0: 'Other', 1: 'CEO', 2: 'CTO', 3: 'CMO', 4: 'COO', 5: 'CFO', 6: 'CPO',
};

export const POSITION_NUM: Record<StartupPosition, number> = {
  Other: 0, CEO: 1, CTO: 2, CMO: 3, COO: 4, CFO: 5, CPO: 6,
};


export interface StartupDto {
  id: string;
  name: string;
  publicEmail: string;
  shortDescription: string | null;
  description: string | null;
  url: string | null;
  isStopped: boolean;
  stage: number;
  socialMediaLinks: string[] | null;
  location: number | null;
  billingEmail: string | null;
  avatarUrl?: string | null;
  avatarId?: string | null;
  tam?: number | null;
  sam?: number | null;
  som?: number | null;
  hasPatents?: boolean;
  marketGrowthRate?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface StartupMemberDto {
  profileId: string;
  startupId: string;
  role: number;
  isPublic: boolean;
  position?: number | null;
  bio?: string | null;
  yearsOfExperience?: number | null;
  hasPriorExit?: boolean | null;
  previousStartupsCount?: number | null;
  createdAt: string;
  updatedAt: string;
}


export interface UpdateStartupRequestDto {
  startup_id: string;
  name: string;
  public_email: string;
  short_description: string;
  description: string;
  url: string;
  is_stopped: boolean;
  stage: number;
  social_media_links: string[];
  location: number;
  billing_email: string;
  avatar_url?: string;
  tam?: number;
  sam?: number;
  som?: number;
  has_patents?: boolean;
  market_growth_rate?: number;
}

export interface CreateStartupRequestDto {
  user_id: string;
  name: string;
  public_email: string;
  short_description: string;
  description: string;
  url: string;
  is_stopped: boolean;
  stage: number;
  social_media_links: string[];
  location: number;
  billing_email: string;
  avatar_id?: string;
  product_name: string;
  product_problem_solution: string;
  stack: string[];
  product_value_proposition: string;
  product_differentiators: string;
}

export interface UpdateStartupMemberProfileRequestDto {
  startup_id: string;
  position?: number;
  bio?: string;
  years_of_experience?: number;
  has_prior_exit?: boolean;
  previous_startups_count?: number;
}


export function mapStartupDto(dto: StartupDto): Startup {
  return {
    id: dto.id,
    name: dto.name,
    publicEmail: dto.publicEmail,
    shortDescription: dto.shortDescription ?? null,
    description: dto.description,
    url: dto.url,
    isStopped: dto.isStopped,
    stage: STAGE_MAP[dto.stage] ?? 'Idea',
    socialMediaLinks: dto.socialMediaLinks ?? [],
    location: dto.location != null ? LOCATION_MAP[dto.location] ?? null : null,
    billingEmail: dto.billingEmail,
    avatarId: dto.avatarId ?? dto.avatarUrl ?? null,
    tam: dto.tam ?? null,
    sam: dto.sam ?? null,
    som: dto.som ?? null,
    hasPatents: dto.hasPatents ?? false,
    marketGrowthRate: dto.marketGrowthRate ?? null,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function mapStartupMemberDto(dto: StartupMemberDto): StartupMember {
  return {
    profileId: dto.profileId,
    startupId: dto.startupId,
    role: ROLE_MAP[dto.role] ?? 'Member',
    isPublic: dto.isPublic,
    position: dto.position != null ? POSITION_MAP[dto.position] ?? null : null,
    bio: dto.bio ?? null,
    yearsOfExperience: dto.yearsOfExperience ?? null,
    hasPriorExit: dto.hasPriorExit ?? null,
    previousStartupsCount: dto.previousStartupsCount ?? null,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
