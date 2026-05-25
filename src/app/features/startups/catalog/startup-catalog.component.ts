import {
  Component, ChangeDetectionStrategy, inject, OnInit,
  signal, computed, effect, untracked,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StartupCatalogFacade } from './startup-catalog.facade';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { StartupMetricsService } from '../startup-metrics.service';
import { StartupStage, StartupLocation } from '../../../shared/models/startup.model';
import { StartupMetric, MetricType } from '../../../shared/models/startup-metric.model';
import { getStageBadgeClass, getStageBadgeLabel, getMetricLabel } from '../../../shared/utils/startup.utils';

const LOCATION_LABELS: Record<StartupLocation, string> = {
  Russia: 'Россия', USA: 'США', China: 'Китай', India: 'Индия', Other: 'Другое',
};

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

@Component({
  selector: 'app-startup-catalog',
  standalone: true,
  imports: [RouterLink, SkeletonComponent, AvatarComponent],
  templateUrl: './startup-catalog.component.html',
  styleUrl: './startup-catalog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartupCatalogComponent implements OnInit {
  protected readonly facade      = inject(StartupCatalogFacade);
  private readonly metricsSvc    = inject(StartupMetricsService);
  private readonly route         = inject(ActivatedRoute);
  private readonly title         = inject(Title);
  private readonly meta          = inject(Meta);

  readonly skeletons = Array(8);

  readonly selectedStage    = signal<StartupStage | null>(null);
  readonly selectedLocation = signal<StartupLocation | null>(null);
  readonly searchQuery      = signal('');


  readonly metricsMap = signal(new Map<string, StartupMetric[]>());
  private readonly metricsLoadedIds = new Set<string>();

  readonly filteredStartups = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.facade.startups();
    return this.facade.startups().filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.shortDescription?.toLowerCase().includes(q) ?? false)
    );
  });

  constructor() {
    effect(() => {
      const startups = this.facade.startups();
      const loading  = this.facade.loading();
      if (!loading && startups.length > 0) {
        const missing = startups.filter(s => !this.metricsLoadedIds.has(s.id));
        if (missing.length > 0) {
          untracked(() => this.loadMetrics(missing.map(s => s.id)));
        }
      }
    });
  }

  ngOnInit(): void {
    this.title.setTitle('Каталог стартапов — DevStart');
    this.meta.updateTag({ name: 'description', content: 'Каталог стартапов на платформе DevStart' });

    // Seed search & filters from the URL (e.g. when arriving from the landing filter bar).
    const params = this.route.snapshot.queryParamMap;
    const stage = params.get('stage') as StartupStage | null;
    const location = params.get('location') as StartupLocation | null;
    this.searchQuery.set(params.get('q') ?? '');
    this.selectedStage.set(stage);
    this.selectedLocation.set(location);

    this.facade.load({
      page: 1, pageSize: 50,
      ...(stage ? { stage } : {}),
      ...(location ? { location } : {}),
    });
  }

  private loadMetrics(ids: string[]): void {
    ids.forEach(id => this.metricsLoadedIds.add(id));
    forkJoin(
      Object.fromEntries(
        ids.map(id => [id, this.metricsSvc.getMetrics(id).pipe(catchError(() => of([])))])
      )
    ).subscribe(result => {
      const updated = new Map(this.metricsMap());
      for (const [id, list] of Object.entries(result)) {
        updated.set(id, (list as StartupMetric[]).slice(0, 4));
      }
      this.metricsMap.set(updated);
    });
  }

  selectStage(value: string): void {
    const stage = value === '' ? null : value as StartupStage;
    this.selectedStage.set(stage);
    this.searchQuery.set('');
    const loc = this.selectedLocation();
    this.facade.load({
      page: 1, pageSize: 50,
      ...(stage ? { stage } : {}),
      ...(loc   ? { location: loc } : {}),
    });
  }

  selectLocation(value: string): void {
    const loc = value === '' ? null : value as StartupLocation;
    this.selectedLocation.set(loc);
    const stage = this.selectedStage();
    this.facade.load({
      page: 1, pageSize: 50,
      ...(stage ? { stage } : {}),
      ...(loc   ? { location: loc } : {}),
    });
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
  }

  locationLabel(loc: StartupLocation | null): string {
    return loc ? (LOCATION_LABELS[loc] ?? loc) : '';
  }

  getStartupMetrics(startupId: string): StartupMetric[] {
    return this.metricsMap().get(startupId) ?? [];
  }

  metricCssColor(type: MetricType): string {
    return METRIC_CSS_COLOR[type] ?? 'var(--text)';
  }

  protected readonly getStageBadgeClass  = getStageBadgeClass;
  protected readonly getStageBadgeLabel  = getStageBadgeLabel;
  protected readonly getMetricLabel      = getMetricLabel;
  protected readonly formatMetric        = formatCatalogMetric;
}
