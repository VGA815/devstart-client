import { CapTable, CapTableHolder, EquityHolderType } from '../startup-equity.model';

// EquityHolderType is an int on the wire: 0=Founder, 1=Esop, 2=Advisor, 3=Other.
const HOLDER_TYPES: EquityHolderType[] = ['Founder', 'Esop', 'Advisor', 'Other'];

export const HOLDER_TYPE_NUM: Record<EquityHolderType, number> = {
  Founder: 0,
  Esop:    1,
  Advisor: 2,
  Other:   3,
};

// One row of GET /startups/{id}/cap-table (response → camelCase).
export interface CapTableHolderDto {
  profileId:        string | null;
  holderType:       number;
  name:             string;
  equityPercentage: number;
  vestingStartDate: string | null;
  vestingMonths:    number | null;
  cliffMonths:      number | null;
  vestedFraction:   number;
  vestedPercentage: number;
}

// GET /startups/{id}/cap-table. When no table has been saved yet the backend returns
// a bootstrapped default (founders split 90% equally + 10% ESOP) with isConfigured=false.
export interface CapTableDto {
  startupId:             string;
  isConfigured:          boolean;
  totalPercentage:       number;
  totalVestedPercentage: number;
  holders:               CapTableHolderDto[];
}

// One row of PUT /startups/{id}/cap-table (request → snake_case). Founder rows carry
// profile_id, non-founder rows carry name. Vesting fields are all-or-nothing.
export interface SetCapTableHolderRequestDto {
  holder_type:        number;
  profile_id?:        string | null;
  name?:              string | null;
  equity_percentage:  number;
  vesting_start_date?: string | null;
  vesting_months?:    number | null;
  cliff_months?:      number | null;
}

export interface SetCapTableRequestDto {
  holders: SetCapTableHolderRequestDto[];
}

export function mapCapTableHolderDto(dto: CapTableHolderDto): CapTableHolder {
  return {
    profileId:        dto.profileId,
    holderType:       HOLDER_TYPES[dto.holderType] ?? 'Other',
    name:             dto.name,
    equityPercentage: dto.equityPercentage,
    vestingStartDate: dto.vestingStartDate,
    vestingMonths:    dto.vestingMonths,
    cliffMonths:      dto.cliffMonths,
    vestedFraction:   dto.vestedFraction,
    vestedPercentage: dto.vestedPercentage,
  };
}

export function mapCapTableDto(dto: CapTableDto): CapTable {
  return {
    startupId:             dto.startupId,
    isConfigured:          dto.isConfigured,
    totalPercentage:       dto.totalPercentage,
    totalVestedPercentage: dto.totalVestedPercentage,
    holders:               dto.holders.map(mapCapTableHolderDto),
  };
}
