import {
  ScoreFactor, ScoreFactorDetail, ScoreHint, ScoreInput, ScoreValue, StartupScore, SuggestedTerms,
} from '../startup-score.model';

export interface ScoreValueDto {
  kind: number | null;
  number: number | null;
  code: string | null;
}

export interface ScoreComponentDto {
  code: string;
  points: number;
}

export interface ScoreInputDto {
  code: string;
  value: ScoreValueDto | null;
}

export interface ScoreHintDto {
  code: string;
  points: number;
  targets: ScoreValueDto[] | null;
  enablesFactor: boolean | null;
}

export interface ScoreFactorDetailDto {
  components: ScoreComponentDto[] | null;
  inputs: ScoreInputDto[] | null;
  hints: ScoreHintDto[] | null;
}

export interface ScoreFactorDto {
  factor: string;
  score: number | null;
  weight: number;
  source: number;
  detail: ScoreFactorDetailDto | null;
}

export const EMPTY_SCORE_DETAIL: ScoreFactorDetail = { components: [], inputs: [], hints: [] };

export interface StartupScoreDto {
  totalScore: number | null;
  teamScore: number;
  marketScore: number;
  productScore: number;
  tractionScore: number;
  competitionScore: number | null;
  valuationLow: number;
  valuationHigh: number;
  methodsUsed: string[];
  calculatedAt: string;
  factors: ScoreFactorDto[] | null;
}


export interface SuggestedTermsDto {
  instrument: number;
  suggestedValuationCap: number | null;
  suggestedDiscount: number | null;
  suggestedInterestRate: number | null;
  suggestedTermMonths: number | null;
  suggestedPreMoneyValuation: number | null;
  suggestedLiquidationPreference: number | null;
  proRataRights: boolean;
}

function mapScoreValueDto(dto: ScoreValueDto | null): ScoreValue {
  return {
    kind:   dto?.kind ?? 0,   // 0 = «нет данных» — безопасный дефолт для незнакомого ответа
    number: dto?.number ?? null,
    code:   dto?.code ?? null,
  };
}

function mapScoreInputDto(dto: ScoreInputDto): ScoreInput {
  return { code: dto.code, value: mapScoreValueDto(dto.value) };
}

function mapScoreHintDto(dto: ScoreHintDto): ScoreHint {
  return {
    code: dto.code,
    points: dto.points,
    targets: (dto.targets ?? []).map(mapScoreValueDto),
    enablesFactor: dto.enablesFactor ?? false,
  };
}

/**
 * Отсутствующая детализация — не ошибка: ответ мог быть посчитан до появления поля и лежать в
 * часовом кэше бэка. Нормализуем в пустую, вкладка тогда просто не показывает раскрытие.
 */
function mapScoreFactorDetailDto(dto: ScoreFactorDetailDto | null): ScoreFactorDetail {
  if (!dto) return EMPTY_SCORE_DETAIL;
  return {
    components: (dto.components ?? []).map(c => ({ code: c.code, points: c.points })),
    inputs:     (dto.inputs ?? []).map(mapScoreInputDto),
    hints:      (dto.hints ?? []).map(mapScoreHintDto),
  };
}

function mapScoreFactorDto(dto: ScoreFactorDto): ScoreFactor {
  return {
    factor: dto.factor,
    score: dto.score ?? null,
    weight: dto.weight,
    source: dto.source,
    detail: mapScoreFactorDetailDto(dto.detail),
  };
}

export function mapStartupScoreDto(dto: StartupScoreDto): StartupScore {
  return {
    totalScore: dto.totalScore ?? null,
    teamScore: dto.teamScore,
    marketScore: dto.marketScore,
    productScore: dto.productScore,
    tractionScore: dto.tractionScore,
    competitionScore: dto.competitionScore ?? null,
    valuationLow: dto.valuationLow,
    valuationHigh: dto.valuationHigh,
    methodsUsed: dto.methodsUsed ?? [],
    calculatedAt: dto.calculatedAt,
    factors: (dto.factors ?? []).map(mapScoreFactorDto),
  };
}

export function mapSuggestedTermsDto(dto: SuggestedTermsDto): SuggestedTerms {
  return {
    instrument:           dto.instrument,
    valuationCap:         dto.suggestedValuationCap,
    discount:             dto.suggestedDiscount,
    interestRate:         dto.suggestedInterestRate,
    termMonths:           dto.suggestedTermMonths,
    preMoneyValuation:    dto.suggestedPreMoneyValuation,
    liquidationPreference: dto.suggestedLiquidationPreference,
    proRataRights:        dto.proRataRights,
  };
}
