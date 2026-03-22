import { User } from '../user.model';
import { ConsentItemDto } from './consent.dto';


export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RegisterRequestDto {
  email: string;
  username: string;
  password: string;
  name?: string;
  bio?: string;
  url?: string;
  social_media_links: string[];
  is_public: boolean;
  consents: ConsentItemDto[];
}


export interface UserDto {
  id: string;
  email: string;
  username: string;
  isVerified: boolean;
}


export function mapUserDto(dto: UserDto): User {
  return {
    id: dto.id,
    email: dto.email,
    username: dto.username,
    isVerified: dto.isVerified,
  };
}
