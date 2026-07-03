import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { catchError, of } from 'rxjs';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { AdminService } from '../admin.service';
import {
  ValuationBenchmark,
  INDUSTRY_LABELS, METRIC_TYPE_LABELS, STAGE_LABELS,
} from '../admin.models';

@Component({
  selector: 'app-admin-benchmarks',
  standalone: true,
  imports: [SkeletonComponent],
  templateUrl: './admin-benchmarks.component.html',
  styleUrl: '../admin-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBenchmarksComponent implements OnInit {
  private readonly admin = inject(AdminService);

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

  // history view
  readonly historyKey     = signal<string | null>(null);
  readonly history        = signal<ValuationBenchmark[]>([]);
  readonly historyLoading = signal(false);

  readonly metricOptions   = Object.entries(METRIC_TYPE_LABELS);
  readonly industryOptions = Object.entries(INDUSTRY_LABELS);
  readonly stageOptions    = Object.entries(STAGE_LABELS);

  ngOnInit(): void { this.load(); }

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

    if (isNaN(value) || value <= 0) { this.formError.set('Значение должно быть положительным числом.'); return; }
    if (!effectiveFrom)             { this.formError.set('Укажите дату начала действия.'); return; }
    if (!source)                    { this.formError.set('Укажите источник данных.'); return; }

    this.busy.set(true);
    this.formError.set('');

    this.admin.addBenchmark({
      metricType: +this.metricType(),
      industry: +this.industry(),
      stage: this.stage() === '' ? null : +this.stage(),
      value,
      currency: +this.metricType() === 0 ? 'RUB' : null,
      effectiveFrom: new Date(effectiveFrom).toISOString(),
      source,
    }).subscribe({
      next: () => {
        this.busy.set(false);
        this.formOpen.set(false);
        this.value.set('');
        this.source.set('');
        this.load();
      },
      error: () => {
        this.busy.set(false);
        this.formError.set('Не удалось добавить бенчмарк.');
      },
    });
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
    return b.currency ? `${num} ${b.currency === 'RUB' ? '₽' : b.currency}` : `×${num}`;
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(new Date(value));
  }
}
