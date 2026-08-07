import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { StartupService } from '../startup.service';
import { AvatarUploadComponent } from '../../../shared/components/avatar-upload/avatar-upload.component';
import { StartupIndustry } from '../../../shared/models/startup.model';
import { INDUSTRY_NUM } from '../../../shared/models/dto/startup.dto';
import { apiErrorMessage } from '../../../core/http/api-error';

type StageOption    = { label: string; value: number };
type LocationOption = { label: string; value: number };
type IndustryOption = { label: string; value: StartupIndustry };
type WizardStep     = { label: string; controls: readonly string[] };

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
  { label: 'Другая',      value: 'Other' },
  { label: 'SaaS',        value: 'Saas' },
  { label: 'Финтех',      value: 'Fintech' },
  { label: 'AI',          value: 'Ai' },
  { label: 'E-commerce',  value: 'Ecommerce' },
  { label: 'Маркетплейс', value: 'Marketplace' },
  { label: 'Железо',      value: 'Hardware' },
  { label: 'Биотех',      value: 'Biotech' },
  { label: 'EdTech',      value: 'Edtech' },
];

const STEPS: WizardStep[] = [
  { label: 'Основное', controls: ['name', 'shortDesc', 'description'] },
  { label: 'Продукт',  controls: ['problem', 'solution', 'valueProposition', 'differentiators', 'stack'] },
  { label: 'Рынок',    controls: ['tam', 'sam', 'som', 'marketGrowthRate', 'targetRoundAmount'] },
  { label: 'Контакты', controls: ['publicEmail', 'billingEmail', 'url', 'socialLinks'] },
  { label: 'Проверка', controls: [] },
];

/** Шаги, которые можно проскочить целиком: ни одно поле в них не обязательно. */
const OPTIONAL_STEPS: readonly number[] = [2];

const DRAFT_KEY     = 'devstart_startup_draft';
// v2: «Название продукта» ушло (в домене его нет), появились Проблема/Решение и шаг «Рынок».
const DRAFT_VERSION = 2;

type StartupDraftField =
  | 'name' | 'shortDesc' | 'description'
  | 'publicEmail' | 'billingEmail' | 'url' | 'socialLinks'
  | 'problem' | 'solution' | 'valueProposition' | 'differentiators' | 'stack'
  | 'tam' | 'sam' | 'som' | 'marketGrowthRate' | 'targetRoundAmount';

type StartupDraftForm =
  Partial<Record<StartupDraftField, string | null>>
  & Partial<Record<'hasPatents' | 'hasStrategicPartnerships', boolean | null>>;

interface StartupDraft {
  version: number;
  step: number;
  stage: number;
  location: number | null;
  industry: StartupIndustry;
  avatarId: string | null;
  form: StartupDraftForm;
}

const EMPTY_FORM: StartupDraftForm = {
  name: '', shortDesc: '', description: '',
  publicEmail: '', billingEmail: '', url: '', socialLinks: '',
  problem: '', solution: '', valueProposition: '', differentiators: '', stack: '',
  tam: '', sam: '', som: '', marketGrowthRate: '', targetRoundAmount: '',
  hasPatents: false, hasStrategicPartnerships: false,
};

