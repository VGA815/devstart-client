import { Component, ChangeDetectionStrategy, inject, signal, OnInit, Input } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { OAuthService } from '../../../core/auth/oauth.service';
import { AuthService } from '../../../core/auth/auth.service';
import { OAuthProvider } from '../../../shared/models/dto/auth.dto';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './oauth-callback.component.html',
  styleUrl: './oauth-callback.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OAuthCallbackComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly oauth  = inject(OAuthService);
  private readonly auth   = inject(AuthService);


  @Input() provider!: OAuthProvider;

  readonly status = signal<'pending' | 'success' | 'error'>('pending');
  readonly error  = signal<string | null>(null);

  readonly providerLabel = signal('');

  ngOnInit(): void {
    this.providerLabel.set(this.provider === 'google' ? 'Google' : 'GitHub');

    const code  = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state');
    const oauthError = this.route.snapshot.queryParamMap.get('error');

    if (oauthError) {
      this.fail('Провайдер отменил вход или вернул ошибку.');
      return;
    }
    if (!code || !state) {
      this.fail('Некорректный ответ провайдера: отсутствуют параметры code / state.');
      return;
    }
    if (this.provider !== 'google' && this.provider !== 'github') {
      this.fail('Неизвестный провайдер OAuth.');
      return;
    }

    this.oauth.handleCallback(this.provider, code, state).subscribe({
      next: pair => {
        this.auth.completeSession(pair).subscribe({
          next: () => {
            this.status.set('success');
            setTimeout(() => this.router.navigate(['/dashboard']), 600);
          },
          error: () => this.fail('Не удалось загрузить данные пользователя.'),
        });
      },
      error: (err: HttpErrorResponse) => this.fail(mapErrorMessage(err)),
    });
  }

  private fail(message: string): void {
    this.status.set('error');
    this.error.set(message);
  }
}

function mapErrorMessage(err: HttpErrorResponse): string {
  const code = err.error?.code ?? err.error?.error?.code ?? '';
  switch (code) {
    case 'EmailMatchesUnverifiedAccount':
      return 'Аккаунт с таким email уже существует, но email не подтверждён. ' +
             'Войдите паролем и привяжите этот аккаунт в настройках.';
    case 'AlreadyLinkedToAnotherUser':
      return 'Этот внешний аккаунт уже привязан к другому пользователю.';
    case 'Invalid':
    case 'Expired':
      return 'Сессия авторизации устарела. Попробуйте войти ещё раз.';
    default:
      return 'Не удалось завершить вход. Попробуйте снова.';
  }
}
