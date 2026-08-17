import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { AdminService } from '../admin.service';
import {
  BenchmarkIndustryMapping,
  BenchmarkIssuer,
  BenchmarkSuggestion,
  BenchmarkSuggestions,
  UnmappedBenchmarkBucket,
  INDUSTRY_LABELS,
  METRIC_TYPE_LABELS,
} from '../admin.models';

/**
 * Верстак бенчмарков: предложения деривации (SC-60), приёмка внешних данных (SC-57)
 * и курируемый реестр (SC-58).
 *
 * Ключевое свойство страницы — она ничего не пишет в valuation_benchmark. «Принять» открывает
 * существующую форму добавления с предзаполненными полями; отправляет админ, created_by остаётся
 * его именем, валидация одна на всех.
 */
@Component({
  selector: 'app-admin-benchmark-workbench',
  standalone: true,
  imports: [SkeletonComponent, RouterLink],
  templateUrl: './admin-benchmark-workbench.component.html',
  styleUrl: '../admin-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBenchmarkWorkbenchComponent implements OnInit {
  private readonly admin  = inject(AdminService);
  private readonly router = inject(Router);

  readonly tab = signal<'suggestions' | 'data' | 'registry'>('suggestions');

  // ── Предложения ──────────────────────────────────────────────────────────────
  readonly loading     = signal(true);
  readonly error       = signal('');
  readonly result      = signal<BenchmarkSuggestions | null>(null);
  /** Ключ раскрытой цепочки: «метрика:сектор» — сектор один, метрик у него две. */
  readonly openChain   = signal<string | null>(null);

  // Параметры деривации. Правятся здесь и уезжают в запрос — на сервере не сохраняются.
  readonly minComparables = signal('3');
  readonly countryDiscount = signal('0.60');
  readonly illiquidityDiscount = signal('0.70');
  readonly datasetRegion = signal('Emerging Markets');

  // ── Данные ───────────────────────────────────────────────────────────────────
  readonly datasetYear   = signal(String(new Date().getFullYear()));
  readonly uploadFile    = signal<File | null>(null);
  readonly uploadBusy    = signal(false);
  readonly uploadError   = signal('');
  readonly uploadOk      = signal('');
  readonly collectBusy   = signal(false);
  readonly collectOk     = signal('');
  readonly unmapped      = signal<UnmappedBenchmarkBucket[]>([]);

  // ── Реестр ───────────────────────────────────────────────────────────────────
  readonly issuers       = signal<BenchmarkIssuer[]>([]);
  readonly mappings      = signal<BenchmarkIndustryMapping[]>([]);
  readonly registryBusy  = signal(false);
  readonly registryError = signal('');
  readonly editingIssuer = signal<string | null>(null);

  readonly issuerForm = signal<Partial<BenchmarkIssuer>>({});

  readonly industryOptions = Object.entries(INDUSTRY_LABELS);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loadSuggestions();
    this.loadRegistry();
  }

  // ── Предложения ──────────────────────────────────────────────────────────────

  loadSuggestions(): void {
    this.loading.set(true);
    this.error.set('');

    this.admin.getBenchmarkSuggestions({
      minComparables: Number(this.minComparables()) || undefined,
      countryDiscount: this.parseDecimal(this.countryDiscount()),
      illiquidityAndSizeDiscount: this.parseDecimal(this.illiquidityDiscount()),
      datasetRegion: this.datasetRegion().trim(),
    }).pipe(
      catchError(() => {
        this.error.set('Не удалось получить предложения.');
        return of(null);
      })
    ).subscribe(res => {
      this.result.set(res);
      this.loading.set(false);
    });
  }

  chainKey(s: BenchmarkSuggestion): string {
    return `${s.metricType}:${s.industry}`;
  }

  toggleChain(s: BenchmarkSuggestion): void {
    const key = this.chainKey(s);
    this.openChain.set(this.openChain() === key ? null : key);
  }

  isChainOpen(s: BenchmarkSuggestion): boolean {
    return this.openChain() === this.chainKey(s);
  }

  suggestionsFor(metricType: number): BenchmarkSuggestion[] {
    return this.result()?.suggestions.filter(s => s.metricType === metricType) ?? [];
  }

  metricLabel(v: number): string { return METRIC_TYPE_LABELS[v] ?? String(v); }

  /** Мультипликатор пишется «×1,4», интенсивность — «58 из 100». */
  formatSuggested(s: BenchmarkSuggestion, value: number | null): string {
    if (value == null) return '—';
    const n = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);
    return s.metricType === 2 ? `${n} из 100` : `${n}×`;
  }

  /**
   * Переносит предложение в существующую форму добавления. Здесь нет записи — только навигация
   * с предзаполнением: подтверждает значение человек, а не соглашается с машиной по инерции.
   */
  accept(s: BenchmarkSuggestion): void {
    if (s.value == null || !s.source) return;

    void this.router.navigate(['/admin/benchmarks'], {
      queryParams: {
        metricType: s.metricType,
        industry: s.industry,
        value: s.value,
        effectiveFrom: s.effectiveFrom,
        source: s.source,
      },
    });
  }

  // ── Данные ───────────────────────────────────────────────────────────────────

  pickFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.uploadFile.set(input.files?.[0] ?? null);
    this.uploadError.set('');
    this.uploadOk.set('');
  }

  upload(): void {
    const file = this.uploadFile();
    const year = Number(this.datasetYear());
    const region = this.datasetRegion().trim();

    if (!file)                        { this.uploadError.set('Выберите CSV-файл датасета.'); return; }
    if (!year || year < 2000)         { this.uploadError.set('Укажите год выпуска датасета.'); return; }
    if (!region)                      { this.uploadError.set('Укажите региональный срез.'); return; }

    this.uploadBusy.set(true);
    this.uploadError.set('');
    this.uploadOk.set('');

    this.admin.uploadDamodaranDataset(file, year, region).subscribe({
      next: res => {
        this.uploadBusy.set(false);
        this.uploadOk.set(
          `Загружено ${res.bucketsImported} корзин(ы), из них без сопоставления — ${res.unmappedBuckets}. ` +
          `Оригинал: ${res.objectKey}`);
        this.loadUnmapped();
        this.loadSuggestions();
      },
      error: err => {
        this.uploadBusy.set(false);
        // Разбор атомарный: если сюда пришла ошибка, в staging не записано ничего.
        this.uploadError.set(err?.error?.detail
          ?? err?.error?.title
          ?? 'Не удалось разобрать файл. Ничего не импортировано.');
      },
    });
  }

  collect(kind: number): void {
    this.collectBusy.set(true);
    this.collectOk.set('');
    this.admin.runBenchmarkCollection(kind).subscribe({
      next: () => {
        this.collectBusy.set(false);
        this.collectOk.set('Сбор поставлен в очередь. Результат появится в staging через несколько минут.');
      },
      error: () => {
        this.collectBusy.set(false);
        this.collectOk.set('Не удалось поставить сбор в очередь.');
      },
    });
  }

  loadUnmapped(): void {
    this.admin.getUnmappedBenchmarkBuckets().pipe(
      catchError(() => of([] as UnmappedBenchmarkBucket[]))
    ).subscribe(list => this.unmapped.set(list));
  }

  // ── Реестр ───────────────────────────────────────────────────────────────────

  loadRegistry(): void {
    this.admin.getBenchmarkIssuers().pipe(
      catchError(() => of([] as BenchmarkIssuer[]))
    ).subscribe(list => this.issuers.set(list));

    this.admin.getBenchmarkIndustryMappings(0).pipe(
      catchError(() => of([] as BenchmarkIndustryMapping[]))
    ).subscribe(list => this.mappings.set(list));

    this.loadUnmapped();
  }

  editIssuer(issuer: BenchmarkIssuer): void {
    this.editingIssuer.set(issuer.id);
    this.issuerForm.set({ ...issuer });
    this.registryError.set('');
  }

  newIssuer(): void {
    this.editingIssuer.set('new');
    this.issuerForm.set({ ticker: '', displayName: '', industry: 0, isActive: true });
    this.registryError.set('');
  }

  patchIssuer<K extends keyof BenchmarkIssuer>(key: K, value: BenchmarkIssuer[K]): void {
    this.issuerForm.set({ ...this.issuerForm(), [key]: value });
  }

  saveIssuer(): void {
    const f = this.issuerForm();
    if (!f.ticker || !f.displayName) {
      this.registryError.set('Тикер и название обязательны.');
      return;
    }

    this.registryBusy.set(true);
    this.registryError.set('');

    this.admin.saveBenchmarkIssuer({
      id: this.editingIssuer() === 'new' ? null : (f.id ?? null),
      ticker: f.ticker,
      inn: this.emptyToNull(f.inn),
      displayName: f.displayName,
      industry: f.industry ?? 0,
      isActive: f.isActive ?? true,
      revenueOverride: f.revenueOverride ?? null,
      revenueOverrideFiscalYear: f.revenueOverrideFiscalYear ?? null,
      revenueOverrideNote: this.emptyToNull(f.revenueOverrideNote),
      note: this.emptyToNull(f.note),
    }).subscribe({
      next: () => {
        this.registryBusy.set(false);
        this.editingIssuer.set(null);
        this.loadRegistry();
      },
      error: err => {
        this.registryBusy.set(false);
        this.registryError.set(err?.error?.detail ?? 'Не удалось сохранить эмитента.');
      },
    });
  }

  mapBucket(externalKey: string, industryValue: string): void {
    this.registryBusy.set(true);
    this.admin.saveBenchmarkIndustryMapping({
      sourceKind: 0,
      externalKey,
      industry: industryValue === 'none' ? null : Number(industryValue),
      note: null,
    }).subscribe({
      next: () => {
        this.registryBusy.set(false);
        this.loadRegistry();
        this.loadSuggestions();
      },
      error: () => {
        this.registryBusy.set(false);
        this.registryError.set('Не удалось сохранить сопоставление.');
      },
    });
  }

  deleteMapping(id: string): void {
    this.registryBusy.set(true);
    this.admin.deleteBenchmarkIndustryMapping(id).subscribe({
      next: () => {
        this.registryBusy.set(false);
        this.loadRegistry();
        this.loadSuggestions();
      },
      error: () => {
        this.registryBusy.set(false);
        this.registryError.set('Не удалось удалить сопоставление.');
      },
    });
  }

  // ── Форматирование ───────────────────────────────────────────────────────────

  industryLabel(v: number | null): string {
    return v == null ? 'Не сопоставляется' : INDUSTRY_LABELS[v] ?? String(v);
  }

  multiple(v: number | null): string {
    return v == null ? '—' : `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(v)}×`;
  }

  deltaLabel(s: BenchmarkSuggestion): string {
    if (s.deltaPercent == null) return '';
    const sign = s.deltaPercent > 0 ? '+' : '';
    return `${sign}${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(s.deltaPercent)}%`;
  }

  money(v: number | null): string {
    if (v == null) return '—';
    return new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
  }

  formatDate(value: string | null): string {
    return value ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(new Date(value)) : '—';
  }

  private parseDecimal(raw: string): number | undefined {
    const n = Number(raw.trim().replace(',', '.'));
    return isNaN(n) ? undefined : n;
  }

  private emptyToNull(v: string | null | undefined): string | null {
    return v && v.trim().length > 0 ? v.trim() : null;
  }
}
