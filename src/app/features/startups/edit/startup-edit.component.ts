import {
  Component, ChangeDetectionStrategy, inject, signal, computed, Input, OnInit, HostListener,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { StartupService } from '../startup.service';
import { AvatarUploadComponent } from '../../../shared/components/avatar-upload/avatar-upload.component';
import { StartupProductService } from '../startup-product.service';
import { Startup, StartupStage, StartupIndustry } from '../../../shared/models/startup.model';
import { INDUSTRY_NUM } from '../../../shared/models/dto/startup.dto';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { HasUnsavedChanges } from '../../../core/forms/unsaved-changes.guard';
import { apiErrorMessage } from '../../../core/http/api-error';

type StageOption    = { label: string; value: number };
type LocationOption = { label: string; value: number };
type IndustryOption = { label: string; value: StartupIndustry };

const STAGES: StageOption[] = [
  { label: 'Идея',     value: 0 },
  { label: 'Pre-Seed', value: 1 },
  { label: 'MVP',      value: 2 },
  { label: 'Seed',     value: 3 },
  { label: 'Series A', value: 4 },
];

const LOCATIONS: LocationOption[] = [
  { label: 'Россия', value: 0 },
  { label: 'США',    value: 1 },
  { label: 'Китай',  value: 2 },
  { label: 'Индия',  value: 3 },
  { label: 'Другая', value: 4 },
];

const INDUSTRIES: IndustryOption[] = [
  { label: 'Другая',       value: 'Other' },
  { label: 'SaaS',         value: 'Saas' },
  { label: 'Финтех',       value: 'Fintech' },
  { label: 'AI',           value: 'Ai' },
  { label: 'E-commerce',   value: 'Ecommerce' },
  { label: 'Маркетплейс',  value: 'Marketplace' },
  { label: 'Железо',       value: 'Hardware' },
  { label: 'Биотех',       value: 'Biotech' },
  { label: 'EdTech',       value: 'Edtech' },
];

const STAGE_TO_NUM: Record<StartupStage, number> = {
  Idea: 0, PreSeed: 1, Mvp: 2, Seed: 3, SeriesA: 4,
};

const LOCATION_TO_NUM: Record<string, number> = {
  Russia: 0, USA: 1, China: 2, India: 3, Other: 4,
};

/** Слепок всего редактируемого состояния — основа для сравнения «изменилось / нет». */
type EditSnapshot = {
  form: Record<string, unknown>;
  stage: number;
  location: number;
  industry: StartupIndustry;
  avatarId: string | null;
};

@Component({
  selector: 'app-startup-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SkeletonComponent, AvatarUploadComponent],
  templateUrl: './startup-edit.component.html',
  styleUrl:    './startup-edit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartupEditComponent implements OnInit, HasUnsavedChanges {
  @Input() id!: string;

  private readonly fb          = inject(FormBuilder);
  private readonly svc         = inject(StartupService);
  private readonly productSvc  = inject(StartupProductService);
  private readonly router      = inject(Router);
  private readonly title       = inject(Title);

  readonly stages     = STAGES;
  readonly locations  = LOCATIONS;
  readonly industries = INDUSTRIES;

  readonly pageLoading   = signal(true);
  readonly saving        = signal(false);
  readonly error         = signal<string | null>(null);
  /** Частичный успех: стартап сохранён, а карточка продукта — нет. */
  readonly warning       = signal<string | null>(null);
  readonly saveSuccess   = signal(false);

  readonly selectedStage    = signal<number>(0);
  readonly selectedLocation = signal<number>(0);
  readonly selectedIndustry = signal<StartupIndustry>('Other');
  readonly selectedAvatarId = signal<string | null>(null);

  private startup: Startup | null = null;

  readonly form = this.fb.group({
    name:             ['', [Validators.required, Validators.minLength(2)]],
    shortDescription: [''],
    description:      [''],

    publicEmail:  ['', [Validators.required, Validators.email]],
    billingEmail: ['', [Validators.email]],
    url:          [''],
    socialLinks:  [''],

    productProblem:      [''],
    productSolution:     ['', [Validators.required]],
    valueProposition:    [''],
    differentiators:     [''],
    stack:               [''],

    tam:              ['', [Validators.min(0)]],
    sam:              ['', [Validators.min(0)]],
    som:              ['', [Validators.min(0)]],
    marketGrowthRate: ['', [Validators.min(0), Validators.max(1000)]],
    targetRoundAmount: ['', [Validators.min(0)]],

    hasPatents:               [false],
    hasStrategicPartnerships: [false],
  });

  /** Зеркало значений формы в сигнале — `valueChanges` сам по себе не реактивен для computed. */
  private readonly formValue = signal<Record<string, unknown>>(this.form.getRawValue());
  private readonly baseline  = signal<EditSnapshot | null>(null);

  private readonly current = computed<EditSnapshot>(() => ({
    form:     this.formValue(),
    stage:    this.selectedStage(),
    location: this.selectedLocation(),
    industry: this.selectedIndustry(),
    avatarId: this.selectedAvatarId(),
  }));

  readonly isDirty = computed(() => {
    const base = this.baseline();
    return base != null && JSON.stringify(this.current()) !== JSON.stringify(base);
  });

  readonly unsavedChangesMessage =
    'В форме есть несохранённые изменения. Уйти со страницы и потерять их?';

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.formValue.set(this.form.getRawValue()));
  }

  hasUnsavedChanges(): boolean {
    return this.isDirty() && !this.saving();
  }

  /** Закрытие вкладки Angular-гвардом не перехватить — только штатным диалогом браузера. */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }

  ngOnInit(): void {
    this.title.setTitle('Редактирование стартапа — DevStart');

    forkJoin({
      startup: this.svc.getStartup(this.id),
      product: this.productSvc.getProduct(this.id).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ startup, product }) => {
        this.startup = startup;
        this.selectedAvatarId.set(startup.avatarId);
        this.selectedStage.set(STAGE_TO_NUM[startup.stage] ?? 0);
        this.selectedLocation.set(
          startup.location != null ? (LOCATION_TO_NUM[startup.location] ?? 0) : 0
        );
        this.selectedIndustry.set(startup.industry);
        this.form.patchValue({
          name:             startup.name,
          shortDescription: startup.shortDescription ?? '',
          description:      startup.description ?? '',
          publicEmail:      startup.publicEmail,
          billingEmail:     startup.billingEmail ?? '',
          url:              startup.url ?? '',
          socialLinks:      (startup.socialMediaLinks ?? []).join(', '),
          tam:              numToField(startup.tam),
          sam:              numToField(startup.sam),
          som:              numToField(startup.som),
          marketGrowthRate: numToField(startup.marketGrowthRate),
          targetRoundAmount: numToField(startup.targetRoundAmount),
          hasPatents:       startup.hasPatents,
          hasStrategicPartnerships: startup.hasStrategicPartnerships,
          ...(product ? {
            productProblem:   product.problem ?? '',
            productSolution:  product.solution,
            valueProposition: product.valueProposition ?? '',
            differentiators:  product.differentiators ?? '',
            stack:            (product.stack ?? []).join(', '),
          } : {}),
        });
        this.formValue.set(this.form.getRawValue());
        this.baseline.set(this.current());
        this.pageLoading.set(false);
      },
      error: err => {
        this.error.set(apiErrorMessage(err, 'Не удалось загрузить данные стартапа.'));
        this.pageLoading.set(false);
      },
    });
  }

  setStage(index: number):    void { this.selectedStage.set(index); }
  setLocation(index: number): void { this.selectedLocation.set(index); }
  setIndustry(value: StartupIndustry): void { this.selectedIndustry.set(value); }
  setAvatar(id: string | null): void { this.selectedAvatarId.set(id); }

  fieldError(name: string): string | null {
    const c = this.form.get(name);
    if (!c?.touched || !c.invalid) return null;
    if (c.hasError('required'))  return 'Обязательное поле';
    if (c.hasError('email'))     return 'Некорректный email';
    if (c.hasError('minlength')) return `Минимум ${c.errors?.['minlength']?.requiredLength} символов`;
    if (c.hasError('min'))       return `Не меньше ${c.errors?.['min']?.min}`;
    if (c.hasError('max'))       return `Не больше ${c.errors?.['max']?.max}`;
    return null;
  }

  save(exit: boolean): void {
    if (this.saving()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (!this.isDirty()) { if (exit) this.leave(); return; }

    const v = this.form.getRawValue();
    const splitCsv = (s: string | null) =>
      (s ?? '').split(',').map(x => x.trim()).filter(Boolean);
    const parseDecimal = (s: string | null) => {
      const n = parseFloat(s ?? '');
      return isNaN(n) ? undefined : n;
    };

    this.saving.set(true);
    this.error.set(null);
    this.warning.set(null);
    this.saveSuccess.set(false);

    // Каждый запрос возвращает либо null (успех), либо ошибку — иначе forkJoin оборвался бы
    // на первом сбое, и нельзя было бы отличить «не сохранилось всё» от «не сохранился продукт».
    const asOutcome = <T>(src: Observable<T>): Observable<unknown> =>
      src.pipe(map(() => null as unknown), catchError((e: unknown) => of(e)));

    forkJoin({
      startup: asOutcome(this.svc.updateStartup({
        startup_id:          this.id,
        name:                v.name!,
        public_email:        v.publicEmail!,
        short_description:   v.shortDescription ?? '',
        description:         v.description ?? '',
        url:                 v.url ?? '',
        // Флаг «стартап остановлен» этой формой не управляется — передаём как есть,
        // иначе любое сохранение молча снимало бы остановку.
        is_stopped:          this.startup?.isStopped ?? false,
        stage:               this.selectedStage(),
        social_media_links:  splitCsv(v.socialLinks),
        location:            this.selectedLocation(),
        billing_email:       v.billingEmail ?? '',
        avatar_url:          this.selectedAvatarId() ?? undefined,
        tam:                 parseDecimal(v.tam),
        sam:                 parseDecimal(v.sam),
        som:                 parseDecimal(v.som),
        market_growth_rate:  parseDecimal(v.marketGrowthRate),
        has_patents:         v.hasPatents ?? false,
        industry:            INDUSTRY_NUM[this.selectedIndustry()],
        target_round_amount: parseDecimal(v.targetRoundAmount),
        has_strategic_partnerships: v.hasStrategicPartnerships ?? false,
      })),
      product: asOutcome(this.productSvc.updateProduct({
        startup_id:        this.id,
        problem:           v.productProblem   || undefined,
        solution:          v.productSolution!,
        stack:             splitCsv(v.stack),
        value_proposition: v.valueProposition || undefined,
        differentiators:   v.differentiators  || undefined,
      })),
    }).subscribe(({ startup, product }) => {
      this.saving.set(false);

      // Сохранение идёт двумя запросами, поэтому и результат может быть частичным. Базовую линию
      // не двигаем, пока не легли оба: форма остаётся «грязной», чтобы можно было повторить.
      const startupMsg = startup ? apiErrorMessage(startup, 'неизвестная ошибка') : null;
      const productMsg = product ? apiErrorMessage(product, 'неизвестная ошибка') : null;

      if (startupMsg && productMsg) {
        this.error.set(`Не удалось сохранить изменения: ${startupMsg} ${productMsg}`);
        return;
      }
      if (startupMsg) {
        this.error.set(
          `Карточка продукта сохранена, а основные данные — нет: ${startupMsg}`
        );
        return;
      }
      if (productMsg) {
        this.warning.set(
          `Основные данные сохранены, а карточку продукта сохранить не удалось: ${productMsg}`
        );
        return;
      }

      this.baseline.set(this.current());
      this.saveSuccess.set(true);
      if (exit) { this.leave(); return; }
      setTimeout(() => this.saveSuccess.set(false), 3000);
    });
  }

  private leave(): void {
    this.router.navigate(['/dashboard/my-startups']);
  }
}

function numToField(value: number | null | undefined): string {
  return value != null ? String(value) : '';
}
