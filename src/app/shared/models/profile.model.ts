export interface Profile {
  userId: string;
  name: string | null;
  bio: string | null;
  url: string | null;
  socialMediaLinks: string[];
  isPublic: boolean;
  isAvailableForHire: boolean;
  avatarId: string | null;
  viewCount: number;
}
