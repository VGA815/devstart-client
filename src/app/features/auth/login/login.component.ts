import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { OAuthService } from '../../../core/auth/oauth.service';
import { captchaErrorMessage } from '../../../core/captcha/captcha-error';
import { OAuthProvider } from '../../../shared/models/dto/auth.dto';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb     = inject(FormBuilder);
  private readonly auth   = inject(AuthService);
  private readonly oauth  = inject(OAuthService);
  private readonly router = inject(Router);

  readonly loading      = this.auth.loading;
  readonly oauthLoading = signal<OAuthProvider | null>(null);
  readonly error        = signal<string | null>(null);

  readonly emailNotVerified = signal(false);
  readonly verifyEmail = signal('');
  readonly resending = signal(false);
  readonly resendSuccess = signal(false);
  readonly resendError = signal<string | null>(null);

  readonly form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  get emailError(): string | null {
    const c = this.form.get('email');
    if (!c?.touched || !c.invalid) return null;
    if (c.hasError('required')) return 'Обязательное поле';
    if (c.hasError('email'))    return 'Некорректный email';
    return null;
  }

  get passwordError(): string | null {
    const c = this.form.get('password');
    if (!c?.touched || !c.invalid) return null;
    if (c.hasError('required'))   return 'Обязательное поле';
    if (c.hasError('minlength'))  return 'Минимум 8 символов';
    return null;
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login({ email: email!, password: password! }).subscribe({
      next: (outcome) => {
        switch (outcome.kind) {
          case 'consent':        this.router.navigate(['/consent']);   break;
          case 'twoFactor':
          case 'twoFactorSetup': this.router.navigate(['/2fa']);       break;
          default:               this.router.navigate(['/dashboard']); break;
        }
      },
      error: (err: HttpErrorResponse) => {
        const captchaMsg = captchaErrorMessage(err);
        if (captchaMsg) { this.error.set(captchaMsg); return; }
        if (err.status === 403) {
          this.verifyEmail.set(email!);
          this.emailNotVerified.set(true);
        } else {
          this.error.set('Неверный email или пароль');
        }
      },
    });
  }

  resend(): void {
    if (this.resending()) return;
    this.resending.set(true);
    this.resendError.set(null);
    this.resendSuccess.set(false);
    this.auth.resendEmailVerification(this.verifyEmail()).subscribe({
      next: () => { this.resending.set(false); this.resendSuccess.set(true); },
      error: (err: unknown) => {
        this.resending.set(false);
        this.resendError.set(
          captchaErrorMessage(err) ?? 'Не удалось отправить письмо. Попробуйте позже.');
      },
    });
  }

  backToForm(): void {
    this.emailNotVerified.set(false);
    this.resendSuccess.set(false);
    this.resendError.set(null);
  }

  loginWith(provider: OAuthProvider): void {
    if (this.oauthLoading()) return;
    this.error.set(null);
    this.oauthLoading.set(provider);

    const redirectUri = this.oauth.buildRedirectUri(provider);
    this.oauth.start(provider, redirectUri).subscribe({
      next: res => { window.location.href = res.authorizationUrl; },
      error: (err: HttpErrorResponse) => {
        this.oauthLoading.set(null);
        this.error.set(
          captchaErrorMessage(err) ??
          (err.status === 0
            ? 'Сервис временно недоступен. Попробуйте позже.'
            : 'Не удалось начать вход через провайдер.')
        );
      },
    });
  }
}
