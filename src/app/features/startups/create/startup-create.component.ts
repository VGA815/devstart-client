import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../../core/auth/auth.service';
import { StartupService } from '../startup.service';
import { AvatarUploadComponent } from '../../../shared/components/avatar-upload/avatar-upload.component';

type StageOption  = { label: string; value: number };
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

  readonly selectedStage    = signal<number>(0);
  readonly selectedLocation = signal<number | null>(null);
  readonly selectedAvatarId = signal<string | null>(null);
  readonly loading          = signal(false);
  readonly error            = signal<string | null>(null);

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

  constructor() {
    this.title.setTitle('Новый стартап — DevStart');
  }

  fieldError(name: string): string | null {
    const c = this.form.get(name);
    if (!c?.touched || !c.invalid) return null;
    if (c.hasError('required'))  return 'Обязательное поле';
    if (c.hasError('email'))     return 'Некорректный email';
    if (c.hasError('minlength')) return `Минимум ${c.errors?.['minlength']?.requiredLength} символов`;
    return null;
  }

  setStage(index: number): void    { this.selectedStage.set(index); }
  setLocation(index: number): void { this.selectedLocation.set(index); }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

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
      next: () => { this.loading.set(false); this.router.navigate(['/dashboard/my-startups']); },
      error: () => { this.loading.set(false); this.error.set('Ошибка при создании стартапа. Попробуйте снова.'); },
    });
  }
}
