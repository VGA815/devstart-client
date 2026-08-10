import { InvestmentApplication, InvestmentApplicationStatus, InvestmentInstrument, ValidationFlag } from '../investment-application.model';
import { fractionToPct } from '../../utils/percent.utils';

const STATUS_MAP: Record<number, InvestmentApplicationStatus> = {
  0: 'Pending',
  1: 'Accepted',
  2: 'Rejected',
  3: 'Withdrawn',
};

const INSTRUMENT_MAP: Record<number, InvestmentInstrument> = {
  0: 'Safe',
  1: 'ConvertibleLoan',
  2: 'PricedRound',
};


export interface ValidationFlagDto {
  key: string;
  message: string;
  severity: number; // 0=Info, 1=Warning, 2=Error
}

export interface InvestmentApplicationDto {
  id: string;
  investorProfileId: string;
  investorDisplayName: string;
  /** Логотип фонда либо аватарка аккаунта у физлица; в списке по инвестору не приходит. */
  investorAvatarId?: string | null;
  startupId: string;
  startupName: string;
  roadmapItemId: string | null;
  roadmapItemTitle: string | null;
  amount: number;
  message: string | null;
  status: number;
  instrument?: number;
  valuationCap?: number | null;
  /** Доля, не проценты: 0.2 = 20%. */
  discount?: number | null;
  /** Доля, не проценты: 0.06 = 6% год. */
  interestRate?: number | null;
  termMonths?: number | null;
  preMoneyValuation?: number | null;
  liquidationPreference?: number | null;
  proRataRights?: boolean;
  validationFlags?: ValidationFlagDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvestmentApplicationRequestDto {
  startup_id: string;
  roadmap_item_id?: string;
  amount: number;
  message?: string;
  instrument?: number;
  valuation_cap?: number;
  /** Доля, не проценты: 0.2 = 20%. Валидатор бэкенда требует 0–0.5. */
  discount?: number;
  /** Доля, не проценты: 0.06 = 6% год. Валидатор бэкенда требует 0–0.30. */
  interest_rate?: number;
  term_months?: number;
  pre_money_valuation?: number;
  liquidation_preference?: number;
  pro_rata_rights?: boolean;
}

const SEVERITY_MAP: Record<number, ValidationFlag['severity']> = {
  0: 'Info', 1: 'Warning', 2: 'Error',
};

export function mapInvestmentApplicationDto(dto: InvestmentApplicationDto): InvestmentApplication {
  return {
    id: dto.id,
    investorProfileId: dto.investorProfileId,
    investorDisplayName: dto.investorDisplayName,
    investorAvatarId: dto.investorAvatarId ?? null,
    startupId: dto.startupId,
    startupName: dto.startupName,
    roadmapItemId: dto.roadmapItemId,
    roadmapItemTitle: dto.roadmapItemTitle,
    amount: dto.amount,
    message: dto.message,
    status: STATUS_MAP[dto.status] ?? 'Pending',
    instrument: INSTRUMENT_MAP[dto.instrument ?? 0] ?? 'Safe',
    valuationCap: dto.valuationCap ?? null,
    discountPct: fractionToPct(dto.discount),
    interestRatePct: fractionToPct(dto.interestRate),
    termMonths: dto.termMonths ?? null,
    preMoneyValuation: dto.preMoneyValuation ?? null,
    liquidationPreference: dto.liquidationPreference ?? null,
    proRataRights: dto.proRataRights ?? false,
    validationFlags: (dto.validationFlags ?? []).map(f => ({
      key: f.key,
      message: f.message,
      severity: SEVERITY_MAP[f.severity] ?? 'Info',
    })),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}
