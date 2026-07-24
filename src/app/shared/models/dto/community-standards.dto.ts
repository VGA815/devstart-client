import {
  CommunityDocument, CommunityDocumentSummary, CommunityDocumentTemplate, CommunityDocumentType,
  CommunityStandards, CommunityStandardsCheck, CommunityStandardsLevel,
} from '../community-standards.model';

const DOC_TYPE_MAP: Record<number, CommunityDocumentType> = {
  0: 'CodeOfConduct', 1: 'Contributing', 2: 'Support', 3: 'SecurityPolicy', 4: 'Legal',
};

/** Тип документа — часть URL, поэтому нужен обратный маппинг в число. */
export const COMMUNITY_DOC_TYPE_NUM: Record<CommunityDocumentType, number> = {
  CodeOfConduct: 0, Contributing: 1, Support: 2, SecurityPolicy: 3, Legal: 4,
};

const LEVEL_MAP: Record<number, CommunityStandardsLevel> = {
  0: 'Incomplete', 1: 'Developing', 2: 'Complete',
};

/** Порядок уровней для фильтра «не ниже чем» в каталоге. */
export const COMMUNITY_LEVEL_ORDER: Record<CommunityStandardsLevel, number> = {
  Incomplete: 0, Developing: 1, Complete: 2,
};

export interface CommunityStandardsCheckDto {
  key: string;
  isSatisfied: boolean;
  isDocument: boolean;
  documentType: number | null;
  documentId: string | null;
}

export interface CommunityStandardsDto {
  completedCount: number;
  totalCount: number;
  percent: number;
  level: number;
  checks: CommunityStandardsCheckDto[] | null;
  evaluatedAt: string;
}

export interface CommunityDocumentSummaryDto {
  id: string;
  type: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityDocumentDto {
  id: string;
  startupId: string;
  type: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityDocumentTemplateDto {
  type: number;
  title: string;
  content: string;
}

/** Тело PUT api/startups/{id}/community/documents/{type} — бэк ждёт ровно эти два поля. */
export interface UpsertCommunityDocumentRequestDto {
  title: string;
  content: string;
}

function mapCheckDto(dto: CommunityStandardsCheckDto): CommunityStandardsCheck {
  return {
    key: dto.key,
    isSatisfied: dto.isSatisfied,
    isDocument: dto.isDocument,
    documentType: dto.documentType != null ? DOC_TYPE_MAP[dto.documentType] ?? null : null,
    documentId: dto.documentId ?? null,
  };
}

export function mapCommunityStandardsDto(dto: CommunityStandardsDto): CommunityStandards {
  return {
    completedCount: dto.completedCount,
    totalCount: dto.totalCount,
    percent: dto.percent,
    level: LEVEL_MAP[dto.level] ?? 'Incomplete',
    checks: (dto.checks ?? []).map(mapCheckDto),
    evaluatedAt: dto.evaluatedAt,
  };
}

export function mapCommunityDocumentSummaryDto(dto: CommunityDocumentSummaryDto): CommunityDocumentSummary {
  return {
    id: dto.id,
    type: DOC_TYPE_MAP[dto.type] ?? 'Legal',
    title: dto.title,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function mapCommunityDocumentDto(dto: CommunityDocumentDto): CommunityDocument {
  return {
    id: dto.id,
    startupId: dto.startupId,
    type: DOC_TYPE_MAP[dto.type] ?? 'Legal',
    title: dto.title,
    content: dto.content,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function mapCommunityDocumentTemplateDto(dto: CommunityDocumentTemplateDto): CommunityDocumentTemplate {
  return {
    type: DOC_TYPE_MAP[dto.type] ?? 'Legal',
    title: dto.title,
    content: dto.content,
  };
}

/** Уровень стартапа в списке каталога — приходит числом в `StartupResponse`. */
export function mapCommunityStandardsLevel(value: number | null | undefined): CommunityStandardsLevel {
  return value != null ? LEVEL_MAP[value] ?? 'Incomplete' : 'Incomplete';
}
