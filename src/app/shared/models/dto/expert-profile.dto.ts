import { ExpertProfile, ExpertSpecialization } from '../expert-profile.model';

const SPEC_MAP: Record<number, ExpertSpecialization> = {
  0: 'Marketing',
  1: 'Product',
  2: 'Engineering',
  3: 'Finance',
  4: 'Legal',
  5: 'Operations',
  6: 'Sales',
  7: 'HumanResources',
  8: 'Design',
};

export const SPEC_NUM: Record<ExpertSpecialization, number> = {
  Marketing:      0,
  Product:        1,
  Engineering:    2,
  Finance:        3,
  Legal:          4,
  Operations:     5,
  Sales:          6,
  HumanResources: 7,
  Design:         8,
};


export interface ExpertProfileDto {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  website: string | null;
  isPublic: boolean;
  linkedInUrl: string | null;
  twitterUrl: string | null;
  gitHubUrl: string | null;
  telegramUrl: string | null;
  specializations: number[];
  experiencesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpertProfileRequestDto {
  display_name:     string;
  bio?:             string;
  website?:         string;
  is_public:        boolean;
  linkedin_url?:    string;
  twitter_url?:     string;
  github_url?:      string;
  telegram_url?:    string;
  specializations:  number[];
}

export interface UpdateExpertProfileRequestDto {
  display_name:     string;
  bio?:             string;
  website?:         string;
  is_public:        boolean;
  linkedin_url?:    string;
  twitter_url?:     string;
  github_url?:      string;
  telegram_url?:    string;
  specializations:  number[];
}

export function mapExpertProfileDto(dto: ExpertProfileDto): ExpertProfile {
  return {
    id:               dto.id,
    userId:           dto.userId,
    displayName:      dto.displayName,
    bio:              dto.bio,
    website:          dto.website,
    isPublic:         dto.isPublic,
    linkedInUrl:      dto.linkedInUrl,
    twitterUrl:       dto.twitterUrl,
    gitHubUrl:        dto.gitHubUrl,
    telegramUrl:      dto.telegramUrl,
    specializations:  (dto.specializations ?? []).map(n => SPEC_MAP[n]).filter((s): s is ExpertSpecialization => !!s),
    experiencesCount: dto.experiencesCount ?? 0,
    createdAt:        dto.createdAt,
    updatedAt:        dto.updatedAt,
  };
}
