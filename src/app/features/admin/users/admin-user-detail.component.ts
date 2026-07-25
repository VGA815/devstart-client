import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { AuthService } from '../../../core/auth/auth.service';
import { AdminService } from '../admin.service';
import {
  AdminPayment, AdminUserDetail,
  PAYMENT_STATUS_LABELS, PLAN_LABELS, ROLE_LABELS,
  SUBSCRIPTION_SOURCE_LABELS, SUBSCRIPTION_STATUS_LABELS,
} from '../admin.models';

@Component({
  selector: 'app-admin-user-detail',
  standalone: true,
  imports: [RouterLink, SkeletonComponent],
  templateUrl: './admin-user-detail.component.html',
  styleUrl: '../admin-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUserDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly admin = inject(AdminService);
  private readonly auth  = inject(AuthService);

  readonly userId = this.route.snapshot.paramMap.get('id')!;

  readonly loading  = signal(true);
  readonly notFound = signal(false);
  readonly user     = signal<AdminUserDetail | null>(null);

  readonly payments        = signal<AdminPayment[]>([]);
  readonly paymentsLoading = signal(true);

  // grant subscription
  readonly grantOpen   = signal(false);
  readonly grantDays   = signal('30');
  readonly grantReason = signal('');
  readonly grantBusy   = signal(false);
  readonly grantError  = signal('');
  readonly grantOk     = signal(false);

  // refund
  readonly refundFor          = signal<string | null>(null);
  readonly refundAmount       = signal('');
  readonly refundProportional = signal(false);
  readonly refundBusy         = signal(false);
  readonly refundError        = signal('');

  // reset 2FA (backend forbids resetting your own — admins use self-service disable)
  readonly tfaOpen   = signal(false);
  readonly tfaReason = signal('');
  readonly tfaBusy   = signal(false);
  readonly tfaError  = signal('');
  readonly tfaOk     = signal(false);

  readonly isSelf = computed(() => this.auth.user()?.id === this.userId);

  ngOnInit(): void {
    this.loadUser();
    this.loadPayments();
  }

  private loadUser(): void {
    this.loading.set(true);
    this.admin.getUserDetail(this.userId).subscribe({
      next: u => {
        this.user.set(u);
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  private loadPayments(): void {
    this.paymentsLoading.set(true);
    this.admin.getUserPayments(this.userId).pipe(
      catchError(() => of([] as AdminPayment[]))
    ).subscribe(list => {
      this.payments.set(list);
      this.paymentsLoading.set(false);
    });
  }

  submitGrant(): void {
    const reason = this.grantReason().trim();
    if (!reason || this.grantBusy()) return;

    const daysRaw = this.grantDays().trim();
    const days = daysRaw ? parseInt(daysRaw, 10) : null;

    this.grantBusy.set(true);
    this.grantError.set('');
    this.grantOk.set(false);

    this.admin.grantSubscription(this.userId, days && !isNaN(days) ? days : null, reason).subscribe({
      next: () => {
        this.grantBusy.set(false);
        this.grantOk.set(true);
        this.grantOpen.set(false);
        this.loadUser();
      },
      error: () => {
        this.grantBusy.set(false);
        this.grantError.set('Не удалось выдать подписку.');
      },
    });
  }

  openRefund(p: AdminPayment): void {
    this.refundFor.set(p.id);
    this.refundAmount.set('');
    this.refundProportional.set(false);
    this.refundError.set('');
  }

  submitRefund(p: AdminPayment): void {
    if (this.refundBusy()) return;

    // Пропорциональный возврат считает бэк по остатку периода — свою сумму не передаём.
    const proportional = this.refundProportional() && this.canRefundProportionally(p);
    const raw = this.refundAmount().trim().replace(',', '.');
    const amount = raw ? Number(raw) : null;
    if (!proportional && raw && (isNaN(amount!) || amount! <= 0)) {
      this.refundError.set('Сумма должна быть положительным числом.');
      return;
    }

    this.refundBusy.set(true);
    this.refundError.set('');

    this.admin.refundPayment(p.id, proportional ? null : amount, proportional).subscribe({
      next: () => {
        this.refundBusy.set(false);
        this.refundFor.set(null);
        this.loadPayments();
      },
      error: (err: HttpErrorResponse) => {
        this.refundBusy.set(false);
        this.refundError.set(refundErrorMessage(err?.error?.title));
      },
    });
  }

  canRefund(p: AdminPayment): boolean {
    // Succeeded and not fully refunded yet
    return p.status === 1 && p.refundedAmount < p.amount;
  }

  /**
   * SC-48: пропорциональный возврат осмыслен только для подписки — бэк считает сумму от остатка
   * оплаченного периода. У платежа за разовую услугу периода нет, там только полный/частичный.
   */
  canRefundProportionally(p: AdminPayment): boolean {
    return p.purpose === 0 && p.subscriptionId !== null;
  }

  openTfaReset(): void {
    this.tfaOpen.set(true);
    this.tfaReason.set('');
    this.tfaError.set('');
    this.tfaOk.set(false);
  }

  submitTfaReset(): void {
    const reason = this.tfaReason().trim();
    if (reason.length < 3 || this.tfaBusy()) return;

    this.tfaBusy.set(true);
    this.tfaError.set('');

    this.admin.resetUserTwoFactor(this.userId, reason).subscribe({
      next: () => {
        this.tfaBusy.set(false);
        this.tfaOpen.set(false);
        this.tfaOk.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.tfaBusy.set(false);
        const title: string = err.error?.title ?? '';
        if (title === 'TwoFactor.NotEnabled' || err.status === 409) {
          this.tfaError.set('У этого пользователя 2FA не включена — сбрасывать нечего.');
        } else if (title === 'TwoFactor.CannotResetSelf') {
          this.tfaError.set('Нельзя сбросить 2FA самому себе — отключите её в настройках профиля.');
        } else if (err.status === 400) {
          this.tfaError.set('Укажите причину (от 3 до 1000 символов).');
        } else {
          this.tfaError.set('Не удалось сбросить 2FA. Попробуйте позже.');
        }
      },
    });
  }

  roleLabel(v: number): string    { return ROLE_LABELS[v] ?? String(v); }
  planLabel(v: number): string    { return PLAN_LABELS[v] ?? String(v); }
  subStatusLabel(v: number): string { return SUBSCRIPTION_STATUS_LABELS[v] ?? String(v); }
  sourceLabel(v: number): string  { return SUBSCRIPTION_SOURCE_LABELS[v] ?? String(v); }
  payStatusLabel(v: number): string { return PAYMENT_STATUS_LABELS[v] ?? String(v); }

  formatDate(value: string | null): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(new Date(value));
  }

  formatMoney(amount: number, currency: string): string {
    return `${new Intl.NumberFormat('ru-RU').format(amount)} ${currency === 'RUB' ? '₽' : currency}`;
  }

  purposeLabel(p: AdminPayment): string {
    return p.purpose === 1 ? 'Разовая услуга' : 'Подписка';
  }
}

const REFUND_ERRORS: Record<string, string> = {
  'Payments.NotRefundable':      'Вернуть можно только успешный платёж.',
  'Payments.RefundAmountInvalid':'Сумма превышает доступный к возврату остаток.',
  'Payments.CustomerEmailMissing':'У пользователя нет email — чек на возврат не сформировать.',
  'Payments.ProviderUnavailable':'Платёжный сервис временно недоступен. Попробуйте позже.',
};

function refundErrorMessage(title?: string): string {
  return (title && REFUND_ERRORS[title]) ?? 'Не удалось выполнить возврат.';
}
