import { StartupMetric, MetricType } from '../startup-metric.model';

const METRIC_TYPE_MAP: Record<number, MetricType> = {
  0: 'Users', 1: 'Revenue', 2: 'Cac', 3: 'Lvt', 4: 'GrowthRate', 5: 'Etc',
  6: 'Mrr', 7: 'Mau', 8: 'MomGrowth',
};

export const METRIC_TYPE_NUM: Record<MetricType, number> = {
  Users: 0, Revenue: 1, Cac: 2, Lvt: 3, GrowthRate: 4, Etc: 5,
  Mrr: 6, Mau: 7, MomGrowth: 8,
};


export interface StartupMetricDto {
  id: string;
  startupId: string;
  metricType: number;
  value: number;
}

export function mapStartupMetricDto(dto: StartupMetricDto): StartupMetric {
  return {
    id: dto.id,
    startupId: dto.startupId,
    metricType: METRIC_TYPE_MAP[dto.metricType] ?? 'Etc',
    value: dto.value,
  };
}
