import { StartupCompetitor } from '../startup-competitor.model';


export interface StartupCompetitorDto {
  id: string;
  startupId: string;
  name: string;
  website: string | null;
  description: string | null;
  strengthsVsUs: string | null;
  weaknessesVsUs: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStartupCompetitorRequestDto {
  startup_id: string;
  name: string;
  // Обязателен: бэк отклоняет пустой сайт и выводит из него ключ дедупликации домена.
  website: string;
  description?: string;
  strengths_vs_us?: string;
  weaknesses_vs_us?: string;
}

export interface UpdateStartupCompetitorRequestDto {
  name: string;
  // Обязателен и на update — легаси-карточка без сайта получает его при первой же правке.
  website: string;
  description?: string;
  strengths_vs_us?: string;
  weaknesses_vs_us?: string;
}

export function mapStartupCompetitorDto(dto: StartupCompetitorDto): StartupCompetitor {
  return {
    id: dto.id,
    startupId: dto.startupId,
    name: dto.name,
    website: dto.website ?? null,
    description: dto.description ?? null,
    strengthsVsUs: dto.strengthsVsUs ?? null,
    weaknessesVsUs: dto.weaknessesVsUs ?? null,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
