import { ExpertExperience } from '../expert-experience.model';


export interface ExpertExperienceDto {
  id: string;
  expertProfileId: string;
  company: string;
  position: string;
  startDate: string;          // ISO date
  endDate: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpertExperienceRequestDto {
  expert_profile_id: string;
  company:           string;
  position:          string;
  start_date:        string;      // YYYY-MM-DD
  end_date?:         string;      // YYYY-MM-DD or omitted = present
  description?:      string;
}

export interface UpdateExpertExperienceRequestDto {
  id:           string;
  company:      string;
  position:     string;
  start_date:   string;
  end_date?:    string;
  description?: string;
}

export function mapExpertExperienceDto(dto: ExpertExperienceDto): ExpertExperience {
  return {
    id:              dto.id,
    expertProfileId: dto.expertProfileId,
    company:         dto.company,
    position:        dto.position,
    startDate:       dto.startDate,
    endDate:         dto.endDate,
    description:     dto.description,
    createdAt:       dto.createdAt,
    updatedAt:       dto.updatedAt,
  };
}
