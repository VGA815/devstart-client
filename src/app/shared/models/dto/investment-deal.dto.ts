import { InvestmentDeal, InvestmentDealStatus, InvestmentInstrument, CapTableRow } from '../investment-deal.model';

const STATUS_MAP: Record<number, InvestmentDealStatus> = {
  0: 'InProgress',
  1: 'Completed',
  2: 'Cancelled',
};

const INSTRUMENT_MAP: Record<number, InvestmentInstrument> = {
  0: 'Safe',
  1: 'ConvertibleLoan',
  2: 'PricedRound',
};

// Main deal DTO (GET /investment-deals/{id})
export interface InvestmentDealDto {
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
  status: number;
  instrument?: number;
  valuationCap?: number | null;
  discount?: number | null;
  interestRate?: number | null;
  termMonths?: number | null;
  preMoneyValuation?: number | null;
  liquidationPreference?: number | null;
  proRataRights?: boolean;
  documentsReady?: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

// Cap table DTO (GET /investment-deals/{id}/cap-table)
export interface CapTableEntryDto {
  partyId: string | null;
  partyName: string;
  partyType: string;
  sharePctBefore: number;
  sharePctAfter: number;
}

export interface CapTableResultDto {
  entries: CapTableEntryDto[];
  investorSharePct: number;
  foundersTotalAfterPct: number;
  warnings: unknown[];
}

// Term sheet DTO (GET /investment-deals/{id}/term-sheet)
export interface TermSheetResponseDto {
  dealId: string;
  markdown: string;
  generatedAt: string;
}


export function mapInvestmentDealDto(
  dto: InvestmentDealDto,
  termSheet: string | null = null,
  capTableEntries: CapTableEntryDto[] = [],
): InvestmentDeal {
  return {
    id: dto.id,
    applicationId: dto.applicationId,
    investorProfileId: dto.investorProfileId,
    investorDisplayName: dto.investorDisplayName ?? '',
    startupId: dto.startupId,
    startupName: dto.startupName ?? '',
    roadmapItemId: dto.roadmapItemId,
    roadmapItemTitle: dto.roadmapItemTitle,
    amount: dto.amount,
    confirmedByStartup: dto.confirmedByStartup,
    confirmedByInvestor: dto.confirmedByInvestor,
    status: STATUS_MAP[dto.status] ?? 'InProgress',
    instrument: INSTRUMENT_MAP[dto.instrument ?? 0] ?? 'Safe',
    valuationCap: dto.valuationCap ?? null,
    discount: dto.discount ?? null,
    interestRate: dto.interestRate ?? null,
    termMonths: dto.termMonths ?? null,
    preMoneyValuation: dto.preMoneyValuation ?? null,
    liquidationPreference: dto.liquidationPreference ?? null,
    proRataRights: dto.proRataRights ?? false,
    termSheet,
    capTable: capTableEntries.map(mapCapTableEntry),
    documentsReady: dto.documentsReady ?? false,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    completedAt: dto.completedAt,
  };
}

export function mapCapTableEntry(e: CapTableEntryDto): CapTableRow {
  return {
    name: e.partyName,
    partyType: e.partyType,
    percentageBefore: e.sharePctBefore,
    percentage: e.sharePctAfter,
  };
}
