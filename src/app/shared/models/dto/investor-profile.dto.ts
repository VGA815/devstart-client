import { InvestorProfile, InvestorProfileType } from '../investor-profile.model';

const TYPE_MAP: Record<number, InvestorProfileType> = {
  0: 'Individual',
  1: 'Fund',
};


export interface InvestorProfileDto {
  id: string;
  userId: string;
  type: number;
  displayName: string;
  bio: string | null;
  website: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvestorProfileRequestDto {
  type: number;          // 0=Individual, 1=Fund
  display_name: string;
  bio?: string;
  website?: string;
  is_public: boolean;
}

export interface UpdateInvestorProfileRequestDto {
  type: number;
  display_name: string;
  bio?: string;
  website?: string;
  is_public: boolean;
}

export function mapInvestorProfileDto(dto: InvestorProfileDto): InvestorProfile {
  return {
    id: dto.id,
    userId: dto.userId,
    type: TYPE_MAP[dto.type] ?? 'Individual',
    displayName: dto.displayName,
    bio: dto.bio,
    website: dto.website,
    isPublic: dto.isPublic,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
