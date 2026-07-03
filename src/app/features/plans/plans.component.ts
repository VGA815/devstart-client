import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { SubscriptionService } from '../../shared/services/subscription.service';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { CurrentSubscription } from '../../shared/models/subscription.model';

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [RouterLink, SkeletonComponent],
  templateUrl: './plans.component.html',
  styleUrl: './plans.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlansComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly billingSvc = inject(SubscriptionService);
  private readonly router = inject(Router);
  private readonly titleSvc = inject(Title);
  private readonly metaSvc = inject(Meta);

  readonly subscriptionLoading = signal(false);
  readonly checkoutLoading = signal(false);
  readonly subscription = signal<CurrentSubscription | null>(null);
  readonly subscriptionError = signal('');
  readonly checkoutError = signal('');
  readonly promoCode = signal('');

  readonly proFeatures = [
    'Скоринг DevStart по ключевым осям проекта',
    'Диапазон оценки стоимости стартапа',
    'Премиальные метрики: MRR, MAU, MoM Growth, LTV',
    'Быстрый переход к расширенной аналитике в карточках стартапов',
  ];

  readonly freeFeatures = [
    'Каталог стартапов, инвесторов и экспертов',
    'Публичные карточки проектов',
    'Подписка на обновления стартапов',
    'Базовые заявки и коммуникация',
  ];

  ngOnInit(): void {
    this.titleSvc.setTitle('Планы — DevStart');
    this.metaSvc.updateTag({
      name: 'description',
      content: 'Планы DevStart: Free для базовой работы и Pro для расширенной аналитики стартапов.',
    });

    if (this.auth.user()) {
      this.loadSubscription();
    }
  }

  checkout(): void {
    if (!this.auth.user()) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.checkoutLoading()) return;

    this.checkoutLoading.set(true);
    this.checkoutError.set('');

    const promoCode = this.promoCode().trim() || undefined;

    this.billingSvc.checkout(promoCode).subscribe({
      next: session => {
        if (session.confirmationUrl) {
          window.location.assign(session.confirmationUrl);
          return;
        }
        // A free promo activated the subscription without a payment redirect —
        // the return page confirms the Active status and shows the success state.
        if (session.activated) {
          this.router.navigate(['/billing/return']);
          return;
        }
        this.checkoutLoading.set(false);
        this.checkoutError.set('Не удалось открыть оплату. Попробуйте ещё раз.');
      },
      error: (err) => {
        this.checkoutLoading.set(false);
        this.checkoutError.set(checkoutErrorMessage(err?.error?.title));
        this.loadSubscription();
      },
    });
  }

  private loadSubscription(): void {
    this.subscriptionLoading.set(true);
    this.subscriptionError.set('');

    this.billingSvc.getCurrent().pipe(
      catchError(() => {
        this.subscriptionError.set('Не удалось загрузить статус подписки.');
        return of(null);
      })
    ).subscribe(subscription => {
      this.subscription.set(subscription);
      this.subscriptionLoading.set(false);
    });
  }

  formatSubscriptionDate(value: string | null): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(value));
  }
}

const PROMO_ERRORS: Record<string, string> = {
  'PromoCodes.InvalidCode':          'Промокод недействителен.',
  'PromoCodes.Inactive':             'Промокод больше не активен.',
  'PromoCodes.NotYetValid':          'Промокод ещё не начал действовать.',
  'PromoCodes.Expired':              'Срок действия промокода истёк.',
  'PromoCodes.GlobalLimitReached':   'Лимит использований промокода исчерпан.',
  'PromoCodes.AlreadyRedeemedByUser':'Вы уже использовали этот промокод.',
  'PromoCodes.PlanMismatch':         'Промокод не подходит для этого плана.',
};

function checkoutErrorMessage(title?: string): string {
  return (title && PROMO_ERRORS[title]) ?? 'Не удалось открыть оплату. Попробуйте ещё раз.';
}
