import { StartupScore, SuggestedTerms } from '../startup-score.model';

export interface StartupScoreDto {
  totalScore: number;
  teamScore: number;
  marketScore: number;
  productScore: number;
  tractionScore: number;
  competitionScore: number;
  valuationLow: number;
  valuationHigh: number;
  methodsUsed: string[];
  calculatedAt: string;
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

export function mapStartupScoreDto(dto: StartupScoreDto): StartupScore {
  return {
    totalScore: dto.totalScore,
    teamScore: dto.teamScore,
    marketScore: dto.marketScore,
    productScore: dto.productScore,
    tractionScore: dto.tractionScore,
    competitionScore: dto.competitionScore,
    valuationLow: dto.valuationLow,
    valuationHigh: dto.valuationHigh,
    methodsUsed: dto.methodsUsed ?? [],
    calculatedAt: dto.calculatedAt,
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
