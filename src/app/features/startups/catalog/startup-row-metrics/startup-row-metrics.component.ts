import { Component, ChangeDetectionStrategy, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { switchMap, catchError, of } from 'rxjs';
import { StartupMetricsService } from '../../startup-metrics.service';
import { StartupMetric, MetricType } from '../../../../shared/models/startup-metric.model';
import { getMetricLabel } from '../../../../shared/utils/startup.utils';

const METRIC_CSS_COLOR: Record<MetricType, string> = {
  Revenue:    'var(--green)',
  Users:      'var(--accent)',
  GrowthRate: 'var(--green)',
  Cac:        'var(--yellow)',
  Lvt:        'var(--accent)',
  Etc:        'var(--text)',
  Mrr:        'var(--green)',
  Mau:        'var(--accent)',
  MomGrowth:  'var(--green)',
};

const MAX_CELLS = 4;

function formatCatalogMetric(m: StartupMetric): string {
  const v = m.value;
  if (m.metricType === 'Revenue') {
    if (v >= 1_000_000) return `₽${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `₽${(v / 1_000).toFixed(0)}K`;
    return `₽${v}`;
  }
  if (m.metricType === 'GrowthRate') return `${v}%`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString('ru');
}

/**
 * Метрики одной строки каталога. Компонент вынесен отдельно ровно затем, чтобы
 * его можно было завернуть в `@defer (on viewport)`: запрос метрик уходит
 * только для тех карточек, до которых пользователь домотал. Раньше каталог
 * тянул метрики сразу для всей страницы одним forkJoin.
 */
@Component({
  selector: 'app-startup-row-metrics',
  standalone: true,
  templateUrl: './startup-row-metrics.component.html',
  styleUrl: './startup-row-metrics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartupRowMetricsComponent {
  private readonly metricsSvc = inject(StartupMetricsService);

  readonly startupId = input.required<string>();

  private readonly loaded = signal<StartupMetric[]>([]);
  readonly metrics = this.loaded.asReadonly();

  constructor() {
    toObservable(this.startupId).pipe(
      switchMap(id => this.metricsSvc.getMetrics(id).pipe(catchError(() => of([] as StartupMetric[])))),
      takeUntilDestroyed(),
    ).subscribe(list => this.loaded.set(list.slice(0, MAX_CELLS)));
  }

  protected metricCssColor(type: MetricType): string {
    return METRIC_CSS_COLOR[type] ?? 'var(--text)';
  }

  protected readonly getMetricLabel = getMetricLabel;
  protected readonly formatMetric   = formatCatalogMetric;
}
