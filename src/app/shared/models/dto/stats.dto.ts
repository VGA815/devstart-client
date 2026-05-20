import { PlatformStats } from '../stats.model';

export interface StatsDto {
  startupsCount: number;
  investorsCount: number;
  expertsCount: number;
  totalRaised: number;
}

export function mapStatsDto(dto: StatsDto): PlatformStats {
  return {
    startupsCount: dto.startupsCount,
    investorsCount: dto.investorsCount,
    expertsCount: dto.expertsCount,
    totalRaised: dto.totalRaised,
  };
}
