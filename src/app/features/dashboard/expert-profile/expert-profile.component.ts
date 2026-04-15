import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ExpertProfileService } from '../../experts/expert-profile.service';
import { ExpertExperienceService } from '../../experts/expert-experience.service';
import {
  ExpertProfile, ExpertSpecialization,
} from '../../../shared/models/expert-profile.model';
import { ExpertExperience } from '../../../shared/models/expert-experience.model';
import { SPEC_NUM } from '../../../shared/models/dto/expert-profile.dto';
import { ALL_SPECIALIZATIONS, getSpecializationLabel, formatExperienceRange } from '../../../shared/utils/expert.utils';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { optimisticDelete } from '../../../shared/utils/optimistic.utils';

@Component({
  selector: 'app-dashboard-expert-profile',
  standalone: true,
  imports: [ReactiveFormsModule, SkeletonComponent],
  templateUrl: './expert-profile.component.html',
  styleUrl: './expert-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardExpertProfileComponent implements OnInit {
  private readonly fb            = inject(FormBuilder);
  private readonly title         = inject(Title);
  private readonly auth          = inject(AuthService);
  private readonly profileSvc    = inject(ExpertProfileService);
  private readonly experienceSvc = inject(ExpertExperienceService);

  readonly loading       = signal(true);
  readonly saving        = signal(false);
  readonly saveSuccess   = signal(false);
  readonly saveError     = signal<string | null>(null);

  readonly profile       = signal<ExpertProfile | null>(null);
  readonly experiences   = signal<ExpertExperience[]>([]);

  readonly isPublic                  = signal(true);
  readonly selectedSpecializations   = signal<Set<ExpertSpecialization>>(new Set());

  readonly showAddExp        = signal(false);
  readonly editingExpId      = signal<string | null>(null);
  readonly expSaving         = signal(false);
  readonly expError          = signal<string | null>(null);

  readonly specializations   = ALL_SPECIALIZATIONS;

  readonly profileForm = this.fb.group({
    displayName: ['', [Validators.required, Validators.maxLength(200)]],
    bio:         ['', [Validators.maxLength(2000)]],
    website:     ['', [Validators.maxLength(500)]],
    linkedInUrl: ['', [Validators.maxLength(500)]],
    twitterUrl:  ['', [Validators.maxLength(500)]],
    gitHubUrl:   ['', [Validators.maxLength(500)]],
    telegramUrl: ['', [Validators.maxLength(500)]],
  });

  readonly expForm = this.fb.group({
    company:     ['', [Validators.required, Validators.maxLength(200)]],
    position:    ['', [Validators.required, Validators.maxLength(200)]],
    startDate:   ['', [Validators.required]],
    endDate:     [''],
    description: ['', [Validators.maxLength(1000)]],
  });

  ngOnInit(): void {
    this.title.setTitle('Профиль эксперта — DevStart');
    const user = this.auth.user();
    if (!user) { this.loading.set(false); return; }

    this.profileSvc.getById(user.id).pipe(catchError(() => of(null))).subscribe(profile => {
      if (profile) {
        this.profile.set(profile);
        this.isPublic.set(profile.isPublic);
        this.selectedSpecializations.set(new Set(profile.specializations));
        this.profileForm.patchValue({
          displayName: profile.displayName,
          bio:         profile.bio         ?? '',
          website:     profile.website     ?? '',
          linkedInUrl: profile.linkedInUrl ?? '',
          twitterUrl:  profile.twitterUrl  ?? '',
          gitHubUrl:   profile.gitHubUrl   ?? '',
          telegramUrl: profile.telegramUrl ?? '',
        });
        this.loadExperiences(profile.id);
      } else {
        this.loading.set(false);
      }
    });
  }

  private loadExperiences(profileId: string): void {
    this.experienceSvc.getByExpertProfileId(profileId)
      .pipe(catchError(() => of([])))
      .subscribe(list => {
        this.experiences.set(list);
        this.loading.set(false);
      });
  }

  toggleSpecialization(spec: ExpertSpecialization): void {
    this.selectedSpecializations.update(current => {
      const next = new Set(current);
      next.has(spec) ? next.delete(spec) : next.add(spec);
      return next;
    });
  }

  isSpecSelected(spec: ExpertSpecialization): boolean {
    return this.selectedSpecializations().has(spec);
  }

  fieldError(form: 'profile' | 'exp', name: string): string | null {
    const ctrl = form === 'profile' ? this.profileForm.get(name) : this.expForm.get(name);
    if (!ctrl?.touched || !ctrl.invalid) return null;
    if (ctrl.hasError('required'))  return 'Обязательное поле';
    if (ctrl.hasError('maxlength')) return `Максимум ${ctrl.errors?.['maxlength']?.requiredLength} символов`;
    return null;
  }

  saveProfile(): void {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    if (this.selectedSpecializations().size === 0) {
      this.saveError.set('Выберите хотя бы одну специализацию');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);

    const v = this.profileForm.getRawValue();
    const body = {
      display_name:    v.displayName!.trim(),
      bio:             v.bio?.trim()         || undefined,
      website:         v.website?.trim()     || undefined,
      linkedin_url:    v.linkedInUrl?.trim() || undefined,
      twitter_url:     v.twitterUrl?.trim()  || undefined,
      github_url:      v.gitHubUrl?.trim()   || undefined,
      telegram_url:    v.telegramUrl?.trim() || undefined,
      is_public:       this.isPublic(),
      specializations: Array.from(this.selectedSpecializations()).map(s => SPEC_NUM[s]),
    };

    const onSuccess = () => {
      this.saving.set(false);
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 3000);
      const user = this.auth.user();
      if (user) {
        this.profileSvc.getById(user.id).subscribe(p => this.profile.set(p));
      }
    };
    const onError = () => {
      this.saving.set(false);
      this.saveError.set('Не удалось сохранить профиль. Попробуйте снова.');
    };

    if (this.profile()) {
      this.profileSvc.update(body).subscribe({ next: onSuccess, error: onError });
    } else {
      this.profileSvc.create(body).subscribe({ next: onSuccess, error: onError });
    }
  }

  toggleAddExp(): void {
    this.editingExpId.set(null);
    this.expForm.reset();
    this.expError.set(null);
    this.showAddExp.update(v => !v);
  }

  startEditExp(exp: ExpertExperience): void {
    this.showAddExp.set(false);
    this.editingExpId.set(exp.id);
    this.expError.set(null);
    this.expForm.setValue({
      company:     exp.company,
      position:    exp.position,
      startDate:   exp.startDate.slice(0, 10),
      endDate:     exp.endDate ? exp.endDate.slice(0, 10) : '',
      description: exp.description ?? '',
    });
  }

  cancelExpEdit(): void {
    this.editingExpId.set(null);
    this.expForm.reset();
    this.expError.set(null);
  }

  saveExp(): void {
    if (this.expForm.invalid) { this.expForm.markAllAsTouched(); return; }
    const profile = this.profile();
    if (!profile) {
      this.expError.set('Сначала создайте профиль эксперта');
      return;
    }
    const v = this.expForm.getRawValue();
    if (v.endDate && v.endDate < v.startDate!) {
      this.expError.set('Дата окончания должна быть позже даты начала');
      return;
    }

    this.expSaving.set(true);
    this.expError.set(null);

    const editingId = this.editingExpId();

    const reloadAndClose = () => {
      this.expSaving.set(false);
      this.showAddExp.set(false);
      this.editingExpId.set(null);
      this.expForm.reset();
      this.loadExperiences(profile.id);
    };
    const onError = () => {
      this.expSaving.set(false);
      this.expError.set('Не удалось сохранить опыт работы.');
    };

    if (editingId) {
      this.experienceSvc.update({
        id:          editingId,
        company:     v.company!.trim(),
        position:    v.position!.trim(),
        start_date:  v.startDate!,
        end_date:    v.endDate || undefined,
        description: v.description?.trim() || undefined,
      }).subscribe({ next: reloadAndClose, error: onError });
    } else {
      this.experienceSvc.create({
        expert_profile_id: profile.id,
        company:           v.company!.trim(),
        position:          v.position!.trim(),
        start_date:        v.startDate!,
        end_date:          v.endDate || undefined,
        description:       v.description?.trim() || undefined,
      }).subscribe({ next: reloadAndClose, error: onError });
    }
  }

  removeExp(exp: ExpertExperience): void {
    const profile = this.profile();
    if (!profile) return;
    optimisticDelete(
      this.experiences,
      e => e.id === exp.id,
      this.experienceSvc.delete(exp.id),
      () => this.loadExperiences(profile.id),
    );
  }

  protected readonly getSpecializationLabel = getSpecializationLabel;
  protected readonly formatExperienceRange  = formatExperienceRange;
}
