export type InvestmentDealStatus = 'InProgress' | 'Completed' | 'Cancelled';
export type InvestmentInstrument = 'Safe' | 'ConvertibleLoan' | 'PricedRound';

export interface CapTableRow {
  /** Party name (founder name, investor name, "ESOP pool", etc.) */
  name: string;
  /** "Founder" | "Investor" | "Esop" */
  partyType: string;
  /** Equity % before this deal */
  percentageBefore: number;
  /** Equity % after this deal */
  percentage: number;
}

export interface InvestmentDeal {
  id: string;
  applicationId: string;
  investorProfileId: string;
  investorDisplayName: string;
  startupId: string;
  startupName: string;
  roadmapItemId: string | null;
  roadmapItemTitle: string | null;
  amount: number;
  confirmedByStartup: boolean;
  confirmedByInvestor: boolean;
  status: InvestmentDealStatus;
  // Terms
  instrument: InvestmentInstrument;
  valuationCap: number | null;
  discount: number | null;
  interestRate: number | null;
  termMonths: number | null;
  preMoneyValuation: number | null;
  liquidationPreference: number | null;
  proRataRights: boolean;
  // Documents
  termSheet: string | null;
  capTable: CapTableRow[];
  documentsReady: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}
