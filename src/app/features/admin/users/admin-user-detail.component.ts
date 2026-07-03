import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
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
  readonly refundFor    = signal<string | null>(null);
  readonly refundAmount = signal('');
  readonly refundBusy   = signal(false);
  readonly refundError  = signal('');

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
    this.refundError.set('');
  }

  submitRefund(p: AdminPayment): void {
    if (this.refundBusy()) return;

    const raw = this.refundAmount().trim().replace(',', '.');
    const amount = raw ? Number(raw) : null;
    if (raw && (isNaN(amount!) || amount! <= 0)) {
      this.refundError.set('Сумма должна быть положительным числом.');
      return;
    }

    this.refundBusy.set(true);
    this.refundError.set('');

    this.admin.refundPayment(p.id, amount).subscribe({
      next: () => {
        this.refundBusy.set(false);
        this.refundFor.set(null);
        this.loadPayments();
      },
      error: () => {
        this.refundBusy.set(false);
        this.refundError.set('Не удалось выполнить возврат.');
      },
    });
  }

  canRefund(p: AdminPayment): boolean {
    // Succeeded and not fully refunded yet
    return p.status === 1 && p.refundedAmount < p.amount;
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
}
