export interface StartupScore {
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

export interface SuggestedTerms {
  instrument: number; // 0=Safe, 1=ConvertibleLoan, 2=PricedRound
  valuationCap: number | null;
  discount: number | null;
  interestRate: number | null;
  termMonths: number | null;
  preMoneyValuation: number | null;
  liquidationPreference: number | null;
  proRataRights: boolean;
}
