import { Profile } from '../profile.model';


export interface ProfileDto {
  userId: string;
  name: string | null;
  bio: string | null;
  url: string | null;
  socialMediaLinks: string[];
  isPublic: boolean;
  isAvailableForHire: boolean;
  avatarId: string | null;
}

export interface CreateProfileRequestDto {
  user_id: string;
  name?: string;
  bio?: string;
  is_available_for_hire: boolean;
  avatar_id?: string;
  url?: string;
  is_public: boolean;
  social_media_links: string[];
}

export interface UpdateProfileRequestDto extends CreateProfileRequestDto {}

export function mapProfileDto(dto: ProfileDto): Profile {
  return {
    userId: dto.userId,
    name: dto.name,
    bio: dto.bio,
    url: dto.url,
    socialMediaLinks: dto.socialMediaLinks ?? [],
    isPublic: dto.isPublic,
    isAvailableForHire: dto.isAvailableForHire,
    avatarId: dto.avatarId,
  };
}
