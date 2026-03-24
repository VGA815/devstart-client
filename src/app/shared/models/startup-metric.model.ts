export type MetricType = 'Users' | 'Revenue' | 'Cac' | 'Lvt' | 'GrowthRate' | 'Etc' | 'Mrr' | 'Mau' | 'MomGrowth';

export interface StartupMetric {
  id: string;
  startupId: string;
  metricType: MetricType;
  value: number;
}
