import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private readonly fb    = inject(FormBuilder);
  private readonly auth  = inject(AuthService);
  private readonly title = inject(Title);
  private readonly meta  = inject(Meta);

  readonly loading       = signal(false);
  readonly sent          = signal(false);
  readonly error         = signal<string | null>(null);
  readonly submittedEmail = signal('');

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    this.title.setTitle('Восстановление пароля — DevStart');
    this.meta.updateTag({ property: 'og:title', content: 'Восстановление пароля — DevStart' });
    this.meta.updateTag({ name: 'description', content: 'Сбросьте пароль от аккаунта DevStart по ссылке из письма.' });
  }

  get emailError(): string | null {
    const c = this.form.get('email');
    if (!c?.touched || !c.invalid) return null;
    if (c.hasError('required')) return 'Обязательное поле';
    if (c.hasError('email'))    return 'Некорректный email';
    return null;
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.error.set(null);
    this.loading.set(true);
    const email = this.form.getRawValue().email!;
    this.auth.forgotPassword(email).subscribe({
      next: () => {
        this.loading.set(false);
        this.submittedEmail.set(email);
        this.sent.set(true);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Не удалось отправить письмо. Попробуйте позже.');
      },
    });
  }
}
