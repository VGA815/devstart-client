import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { StartupService } from '../startup.service';
import { AvatarUploadComponent } from '../../../shared/components/avatar-upload/avatar-upload.component';

type StageOption    = { label: string; value: number };
type LocationOption = { label: string; value: number };
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

const STEPS: WizardStep[] = [
  { label: 'Основное', controls: ['name', 'shortDesc', 'description'] },
  { label: 'Продукт',  controls: ['productName', 'problemSolution', 'valueProposition', 'differentiators', 'stack'] },
  { label: 'Контакты', controls: ['publicEmail', 'billingEmail', 'url', 'socialLinks'] },
  { label: 'Проверка', controls: [] },
];

const DRAFT_KEY     = 'devstart_startup_draft';
const DRAFT_VERSION = 1;

type StartupDraftForm = Partial<Record<
  'name' | 'shortDesc' | 'description'
  | 'publicEmail' | 'billingEmail' | 'url' | 'socialLinks'
  | 'productName' | 'problemSolution' | 'valueProposition' | 'differentiators' | 'stack',
  string | null
>>;

interface StartupDraft {
  version: number;
  step: number;
  stage: number;
  location: number | null;
  avatarId: string | null;
  form: StartupDraftForm;
}

const EMPTY_FORM: StartupDraftForm = {
  name: '', shortDesc: '', description: '',
  publicEmail: '', billingEmail: '', url: '', socialLinks: '',
  productName: '', problemSolution: '', valueProposition: '', differentiators: '', stack: '',
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

  readonly stages    = STAGES;
  readonly locations = LOCATIONS;
  readonly steps     = STEPS;

  readonly step       = signal(0);
  readonly maxVisited = signal(0);

  readonly selectedStage    = signal<number>(0);
  readonly selectedLocation = signal<number | null>(null);
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

  readonly form = this.fb.group({
    name:        ['', [Validators.required, Validators.minLength(2)]],
    shortDesc:   ['', [Validators.required]],
    description: [''],
    // Contacts
    publicEmail:   ['', [Validators.required, Validators.email]],
    billingEmail:  [''],
    url:           [''],
    socialLinks:   [''],
    // Product
    productName:         ['', [Validators.required]],
    problemSolution:     ['', [Validators.required]],
    valueProposition:    [''],
    differentiators:     [''],
    stack:               [''],
  });

  // Сводка для шага «Проверка»: читается после клика по шагу, значения на превью не меняются
  get v(): StartupDraftForm { return this.form.getRawValue(); }

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
    return null;
  }

  setStage(index: number): void    { this.selectedStage.set(index); this.saveDraft(); }
  setLocation(index: number): void { this.selectedLocation.set(index); this.saveDraft(); }
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
      social_media_links:       v.socialLinks ? v.socialLinks.split(',').map(s => s.trim()).filter(Boolean) : [],
      location:                 this.selectedLocation() ?? 0,
      billing_email:            v.billingEmail ?? '',
      avatar_id:                this.selectedAvatarId() ?? undefined,
      product_name:             v.productName!,
      product_problem_solution: v.problemSolution!,
      stack:                    v.stack ? v.stack.split(',').map(s => s.trim()).filter(Boolean) : [],
      product_value_proposition: v.valueProposition ?? '',
      product_differentiators:   v.differentiators ?? '',
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.clearDraft();
        this.router.navigate(['/dashboard/my-startups']);
      },
      error: () => { this.loading.set(false); this.error.set('Ошибка при создании стартапа. Попробуйте снова.'); },
    });
  }

  resetDraft(): void {
    this.clearDraft();
    this.form.reset(EMPTY_FORM);
    this.selectedStage.set(0);
    this.selectedLocation.set(null);
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
      avatarId: this.selectedAvatarId(),
      form:     this.form.getRawValue(),
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
    if (!draft || draft.version !== DRAFT_VERSION) return;

    this.form.patchValue(draft.form ?? {});
    this.selectedStage.set(draft.stage ?? 0);
    this.selectedLocation.set(draft.location ?? null);
    this.selectedAvatarId.set(draft.avatarId ?? null);

    const step = Math.min(Math.max(draft.step ?? 0, 0), STEPS.length - 1);
    this.step.set(step);
    this.maxVisited.set(step);

    const hasContent = Object.values(draft.form ?? {}).some(Boolean) || !!draft.avatarId;
    this.draftRestored.set(hasContent);
  }
}
