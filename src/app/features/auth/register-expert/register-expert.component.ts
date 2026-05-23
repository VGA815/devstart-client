import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { ConsentService } from '../../../core/consents/consent.service';
import { ConsentItemDto, ConsentVersionsDto } from '../../../shared/models/dto/consent.dto';

@Component({
  selector: 'app-register-expert',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register-expert.component.html',
  styleUrl: './register-expert.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterExpertComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly consentService = inject(ConsentService);

  readonly loading = this.auth.loading;
  readonly error = signal<string | null>(null);
  readonly consentVersions = signal<ConsentVersionsDto | null>(null);

  readonly registered = signal(false);
  readonly verifyEmail = signal('');
  readonly resending = signal(false);
  readonly resendSuccess = signal(false);
  readonly resendError = signal<string | null>(null);

  readonly form = this.fb.group({
    name:           ['', [Validators.required]],
    email:          ['', [Validators.required, Validators.email]],
    password:       ['', [Validators.required, Validators.minLength(8)]],
    specialization: [''],
    experience:     [''],
    expertise:      [''],
    bio:            [''],
    consentPersonal: [false, [Validators.requiredTrue]],
    consentPrivacy:  [false, [Validators.requiredTrue]],
    consentTerms:    [false, [Validators.requiredTrue]],
    consentOffer:    [false, [Validators.requiredTrue]],
    consentCookies:  [false],
  });

  ngOnInit(): void {
    this.consentService.getVersions().subscribe({
      next: v => this.consentVersions.set(v),
      error: () => this.error.set('Не удалось загрузить версии документов. Обновите страницу.'),
    });
  }

  resend(): void {
    if (this.resending()) return;
    this.resending.set(true);
    this.resendError.set(null);
    this.resendSuccess.set(false);
    this.auth.resendEmailVerification(this.verifyEmail()).subscribe({
      next: () => { this.resending.set(false); this.resendSuccess.set(true); },
      error: () => {
        this.resending.set(false);
        this.resendError.set('Не удалось отправить письмо. Попробуйте позже.');
      },
    });
  }

  fieldError(name: string): string | null {
    const c = this.form.get(name);
    if (!c?.touched || !c.invalid) return null;
    if (c.hasError('required'))  return 'Обязательное поле';
    if (c.hasError('email'))     return 'Некорректный email';
    if (c.hasError('minlength')) return `Минимум ${c.errors?.['minlength']?.requiredLength} символов`;
    return null;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const versions = this.consentVersions();
    if (!versions) {
      this.error.set('Не удалось загрузить версии документов. Обновите страницу.');
      return;
    }
    this.error.set(null);
    const v = this.form.getRawValue();
    const consents: ConsentItemDto[] = [
      { type: 0, document_version: versions.personal_data_processing, accepted: true },
      { type: 1, document_version: versions.privacy_policy,           accepted: true },
      { type: 2, document_version: versions.terms_of_service,         accepted: true },
      { type: 4, document_version: versions.offer_agreement,          accepted: true },
      { type: 3, document_version: versions.cookies,                  accepted: !!v.consentCookies },
    ];

    
    this.auth.register({
      email:              v.email!,
      username:           v.email!.split('@')[0],
      password:           v.password!,
      name:               v.name || undefined,
      social_media_links: [],
      is_public:          true,
      consents,
    }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err: HttpErrorResponse) => {
        if (err.status === 403) {
          this.verifyEmail.set(v.email!);
          this.registered.set(true);
        } else {
          this.error.set('Ошибка регистрации. Попробуйте снова.');
        }
      },
    });
  }
}
