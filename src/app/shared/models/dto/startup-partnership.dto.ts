import { PartnershipKind, StartupPartnership } from '../startup-partnership.model';

export interface StartupPartnershipDto {
  id: string;
  startupId: string;
  partnerName: string;
  website: string;
  kind: number;
  description: string | null;
  isWorkedOut: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStartupPartnershipRequestDto {
  startup_id: string;
  partner_name: string;
  /** Обязателен: бэк отклоняет пустой сайт и выводит из него ключ дедупликации домена. */
  website: string;
  kind: number;
  description?: string;
}

export interface UpdateStartupPartnershipRequestDto {
  partner_name: string;
  website: string;
  kind: number;
  description?: string;
}

export function mapStartupPartnershipDto(dto: StartupPartnershipDto): StartupPartnership {
  return {
    id: dto.id,
    startupId: dto.startupId,
    partnerName: dto.partnerName,
    website: dto.website,
    kind: dto.kind as PartnershipKind,
    description: dto.description ?? null,
    isWorkedOut: dto.isWorkedOut ?? false,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
