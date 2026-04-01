import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { OAuthService } from '../../../core/auth/oauth.service';
import { OAuthProvider } from '../../../shared/models/dto/auth.dto';
import { ConsentService } from '../../../core/consents/consent.service';
import { ConsentItemDto, ConsentVersionsDto } from '../../../shared/models/dto/consent.dto';

type Role = 'founder' | 'investor' | 'expert';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly auth   = inject(AuthService);
  private readonly oauth  = inject(OAuthService);
  private readonly router = inject(Router);
  private readonly consentService = inject(ConsentService);

  readonly loading      = this.auth.loading;
  readonly oauthLoading = signal<OAuthProvider | null>(null);
  readonly error        = signal<string | null>(null);
  readonly selectedRole = signal<Role>('founder');
  readonly consentVersions = signal<ConsentVersionsDto | null>(null);

  readonly registered = signal(false);
  readonly verifyEmail = signal('');
  readonly resending = signal(false);
  readonly resendSuccess = signal(false);
  readonly resendError = signal<string | null>(null);

  readonly form = this.fb.group({
    name:            [''],
    username:        ['', [Validators.required, Validators.minLength(3)]],
    email:           ['', [Validators.required, Validators.email]],
    password:        ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    consentPersonal: [false, [Validators.requiredTrue]],
    consentPrivacy:  [false, [Validators.requiredTrue]],
    consentTerms:    [false, [Validators.requiredTrue]],
    consentCookies:  [false],
  });

  ngOnInit(): void {
    this.consentService.getVersions().subscribe({
      next: v => this.consentVersions.set(v),
      error: () => this.error.set('Не удалось загрузить версии документов. Обновите страницу.'),
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

  get confirmError(): string | null {
    const pw = this.form.get('password')?.value;
    const cp = this.form.get('confirmPassword');
    if (!cp?.touched) return null;
    if (!cp.value) return 'Обязательное поле';
    if (pw !== cp.value) return 'Пароли не совпадают';
    return null;
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

  setRole(role: Role): void {
    this.selectedRole.set(role);
    if (role === 'investor') { this.router.navigate(['/register/investor']); }
    if (role === 'expert')   { this.router.navigate(['/register/expert']);   }
  }

  submit(): void {
    if (this.form.invalid || this.confirmError) {
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
      { type: 1, document_version: versions.privacy_policy,          accepted: true },
      { type: 2, document_version: versions.terms_of_service,        accepted: true },
      { type: 3, document_version: versions.cookies,                 accepted: !!v.consentCookies },
    ];
    this.auth.register({
      email:              v.email!,
      username:           v.username!,
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

  signupWith(provider: OAuthProvider): void {
    if (this.oauthLoading()) return;
    this.error.set(null);
    this.oauthLoading.set(provider);

    const redirectUri = this.oauth.buildRedirectUri(provider);
    this.oauth.start(provider, redirectUri).subscribe({
      next: res => { window.location.href = res.authorizationUrl; },
      error: (err: HttpErrorResponse) => {
        this.oauthLoading.set(null);
        this.error.set(
          err.status === 0
            ? 'Сервис временно недоступен. Попробуйте позже.'
            : 'Не удалось начать регистрацию через провайдер.'
        );
      },
    });
  }
}
