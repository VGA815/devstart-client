// Флаги источника фактора: 0 нет данных, 1 самодекларация, 2 данные платформы, 4 внешний бенчмарк.
// Фактор может опираться на несколько сразу (напр. Competition = 1 | 4).
export type ScoreFactorSource = number;

/**
 * Как читать сырое значение: 0 нет данных, 1 сумма в ₽, 2 проценты, 3 количество,
 * 4 булев флаг (0/1), 5 код значения (в `code`), 6 балл по шкале 0..100.
 * Бэк не форматирует — единицы и локаль на фронте (`formatScoreValue`).
 */
export type ScoreValueKind = number;

export interface ScoreValue {
  kind: ScoreValueKind;
  number: number | null;
  code: string | null;        // заполнен только при kind = 5
}

/** Слагаемое балла. Сумма компонентов фактора равна его баллу — включая отрицательный `<factor>.clamp`. */
export interface ScoreComponent {
  code: string;
  points: number;
}

/** Сырое значение, которое прочитала формула. Приходит и тогда, когда значения нет (kind = 0). */
export interface ScoreInput {
  code: string;
  value: ScoreValue;
}

/**
 * Невыполненное условие и сколько оно даёт — при прочих равных. Подсказки измеряются независимо
 * и НЕ суммируются между собой. `points` — прирост в баллах фактора; при `enablesFactor` фактор
 * сейчас не участвует вовсе, и это балл, который он бы получил, а не дельта.
 */
export interface ScoreHint {
  code: string;
  points: number;
  targets: ScoreValue[];
  enablesFactor: boolean;
}

export interface ScoreFactorDetail {
  components: ScoreComponent[];
  inputs: ScoreInput[];
  hints: ScoreHint[];
}

export interface ScoreFactor {
  factor: string;             // Team | Market | Product | Traction | Competition
  score: number | null;       // null — фактор без данных, в шкале не участвует
  weight: number;             // ренормированный вес участвующих факторов (0 у выпавшего)
  source: ScoreFactorSource;
  detail: ScoreFactorDetail;
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
