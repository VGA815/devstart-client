export type InvestmentApplicationStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Withdrawn';
export type InvestmentInstrument = 'Safe' | 'ConvertibleLoan' | 'PricedRound';

export interface ValidationFlag {
  key: string;
  message: string;
  severity: 'Info' | 'Warning' | 'Error';
}

export interface InvestmentApplication {
  id: string;
  investorProfileId: string;
  investorDisplayName: string;
  /** Логотип фонда либо аватарка аккаунта у физлица; null в списке заявок инвестора. */
  investorAvatarId: string | null;
  startupId: string;
  startupName: string;
  roadmapItemId: string | null;
  roadmapItemTitle: string | null;
  amount: number;
  message: string | null;
  status: InvestmentApplicationStatus;
  // Deal terms
  instrument: InvestmentInstrument;
  valuationCap: number | null;
  /** Проценты, не доля: 20 = 20%. Бэкенд хранит долей, перевод — в маппере DTO. */
  discountPct: number | null;
  /** Проценты годовых, не доля: 6 = 6% год. */
  interestRatePct: number | null;
  termMonths: number | null;
  preMoneyValuation: number | null;
  liquidationPreference: number | null;
  proRataRights: boolean;
  validationFlags: ValidationFlag[];
  createdAt: string;
  updatedAt: string;
}
