// Флаги источника фактора: 0 нет данных, 1 самодекларация, 2 данные платформы, 4 внешний бенчмарк.
// Фактор может опираться на несколько сразу (напр. Competition = 1 | 4).
export type ScoreFactorSource = number;

export interface ScoreFactor {
  factor: string;             // Team | Market | Product | Traction | Competition
  score: number | null;       // null — фактор без данных, в шкале не участвует
  weight: number;             // ренормированный вес участвующих факторов (0 у выпавшего)
  source: ScoreFactorSource;
  notes: string[];
}

export interface StartupScore {
  // null — недостаточно данных (ни один фактор не участвовал), а не 0.
  totalScore: number | null;
  teamScore: number;
  marketScore: number;
  productScore: number;
  tractionScore: number;
  // null, когда фактор конкуренции выпал (нет карточек и нет бенчмарка сектора).
  competitionScore: number | null;
  valuationLow: number;
  valuationHigh: number;
  methodsUsed: string[];
  calculatedAt: string;
  factors: ScoreFactor[];
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
