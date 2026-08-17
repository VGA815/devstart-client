import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { AdminService } from '../admin.service';
import {
  ValuationBenchmark,
  INDUSTRY_LABELS, METRIC_TYPE_LABELS, STAGE_LABELS, SECTOR_ONLY_METRICS,
} from '../admin.models';

@Component({
  selector: 'app-admin-benchmarks',
  standalone: true,
  imports: [SkeletonComponent, RouterLink],
  templateUrl: './admin-benchmarks.component.html',
  styleUrl: '../admin-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBenchmarksComponent implements OnInit {
  private readonly admin  = inject(AdminService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading    = signal(true);
  readonly error      = signal('');
  readonly benchmarks = signal<ValuationBenchmark[]>([]);

  // add form
  readonly formOpen      = signal(false);
  readonly metricType    = signal('0');
  readonly industry      = signal('0');
  readonly stage         = signal('');     // '' = все стадии
  readonly value         = signal('');
  readonly effectiveFrom = signal('');
  readonly source        = signal('');
  readonly busy          = signal(false);
  readonly formError     = signal('');

  /** Мультипликатор и интенсивность конкуренции — посекторные: стадии у них нет. */
  readonly isSectorOnly = computed(() => SECTOR_ONLY_METRICS.includes(+this.metricType()));

  /** Показывается, когда форма открыта предложением деривации, а не вручную. */
  readonly prefilled = signal(false);

  // history view
  readonly historyKey     = signal<string | null>(null);
  readonly history        = signal<ValuationBenchmark[]>([]);
  readonly historyLoading = signal(false);

  readonly metricOptions   = Object.entries(METRIC_TYPE_LABELS);
  readonly industryOptions = Object.entries(INDUSTRY_LABELS);
  readonly stageOptions    = Object.entries(STAGE_LABELS);

  ngOnInit(): void {
    this.load();
    this.applyPrefill();
  }

  /**
   * Предложение из вкладки деривации приходит query-параметрами и просто открывает эту форму
   * заполненной. Отдельного пути записи нет: отправляет всё равно админ, created_by остаётся его,
   * валидация — та же самая.
   */
  private applyPrefill(): void {
    const q = this.route.snapshot.queryParamMap;
    if (!q.has('value')) return;

    this.metricType.set(q.get('metricType') ?? '1');
    this.industry.set(q.get('industry') ?? '0');
    this.stage.set(q.get('stage') ?? '');
    this.value.set(q.get('value') ?? '');
    this.effectiveFrom.set((q.get('effectiveFrom') ?? '').slice(0, 10));
    this.source.set(q.get('source') ?? '');
    this.prefilled.set(true);
    this.formOpen.set(true);

    // Чистим адресную строку, чтобы обновление страницы не открывало форму снова.
    void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.admin.getBenchmarks().pipe(
      catchError(() => {
        this.error.set('Не удалось загрузить бенчмарки.');
        return of([] as ValuationBenchmark[]);
      })
    ).subscribe(list => {
      this.benchmarks.set(list);
      this.loading.set(false);
    });
  }

  submitAdd(): void {
    if (this.busy()) return;

    const value = Number(this.value().trim().replace(',', '.'));
    const source = this.source().trim();
    const effectiveFrom = this.effectiveFrom();
    const metricType = +this.metricType();

    if (isNaN(value) || value <= 0) { this.formError.set('Значение должно быть положительным числом.'); return; }
    if (!effectiveFrom)             { this.formError.set('Укажите дату начала действия.'); return; }
    if (!source)                    { this.formError.set('Укажите источник данных.'); return; }
    if (metricType === 2 && value > 100) {
      this.formError.set('Интенсивность конкуренции задаётся по шкале 0…100.');
      return;
    }

    this.busy.set(true);
    this.formError.set('');

    this.admin.addBenchmark({
      metricType,
      industry: +this.industry(),
      stage: this.isSectorOnly() || this.stage() === '' ? null : +this.stage(),
      value,
      currency: metricType === 0 ? 'RUB' : null,
      effectiveFrom: new Date(effectiveFrom).toISOString(),
      source,
    }).subscribe({
      next: () => {
        this.busy.set(false);
        this.formOpen.set(false);
        this.prefilled.set(false);
        this.value.set('');
        this.source.set('');
        this.load();
      },
      error: err => {
        this.busy.set(false);
        this.formError.set(err?.status === 409
          ? 'Версия с такой метрикой, сектором, стадией и датой уже существует — сдвиньте дату начала действия.'
          : 'Не удалось добавить бенчмарк.');
      },
    });
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.prefilled.set(false);
    this.formError.set('');
  }

  toggleHistory(b: ValuationBenchmark): void {
    const key = `${b.metricType}:${b.industry}:${b.stage ?? ''}`;
    if (this.historyKey() === key) {
      this.historyKey.set(null);
      return;
    }
    this.historyKey.set(key);
    this.historyLoading.set(true);
    this.history.set([]);

    this.admin.getBenchmarkHistory(b.metricType, b.industry, b.stage).pipe(
      catchError(() => of([] as ValuationBenchmark[]))
    ).subscribe(list => {
      this.history.set(list);
      this.historyLoading.set(false);
    });
  }

  isHistoryOpen(b: ValuationBenchmark): boolean {
    return this.historyKey() === `${b.metricType}:${b.industry}:${b.stage ?? ''}`;
  }

  metricLabel(v: number): string   { return METRIC_TYPE_LABELS[v] ?? String(v); }
  industryLabel(v: number): string { return INDUSTRY_LABELS[v] ?? String(v); }
  stageLabel(v: number | null): string {
    return v == null ? 'Все стадии' : STAGE_LABELS[v] ?? String(v);
  }

  formatValue(b: ValuationBenchmark): string {
    const num = new Intl.NumberFormat('ru-RU').format(b.value);
    if (b.currency) return `${num} ${b.currency === 'RUB' ? '₽' : b.currency}`;
    return b.metricType === 2 ? `${num} из 100` : `×${num}`;
  }

  valueHint(): string {
    switch (+this.metricType()) {
      case 0:  return '₽ для pre-money медианы';
      case 2:  return '0…100, где 100 — предельно тесный сектор';
      default: return 'множитель к выручке';
    }
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(new Date(value));
  }
}
