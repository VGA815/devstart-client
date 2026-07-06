/** Maps to DevStart.Domain.StartupEquity.EquityHolderType */
export type EquityHolderType = 'Founder' | 'Esop' | 'Advisor' | 'Other';

/**
 * One row of a startup's founding (pre-money) cap table. Equity is a percent of the
 * whole company; across all holders the rows sum to 100%. Vesting is informational:
 * vestedFraction/vestedPercentage are computed by the backend as of "now".
 */
export interface CapTableHolder {
  profileId:        string | null;
  holderType:       EquityHolderType;
  name:             string;
  equityPercentage: number;
  vestingStartDate: string | null;
  vestingMonths:    number | null;
  cliffMonths:      number | null;
  /** Vested fraction of this holder's equity, 0..1. 1 when there is no vesting schedule. */
  vestedFraction:   number;
  /** Vested share as a percent of the whole company. */
  vestedPercentage: number;
}

export interface CapTable {
  startupId:             string;
  /** False when nothing has been saved yet and the rows are the backend's default split. */
  isConfigured:          boolean;
  totalPercentage:       number;
  totalVestedPercentage: number;
  holders:               CapTableHolder[];
}
