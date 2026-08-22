import {
  IpKind,
  LegalEntityInfo,
  PatentProtectionStatus,
  StartupPatent,
  StartupPatents,
  StartupPatentSuggestions,
} from '../startup-patent.model';
import { DeclaredValueComparison, RegistryLookupState } from '../registry-lookup.model';

export interface StartupPatentDto {
  id: string;
  kind: number;
  number: string;
  numberNormalized: string;
  state: number;
  ownership: number;
  title: string | null;
  holderName: string | null;
  holderInn: string | null;
  registeredOn: string | null;
  protectionStatus: number | null;
  createdAt: string;
}

export interface LegalEntityDto {
  state: number;
  inn: string | null;
  name: string | null;
  isActive: boolean | null;
  statusText: string | null;
  asOf: string | null;
}

export interface StartupPatentsDto {
  startupId: string;
  hasPatentsDeclared: boolean;
  declaredInn: string | null;
  legalEntity: LegalEntityDto | null;
  records: StartupPatentDto[];
}

export interface StartupPatentSuggestionDto {
  kind: number;
  number: string;
  title: string | null;
  holderName: string | null;
  registeredOn: string | null;
  status: number;
}

export interface StartupPatentSuggestionsDto {
  declaredInn: string | null;
  suggestions: StartupPatentSuggestionDto[];
}

/** Тело добавления записи — snake_case, как остальные пользовательские эндпоинты. */
export interface CreateStartupPatentRequestDto {
  startup_id: string;
  kind: number;
  number: string;
}

export function mapStartupPatentDto(dto: StartupPatentDto): StartupPatent {
  return {
    id: dto.id,
    kind: dto.kind as IpKind,
    number: dto.number,
    numberNormalized: dto.numberNormalized,
    state: dto.state as RegistryLookupState,
    ownership: dto.ownership as DeclaredValueComparison,
    title: dto.title ?? null,
    holderName: dto.holderName ?? null,
    holderInn: dto.holderInn ?? null,
    registeredOn: dto.registeredOn ?? null,
    protectionStatus: dto.protectionStatus === null || dto.protectionStatus === undefined
      ? null
      : (dto.protectionStatus as PatentProtectionStatus),
    createdAt: dto.createdAt,
  };
}

export function mapStartupPatentsDto(dto: StartupPatentsDto): StartupPatents {
  return {
    startupId: dto.startupId,
    hasPatentsDeclared: dto.hasPatentsDeclared,
    declaredInn: dto.declaredInn ?? null,
    legalEntity: dto.legalEntity ? (dto.legalEntity as LegalEntityInfo) : null,
    records: (dto.records ?? []).map(mapStartupPatentDto),
  };
}

export function mapStartupPatentSuggestionsDto(dto: StartupPatentSuggestionsDto): StartupPatentSuggestions {
  return {
    declaredInn: dto.declaredInn ?? null,
    suggestions: (dto.suggestions ?? []).map(s => ({
      kind: s.kind as IpKind,
      number: s.number,
      title: s.title ?? null,
      holderName: s.holderName ?? null,
      registeredOn: s.registeredOn ?? null,
      status: s.status as PatentProtectionStatus,
    })),
  };
}
