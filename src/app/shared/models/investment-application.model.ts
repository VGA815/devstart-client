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
  discount: number | null;
  interestRate: number | null;
  termMonths: number | null;
  preMoneyValuation: number | null;
  liquidationPreference: number | null;
  proRataRights: boolean;
  validationFlags: ValidationFlag[];
  createdAt: string;
  updatedAt: string;
}
