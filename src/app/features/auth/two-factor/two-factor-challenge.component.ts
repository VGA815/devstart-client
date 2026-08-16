import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService, AuthOutcome } from '../../../core/auth/auth.service';
import { captchaErrorMessage } from '../../../core/captcha/captcha-error';
import { QrCodeComponent } from '../../../shared/components/qr-code/qr-code.component';

/**
 * Second step of a 2FA-gated login. Two modes, chosen by the pending challenge:
 * - verify: the account has TOTP enabled — ask for a code (or a recovery code);
 * - setup:  mandatory enrollment (admins) — show QR + secret, confirm the first code,
 *           then show the one-time recovery codes before continuing.
 */
@Component({
  selector: 'app-two-factor-challenge',
  standalone: true,
  imports: [ReactiveFormsModule, QrCodeComponent],
  templateUrl: './two-factor-challenge.component.html',
  styleUrl: './two-factor-challenge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TwoFactorChallengeComponent implements OnInit {
  private readonly fb     = inject(FormBuilder);
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);
  private readonly title  = inject(Title);

  readonly mode        = signal<'verify' | 'setup'>('verify');
  readonly submitting  = this.auth.loading;
  readonly error       = signal<string | null>(null);

  // Setup mode: enrollment data, then the one-time recovery codes.
  readonly setupLoading  = signal(false);
  readonly otpAuthUri    = signal<string | null>(null);
  readonly secret        = signal<string | null>(null);
  readonly recoveryCodes = signal<string[] | null>(null);
  readonly codesCopied   = signal(false);

  // Where to go once the challenge chain is finished (tokens or consent may follow).
  private nextOutcome: AuthOutcome | null = null;

  // Unchecked by default, and shown unconditionally: this screen is pre-authentication, so reading
  // the account's 2FA policy here would leak per-account state to an anonymous caller. When the
  // policy is "код при каждом входе" the server simply ignores the flag.
  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6)]],
    rememberDevice: [false],
  });

  ngOnInit(): void {
    this.title.setTitle('Подтверждение входа — DevStart');

    const pending = this.auth.pendingTwoFactor();
    if (!pending) {
      // No challenge in memory (e.g. page reload) — restart the login.
      this.router.navigate(['/login']);
      return;
    }

    this.mode.set(pending.kind);
    if (pending.kind === 'setup') this.startSetup();
  }

  private startSetup(): void {
    this.setupLoading.set(true);
    this.auth.startTwoFactorLoginSetup().subscribe({
      next: res => {
        this.otpAuthUri.set(res.otpAuthUri);
        this.secret.set(res.secret);
        this.setupLoading.set(false);
      },
      error: () => {
        this.setupLoading.set(false);
        this.error.set('Не удалось начать настройку 2FA. Попробуйте войти ещё раз.');
      },
    });
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.submitting()) return;
    this.error.set(null);

    const { code: rawCode, rememberDevice } = this.form.getRawValue();
    const code = rawCode!.trim();
    const remember = rememberDevice ?? false;

    if (this.mode() === 'verify') {
      this.auth.verifyTwoFactor(code, remember).subscribe({
        next: outcome => this.continueWith(outcome),
        error: (err: HttpErrorResponse) => this.handleError(err),
      });
      return;
    }

    this.auth.confirmTwoFactorLoginSetup(code, remember).subscribe({
      next: ({ recoveryCodes, outcome }) => {
        // Park the outcome and show the codes — they are visible exactly once.
        this.nextOutcome = outcome;
        this.recoveryCodes.set(recoveryCodes);
      },
      error: (err: HttpErrorResponse) => this.handleError(err),
    });
  }

  proceed(): void {
    this.continueWith(this.nextOutcome ?? { kind: 'twoFactor' });
  }

  copyCodes(): void {
    const codes = this.recoveryCodes();
    if (!codes) return;
    navigator.clipboard.writeText(codes.join('\n')).then(() => {
      this.codesCopied.set(true);
      setTimeout(() => this.codesCopied.set(false), 2000);
    });
  }

  backToLogin(): void {
    this.auth.clearPendingTwoFactor();
    this.router.navigate(['/login']);
  }

  private continueWith(outcome: AuthOutcome): void {
    switch (outcome.kind) {
      case 'authenticated': this.router.navigate(['/dashboard']); break;
      case 'consent':       this.router.navigate(['/consent']);   break;
      default:              this.router.navigate(['/login']);     break;
    }
  }

  private handleError(err: HttpErrorResponse): void {
    // Проверяется первой: Captcha.Missing/Failed приходят с 400, который иначе был бы прочитан
    // как «неверный код» и отправил бы пользователя перенабирать правильный TOTP.
    const captchaMsg = captchaErrorMessage(err);
    if (captchaMsg) { this.error.set(captchaMsg); return; }

    const title: string = err.error?.title ?? '';
    if (err.status === 401 && title.includes('Pending')) {
      this.error.set('Сессия входа устарела. Войдите ещё раз.');
    } else if (err.status === 400 || err.status === 401) {
      this.error.set('Неверный код. Проверьте приложение-аутентификатор и попробуйте снова.');
    } else if (err.status === 429) {
      this.error.set('Слишком много попыток. Подождите немного и попробуйте снова.');
    } else {
      this.error.set('Не удалось подтвердить код. Попробуйте снова.');
    }
  }

  get codeError(): string | null {
    const c = this.form.get('code');
    if (!c?.touched || !c.invalid) return null;
    if (c.hasError('required'))  return 'Введите код';
    if (c.hasError('minlength')) return 'Код слишком короткий';
    return null;
  }
}
