import { ChangeDetectionStrategy, Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-email-confirmed',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './email-confirmed.component.html',
  styleUrl: './email-confirmed.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailConfirmedComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly title = inject(Title);

  @Input() status = '';

  readonly email = signal('');
  readonly resending = signal(false);
  readonly resendSuccess = signal(false);
  readonly resendError = signal<string | null>(null);

  get isSuccess(): boolean {
    return this.status === 'success';
  }

  ngOnInit(): void {
    this.title.setTitle(this.isSuccess ? 'Почта подтверждена — DevStart' : 'Подтверждение почты — DevStart');
    const current = this.auth.user()?.email;
    if (current) {
      this.email.set(current);
    }
  }

  resend(): void {
    const email = this.email().trim();
    if (!email || this.resending()) {
      return;
    }
    this.resending.set(true);
    this.resendError.set(null);
    this.resendSuccess.set(false);
    this.auth.resendEmailVerification(email).subscribe({
      next: () => {
        this.resending.set(false);
        this.resendSuccess.set(true);
      },
      error: () => {
        this.resending.set(false);
        this.resendError.set('Не удалось отправить письмо. Попробуйте позже.');
      },
    });
  }
}
