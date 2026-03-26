import { StartupStage, StartupPosition } from '../models/startup.model';
import { MetricType, StartupMetric } from '../models/startup-metric.model';
import { RoadmapItemStatus } from '../models/startup-roadmap.model';
import { DocumentType } from '../models/startup-document.model';
import { TagColor } from '../components/tag/tag.component';


export interface EnumOption<T extends string> { label: string; value: number; key: T; }



const STAGE_TAG_COLOR: Record<StartupStage, TagColor> = {
  Idea: 'yellow', PreSeed: 'yellow', Mvp: 'yellow', Seed: 'green', SeriesA: 'accent',
};

const STAGE_BADGE_CLASS: Record<StartupStage, string> = {
  Idea: 'sr-badge--idea', PreSeed: 'sr-badge--pre-seed', Mvp: 'sr-badge--mvp',
  Seed: 'sr-badge--seed', SeriesA: 'sr-badge--series-a',
};

const STAGE_BADGE_LABEL: Record<StartupStage, string> = {
  Idea: 'Idea', PreSeed: 'Pre-Seed', Mvp: 'MVP', Seed: 'Seed', SeriesA: 'Series A',
};


export function getStageColor(stage: StartupStage): TagColor {
  return STAGE_TAG_COLOR[stage] ?? 'default';
}

/** CSS class for the catalog/landing `.sr-badge` element. */
export function getStageBadgeClass(stage: StartupStage, isStopped: boolean): string {
  if (isStopped) return 'sr-badge--stopped';
  return STAGE_BADGE_CLASS[stage] ?? '';
}


export function getStageBadgeLabel(stage: StartupStage, isStopped: boolean): string {
  if (isStopped) return 'Остановлен';
  return STAGE_BADGE_LABEL[stage] ?? stage;
}



const ROADMAP_STATUS_CLASS: Record<RoadmapItemStatus, string> = {
  Done: 'done', InProgress: 'active', Planned: 'planned',
};

const ROADMAP_STATUS_LABEL: Record<RoadmapItemStatus, string> = {
  Done: 'Завершено', InProgress: 'В процессе', Planned: 'Планируется',
};

export function getRoadmapStatusClass(status: RoadmapItemStatus): string {
  return ROADMAP_STATUS_CLASS[status] ?? 'planned';
}

export function getRoadmapStatusLabel(status: RoadmapItemStatus): string {
  return ROADMAP_STATUS_LABEL[status] ?? String(status);
}

export const ROADMAP_STATUS_OPTIONS: EnumOption<RoadmapItemStatus>[] = [
  { label: 'Планируется', value: 0, key: 'Planned'    },
  { label: 'В процессе',  value: 1, key: 'InProgress' },
  { label: 'Завершено',   value: 2, key: 'Done'       },
];



const METRIC_LABEL: Record<MetricType, string> = {
  Users: 'Пользователи',
  Revenue: 'Выручка',
  Cac: 'CAC',
  Lvt: 'LTV',
  GrowthRate: 'Growth Rate',
  Etc: 'Прочее',
  Mrr: 'MRR',
  Mau: 'MAU',
  MomGrowth: 'MoM Growth',
};

const METRIC_COLOR: Record<MetricType, string> = {
  Revenue: 'color-green',
  Users: 'color-accent',
  GrowthRate: 'color-green',
  Cac: 'color-yellow',
  Lvt: 'color-accent',
  Etc: 'color-text',
  Mrr: 'color-green',
  Mau: 'color-accent',
  MomGrowth: 'color-green',
};

export function getMetricLabel(type: MetricType): string {
  return METRIC_LABEL[type] ?? type;
}

export function getMetricColor(type: MetricType): string {
  return METRIC_COLOR[type] ?? 'color-text';
}


export function formatMetricValue(metric: StartupMetric): string {
  if (metric.metricType === 'Revenue')    return `₽${(metric.value / 1_000_000).toFixed(1)}M`;
  if (metric.metricType === 'Mrr')        return `₽${(metric.value / 1_000_000).toFixed(1)}M`;
  if (metric.metricType === 'GrowthRate') return `${metric.value}%`;
  if (metric.metricType === 'MomGrowth')  return `${metric.value}%`;
  return metric.value.toLocaleString('ru');
}

export const METRIC_TYPE_OPTIONS: EnumOption<MetricType>[] = [
  { label: 'Пользователи', value: 0, key: 'Users'      },
  { label: 'Выручка',      value: 1, key: 'Revenue'    },
  { label: 'CAC',          value: 2, key: 'Cac'        },
  { label: 'LTV',          value: 3, key: 'Lvt'        },
  { label: 'Growth Rate',  value: 4, key: 'GrowthRate' },
  { label: 'Прочее',       value: 5, key: 'Etc'        },
  { label: 'MRR',          value: 6, key: 'Mrr'        },
  { label: 'MAU',          value: 7, key: 'Mau'        },
  { label: 'MoM Growth',   value: 8, key: 'MomGrowth'  },
];



const POSITION_LABEL: Record<StartupPosition, string> = {
  Other: 'Другое',
  CEO: 'CEO',
  CTO: 'CTO',
  CMO: 'CMO',
  COO: 'COO',
  CFO: 'CFO',
  CPO: 'CPO',
};

export function getPositionLabel(position: StartupPosition | null): string {
  if (!position) return '';
  return POSITION_LABEL[position] ?? position;
}

export const POSITION_OPTIONS: { label: string; value: number }[] = [
  { label: '— Без должности —', value: 0 },
  { label: 'CEO',               value: 1 },
  { label: 'CTO',               value: 2 },
  { label: 'CMO',               value: 3 },
  { label: 'COO',               value: 4 },
  { label: 'CFO',               value: 5 },
  { label: 'CPO',               value: 6 },
];



const DOC_TYPE_LABEL: Record<DocumentType, string> = {
  Pitch: 'Питч', Report: 'Отчёт', Other: 'Другое',
};

const DOC_TYPE_ICON: Record<DocumentType, string> = {
  Pitch: '🎯', Report: '📊', Other: '📄',
};

export function getDocumentTypeLabel(type: DocumentType): string {
  return DOC_TYPE_LABEL[type] ?? type;
}

export function getDocumentIcon(type: DocumentType): string {
  return DOC_TYPE_ICON[type] ?? '📄';
}

export const DOC_TYPE_OPTIONS: EnumOption<DocumentType>[] = [
  { label: '🎯 Питч',  value: 0, key: 'Pitch'  },
  { label: '📊 Отчёт', value: 1, key: 'Report' },
  { label: '📄 Другое', value: 2, key: 'Other'  },
];

/** "1.2 МБ" / "345 КБ" / "12 Б" */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} МБ`;
  if (bytes >= 1_024)     return `${Math.round(bytes / 1_024)} КБ`;
  return `${bytes} Б`;
}
