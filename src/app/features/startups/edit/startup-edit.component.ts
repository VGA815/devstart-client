import { Component, ChangeDetectionStrategy, inject, signal, Input, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StartupService } from '../startup.service';
import { AvatarUploadComponent } from '../../../shared/components/avatar-upload/avatar-upload.component';
import { StartupProductService } from '../startup-product.service';
import { Startup, StartupStage, StartupLocation } from '../../../shared/models/startup.model';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';

type StageOption   = { label: string; value: number };
type LocationOption = { label: string; value: number };

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

const STAGE_TO_NUM: Record<StartupStage, number> = {
  Idea: 0, PreSeed: 1, Mvp: 2, Seed: 3, SeriesA: 4,
};

const LOCATION_TO_NUM: Record<string, number> = {
  Russia: 0, USA: 1, China: 2, India: 3, Other: 4,
};

@Component({
  selector: 'app-startup-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SkeletonComponent, AvatarUploadComponent],
  templateUrl: './startup-edit.component.html',
  styleUrl:    './startup-edit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartupEditComponent implements OnInit {
  @Input() id!: string;

  private readonly fb          = inject(FormBuilder);
  private readonly svc         = inject(StartupService);
  private readonly productSvc  = inject(StartupProductService);
  private readonly router      = inject(Router);
  private readonly title       = inject(Title);

  readonly stages    = STAGES;
  readonly locations = LOCATIONS;

  readonly pageLoading   = signal(true);
  readonly saving        = signal(false);
  readonly error         = signal<string | null>(null);
  readonly saveSuccess   = signal(false);

  readonly selectedStage    = signal<number>(0);
  readonly selectedLocation = signal<number>(0);
  readonly selectedAvatarId = signal<string | null>(null);

  private startup: Startup | null = null;

  readonly form = this.fb.group({
    name:             ['', [Validators.required, Validators.minLength(2)]],
    shortDescription: [''],
    description:      [''],

    publicEmail:  ['', [Validators.required, Validators.email]],
    billingEmail: [''],
    url:          [''],
    socialLinks:  [''],

    productProblem:      [''],
    productSolution:     ['', [Validators.required]],
    valueProposition:    [''],
    differentiators:     [''],
    stack:               [''],

    tam: [''],
    sam: [''],
    som: [''],
    marketGrowthRate: [''],

    hasPatents: [false],
  });

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
        this.form.patchValue({
          name:             startup.name,
          shortDescription: startup.shortDescription ?? '',
          description:      startup.description ?? '',
          publicEmail:      startup.publicEmail,
          billingEmail:     startup.billingEmail ?? '',
          url:              startup.url ?? '',
          socialLinks:      (startup.socialMediaLinks ?? []).join(', '),
          tam:              startup.tam != null ? String(startup.tam) : '',
          sam:              startup.sam != null ? String(startup.sam) : '',
          som:              startup.som != null ? String(startup.som) : '',
          marketGrowthRate: startup.marketGrowthRate != null ? String(startup.marketGrowthRate) : '',
          hasPatents:       startup.hasPatents,
          ...(product ? {
            productProblem:   product.problem ?? '',
            productSolution:  product.solution,
            valueProposition: product.valueProposition ?? '',
            differentiators:  product.differentiators ?? '',
            stack:            (product.stack ?? []).join(', '),
          } : {}),
        });
        this.pageLoading.set(false);
      },
      error: () => {
        this.error.set('Не удалось загрузить данные стартапа.');
        this.pageLoading.set(false);
      },
    });
  }

  setStage(index: number):    void { this.selectedStage.set(index); }
  setLocation(index: number): void { this.selectedLocation.set(index); }

  fieldError(name: string): string | null {
    const c = this.form.get(name);
    if (!c?.touched || !c.invalid) return null;
    if (c.hasError('required'))  return 'Обязательное поле';
    if (c.hasError('email'))     return 'Некорректный email';
    if (c.hasError('minlength')) return `Минимум ${c.errors?.['minlength']?.requiredLength} символов`;
    return null;
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const v = this.form.getRawValue();
    const splitCsv = (s: string | null) =>
      (s ?? '').split(',').map(x => x.trim()).filter(Boolean);

    this.saving.set(true);
    this.error.set(null);

    const parseDecimal = (s: string | null) => {
      const n = parseFloat(s ?? '');
      return isNaN(n) ? undefined : n;
    };

    forkJoin({
      startup: this.svc.updateStartup({
        startup_id:          this.id,
        name:                v.name!,
        public_email:        v.publicEmail!,
        short_description:   v.shortDescription ?? '',
        description:         v.description ?? '',
        url:                 v.url ?? '',
        is_stopped:          false,
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
      }),
      product: this.productSvc.updateProduct({
        startup_id:           this.id,
        problem:              v.productProblem || undefined,
        solution:             v.productSolution!,
        stack:                splitCsv(v.stack),
        value_proposition:    v.valueProposition || undefined,
        differentiators:      v.differentiators  || undefined,
      }).pipe(catchError(() => of(null))),
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        setTimeout(() => {
          this.saveSuccess.set(false);
          this.router.navigate(['/dashboard/my-startups']);
        }, 1200);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Не удалось сохранить изменения. Попробуйте снова.');
      },
    });
  }
}