@Component({
  selector: 'app-startup-create',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AvatarUploadComponent],
  templateUrl: './startup-create.component.html',
  styleUrl:    './startup-create.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartupCreateComponent {
  private readonly fb      = inject(FormBuilder);
  private readonly svc     = inject(StartupService);
  private readonly auth    = inject(AuthService);
  private readonly router  = inject(Router);
  private readonly title   = inject(Title);

  readonly stages     = STAGES;
  readonly locations  = LOCATIONS;
  readonly industries = INDUSTRIES;
  readonly steps      = STEPS;

  readonly step       = signal(0);
  readonly maxVisited = signal(0);

  readonly selectedStage    = signal<number>(0);
  readonly selectedLocation = signal<number | null>(null);
  readonly selectedIndustry = signal<StartupIndustry>('Other');
  readonly selectedAvatarId = signal<string | null>(null);
  readonly loading          = signal(false);
  readonly error            = signal<string | null>(null);
  readonly draftRestored    = signal(false);

  readonly isLastStep = computed(() => this.step() === STEPS.length - 1);
  readonly stageLabel = computed(() => STAGES[this.selectedStage()]?.label ?? '—');
  readonly locationLabel = computed(() => {
    const i = this.selectedLocation();
    return i === null ? '—' : LOCATIONS[i]?.label ?? '—';
  });
  readonly industryLabel = computed(
    () => INDUSTRIES.find(i => i.value === this.selectedIndustry())?.label ?? '—'
  );

  readonly form = this.fb.group({
    name:        ['', [Validators.required, Validators.minLength(2)]],
    shortDesc:   ['', [Validators.required]],
    description: [''],
    // Контакты
    publicEmail:   ['', [Validators.required, Validators.email]],
    billingEmail:  ['', [Validators.email]],
    url:           [''],
    socialLinks:   [''],
    // Продукт — обязательно только «Решение»: остальное поднимает балл, но не должно
    // задерживать публикацию (см. CreateStartupCommandValidator на бэкенде).
    problem:             [''],
    solution:            ['', [Validators.required]],
    valueProposition:    [''],
    differentiators:     [''],
    stack:               [''],
    // Рынок — шаг целиком необязательный
    tam:               ['', [Validators.min(0)]],
    sam:               ['', [Validators.min(0)]],
    som:               ['', [Validators.min(0)]],
    marketGrowthRate:  ['', [Validators.min(0), Validators.max(1000)]],
    targetRoundAmount: ['', [Validators.min(0)]],
    hasPatents:               [false],
    hasStrategicPartnerships: [false],
  });

  // Сводка для шага «Проверка»: читается после клика по шагу, значения на превью не меняются
  get v(): StartupDraftForm { return this.form.getRawValue() as StartupDraftForm; }

  constructor() {
    this.title.setTitle('Новый стартап — DevStart');
    this.restoreDraft();
    this.form.valueChanges
      .pipe(debounceTime(400), takeUntilDestroyed())
      .subscribe(() => this.saveDraft());
  }

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

  isOptionalStep(i: number): boolean { return OPTIONAL_STEPS.includes(i); }

  setStage(index: number): void    { this.selectedStage.set(index); this.saveDraft(); }
  setLocation(index: number): void { this.selectedLocation.set(index); this.saveDraft(); }
  setIndustry(value: StartupIndustry): void { this.selectedIndustry.set(value); this.saveDraft(); }
  setAvatar(id: string | null): void { this.selectedAvatarId.set(id); this.saveDraft(); }

  isStepValid(i: number): boolean {
    return STEPS[i].controls.every(name => !this.form.get(name)?.invalid);
  }

  isStepDone(i: number): boolean {
    return i < this.step() && this.isStepValid(i);
  }

  next(): void {
    const i = this.step();
    if (!this.isStepValid(i)) { this.touchStep(i); return; }
    if (i < STEPS.length - 1) {
      this.step.set(i + 1);
      this.maxVisited.set(Math.max(this.maxVisited(), i + 1));
      this.saveDraft();
    }
  }

  back(): void {
    if (this.step() > 0) {
      this.step.set(this.step() - 1);
      this.saveDraft();
    }
  }

  goTo(target: number): void {
    if (target === this.step() || target > this.maxVisited()) return;
    if (target > this.step()) {
      // Вперёд по уже посещённым шагам — только через валидные промежуточные
      for (let i = this.step(); i < target; i++) {
        if (!this.isStepValid(i)) {
          this.touchStep(i);
          this.step.set(i);
          this.saveDraft();
          return;
        }
      }
    }
    this.step.set(target);
    this.saveDraft();
  }

  submit(): void {
    // Enter в инпуте отправляет форму — до последнего шага трактуем как «Далее»
    if (!this.isLastStep()) { this.next(); return; }

    if (this.form.invalid) {
      const firstInvalid = STEPS.findIndex((_, i) => !this.isStepValid(i));
      if (firstInvalid !== -1) { this.step.set(firstInvalid); this.touchStep(firstInvalid); }
      return;
    }

    const user = this.auth.user();
    if (!user) return;

    const v = this.form.getRawValue();
    const splitCsv = (s: string | null) =>
      (s ?? '').split(',').map(x => x.trim()).filter(Boolean);
    const parseDecimal = (s: string | null) => {
      const n = parseFloat(s ?? '');
      return isNaN(n) ? undefined : n;
    };

    this.loading.set(true);
    this.error.set(null);

    this.svc.createStartup({
      user_id:                  user.id,
      name:                     v.name!,
      public_email:             v.publicEmail!,
      short_description:        v.shortDesc ?? '',
      description:              v.description ?? '',
      url:                      v.url ?? '',
      is_stopped:               false,
      stage:                    this.selectedStage(),
      social_media_links:       splitCsv(v.socialLinks),
      location:                 this.selectedLocation() ?? 0,
      billing_email:            v.billingEmail ?? '',
      avatar_id:                this.selectedAvatarId() ?? undefined,
      product_problem:          v.problem || undefined,
      product_solution:         v.solution!,
      stack:                    splitCsv(v.stack),
      product_value_proposition: v.valueProposition || undefined,
      product_differentiators:   v.differentiators  || undefined,
      tam:                      parseDecimal(v.tam),
      sam:                      parseDecimal(v.sam),
      som:                      parseDecimal(v.som),
      market_growth_rate:       parseDecimal(v.marketGrowthRate),
      has_patents:              v.hasPatents ?? false,
      industry:                 INDUSTRY_NUM[this.selectedIndustry()],
      target_round_amount:      parseDecimal(v.targetRoundAmount),
      has_strategic_partnerships: v.hasStrategicPartnerships ?? false,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.clearDraft();
        this.router.navigate(['/dashboard/my-startups']);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Ошибка при создании стартапа. Попробуйте снова.'));
      },
    });
  }

  resetDraft(): void {
    this.clearDraft();
    this.form.reset(EMPTY_FORM);
    this.selectedStage.set(0);
    this.selectedLocation.set(null);
    this.selectedIndustry.set('Other');
    this.selectedAvatarId.set(null);
    this.step.set(0);
    this.maxVisited.set(0);
    this.draftRestored.set(false);
    this.error.set(null);
  }

  private touchStep(i: number): void {
    for (const name of STEPS[i].controls) this.form.get(name)?.markAsTouched();
  }

  private saveDraft(): void {
    const draft: StartupDraft = {
      version:  DRAFT_VERSION,
      step:     this.step(),
      stage:    this.selectedStage(),
      location: this.selectedLocation(),
      industry: this.selectedIndustry(),
      avatarId: this.selectedAvatarId(),
      form:     this.form.getRawValue() as StartupDraftForm,
    };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* квота или приватный режим */ }
  }

  private clearDraft(): void {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
  }

  private restoreDraft(): void {
    let draft: StartupDraft | null = null;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      draft = raw ? JSON.parse(raw) as StartupDraft : null;
    } catch { return; }
    // Черновик прошлой версии не мигрируем: поля переехали, а не переименовались.
    if (!draft || draft.version !== DRAFT_VERSION) { this.clearDraft(); return; }

    this.form.patchValue(draft.form ?? {});
    this.selectedStage.set(draft.stage ?? 0);
    this.selectedLocation.set(draft.location ?? null);
    this.selectedIndustry.set(draft.industry ?? 'Other');
    this.selectedAvatarId.set(draft.avatarId ?? null);

    const step = Math.min(Math.max(draft.step ?? 0, 0), STEPS.length - 1);
    this.step.set(step);
    this.maxVisited.set(step);

    const hasContent = Object.values(draft.form ?? {}).some(Boolean) || !!draft.avatarId;
    this.draftRestored.set(hasContent);
  }
}
