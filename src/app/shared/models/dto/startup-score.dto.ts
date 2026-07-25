import { ScoreFactor, StartupScore, SuggestedTerms } from '../startup-score.model';

export interface ScoreFactorDto {
  factor: string;
  score: number | null;
  weight: number;
  source: number;
  notes: string[] | null;
}

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

function mapScoreFactorDto(dto: ScoreFactorDto): ScoreFactor {
  return {
    factor: dto.factor,
    score: dto.score ?? null,
    weight: dto.weight,
    source: dto.source,
    notes: dto.notes ?? [],
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
