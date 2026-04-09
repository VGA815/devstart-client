import { Component, ChangeDetectionStrategy, Input, inject, OnInit, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ExpertProfileService } from '../expert-profile.service';
import { ExpertExperienceService } from '../expert-experience.service';
import { ExpertCollaborationRequestService } from '../expert-collaboration-request.service';
import { AuthService } from '../../../core/auth/auth.service';
import { StartupService } from '../../startups/startup.service';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { ExpertProfile } from '../../../shared/models/expert-profile.model';
import { ExpertExperience } from '../../../shared/models/expert-experience.model';
import { Startup } from '../../../shared/models/startup.model';
import { CollaborationType } from '../../../shared/models/expert-collaboration-request.model';
import { TYPE_NUM } from '../../../shared/models/dto/expert-collaboration-request.dto';
import {
  formatExperienceRange, getSpecializationLabel,
  ALL_COLLABORATION_TYPES, getCollaborationTypeLabel,
} from '../../../shared/utils/expert.utils';

@Component({
  selector: 'app-expert-detail',
  standalone: true,
  imports: [AvatarComponent, SkeletonComponent, ReactiveFormsModule],
  templateUrl: './expert-detail.component.html',
  styleUrl: './expert-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpertDetailComponent implements OnInit {
  @Input() id!: string;

  private readonly titleSvc      = inject(Title);
  private readonly fb            = inject(FormBuilder);
  private readonly auth          = inject(AuthService);
  private readonly profileSvc    = inject(ExpertProfileService);
  private readonly experienceSvc = inject(ExpertExperienceService);
  private readonly collabSvc     = inject(ExpertCollaborationRequestService);
  private readonly startupSvc    = inject(StartupService);

  readonly expert      = signal<ExpertProfile | null>(null);
  readonly experiences = signal<ExpertExperience[]>([]);
  readonly loading     = signal(true);
  readonly notFound    = signal(false);

  readonly inviteOpen     = signal(false);
  readonly myStartups     = signal<Startup[]>([]);
  readonly inviteSending  = signal(false);
  readonly inviteSuccess  = signal(false);
  readonly inviteError    = signal<string | null>(null);

  readonly collabTypes = ALL_COLLABORATION_TYPES;

  readonly inviteForm = this.fb.group({
    startupId:        ['', [Validators.required]],
    collaborationType:['Advisor' as CollaborationType, [Validators.required]],
    hoursPerWeek:     [null as number | null, [Validators.min(1), Validators.max(168)]],
    rate:             [null as number | null, [Validators.min(1)]],
    message:          ['', [Validators.maxLength(2000)]],
  });

  readonly isSelf = signal(false);

  ngOnInit(): void {
    const user = this.auth.user();
    if (user && user.id === this.id) {
      this.isSelf.set(true);
    }

    this.profileSvc.getById(this.id).pipe(catchError(() => of(null))).subscribe(profile => {
      if (!profile) {
        this.notFound.set(true);
        this.titleSvc.setTitle('Эксперт не найден — DevStart');
        this.loading.set(false);
        return;
      }
      this.expert.set(profile);
      this.titleSvc.setTitle(`${profile.displayName} — DevStart`);

      this.experienceSvc.getByExpertProfileId(profile.id)
        .pipe(catchError(() => of([])))
        .subscribe(list => {
          this.experiences.set(list);
          this.loading.set(false);
        });
    });
  }

  socialLinks(p: ExpertProfile): { label: string; url: string }[] {
    const links: { label: string; url: string }[] = [];
    if (p.linkedInUrl) links.push({ label: 'LinkedIn', url: p.linkedInUrl });
    if (p.twitterUrl)  links.push({ label: 'Twitter',  url: p.twitterUrl  });
    if (p.gitHubUrl)   links.push({ label: 'GitHub',   url: p.gitHubUrl   });
    if (p.telegramUrl) links.push({ label: 'Telegram', url: p.telegramUrl });
    return links;
  }


  openInvite(): void {
    this.inviteError.set(null);
    this.inviteSuccess.set(false);
    const user = this.auth.user();
    if (!user) {
      this.inviteError.set('Войдите, чтобы отправить заявку');
      this.inviteOpen.set(true);
      return;
    }
    if (this.myStartups().length === 0) {
      this.startupSvc.getStartupsByProfile(user.id)
        .pipe(catchError(() => of([] as Startup[])))
        .subscribe(list => this.myStartups.set(list));
    }
    this.inviteOpen.set(true);
  }

  closeInvite(): void {
    this.inviteOpen.set(false);
    this.inviteForm.reset({
      startupId: '',
      collaborationType: 'Advisor',
      hoursPerWeek: null,
      rate: null,
      message: '',
    });
    this.inviteError.set(null);
  }

  submitInvite(): void {
    if (this.inviteForm.invalid) { this.inviteForm.markAllAsTouched(); return; }
    const v = this.inviteForm.getRawValue();
    this.inviteSending.set(true);
    this.inviteError.set(null);

    this.collabSvc.create({
      startup_id:               v.startupId!,
      collaboration_type:       TYPE_NUM[v.collaborationType as CollaborationType],
      message:                  v.message?.trim() || undefined,
      proposed_hours_per_week:  v.hoursPerWeek ?? undefined,
      proposed_rate:            v.rate ?? undefined,
    }).subscribe({
      next: () => {
        this.inviteSending.set(false);
        this.inviteSuccess.set(true);
        setTimeout(() => this.closeInvite(), 1500);
      },
      error: err => {
        this.inviteSending.set(false);
        const code = err?.error?.code ?? err?.error?.error?.code ?? '';
        this.inviteError.set(this.resolveErrorMessage(code, err?.status));
      },
    });
  }

  private resolveErrorMessage(code: string, status?: number): string {
    switch (code) {
      case 'ExpertCollaborationRequests.AlreadyExistsForStartup':
        return 'Активная заявка для этого стартапа уже есть.';
      case 'ExpertCollaborationRequests.ExpertProfileRequired':
        return 'У вас ещё нет профиля эксперта. Создайте его в дашборде.';
      case 'ExpertCollaborationRequests.CannotApplyToOwnStartup':
        return 'Нельзя отправить заявку в свой собственный стартап.';
      case 'ExpertCollaborationRequests.InvalidProposedHours':
        return 'Часы в неделю должны быть от 1 до 168.';
      case 'ExpertCollaborationRequests.InvalidProposedRate':
        return 'Ставка должна быть больше нуля.';
      default:
        return status === 401
          ? 'Войдите, чтобы отправить заявку'
          : 'Не удалось отправить заявку. Попробуйте позже.';
    }
  }

  inviteFieldError(name: string): string | null {
    const c = this.inviteForm.get(name);
    if (!c?.touched || !c.invalid) return null;
    if (c.hasError('required'))  return 'Обязательное поле';
    if (c.hasError('min'))       return `Минимум ${c.errors?.['min']?.min}`;
    if (c.hasError('max'))       return `Максимум ${c.errors?.['max']?.max}`;
    if (c.hasError('maxlength')) return `Максимум ${c.errors?.['maxlength']?.requiredLength} символов`;
    return null;
  }

  protected readonly getSpecializationLabel     = getSpecializationLabel;
  protected readonly formatExperienceRange      = formatExperienceRange;
  protected readonly getCollaborationTypeLabel  = getCollaborationTypeLabel;
}
