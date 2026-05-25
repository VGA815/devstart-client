import { Component, ChangeDetectionStrategy, inject, signal, Input, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb    = inject(FormBuilder);
  private readonly auth  = inject(AuthService);
  private readonly title = inject(Title);
  private readonly meta  = inject(Meta);

  // Bound from the ?token= query param (provideRouter withComponentInputBinding).
  @Input() token = '';

  readonly loading      = signal(false);
  readonly done         = signal(false);
  readonly invalidToken = signal(false);
  readonly error        = signal<string | null>(null);

  readonly form = this.fb.group({
    newPassword:     ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  get passwordMismatch(): boolean {
    const { newPassword, confirmPassword } = this.form.getRawValue();
    return !!confirmPassword && newPassword !== confirmPassword;
  }

  get newPasswordError(): string | null {
    const c = this.form.get('newPassword');
    if (!c?.touched || !c.invalid) return null;
    if (c.hasError('required'))  return 'Обязательное поле';
    if (c.hasError('minlength')) return 'Минимум 8 символов';
    return null;
  }

  ngOnInit(): void {
    this.title.setTitle('Новый пароль — DevStart');
    this.meta.updateTag({ property: 'og:title', content: 'Новый пароль — DevStart' });
    this.meta.updateTag({ name: 'description', content: 'Задайте новый пароль для входа в аккаунт DevStart.' });
    if (!this.token?.trim()) {
      this.invalidToken.set(true);
    }
  }

  submit(): void {
    if (this.form.invalid || this.passwordMismatch) { this.form.markAllAsTouched(); return; }
    this.error.set(null);
    this.loading.set(true);
    const newPassword = this.form.getRawValue().newPassword!;
    this.auth.resetPassword(this.token, newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.done.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.invalidToken.set(true);
        } else {
          this.error.set('Не удалось сбросить пароль. Попробуйте позже.');
        }
      },
    });
  }
}
