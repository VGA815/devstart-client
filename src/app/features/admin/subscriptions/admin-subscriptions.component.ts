import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { AdminService } from '../admin.service';
import {
  AdminSubscription,
  NpdIncomeStatus,
  PLAN_LABELS, SUBSCRIPTION_SOURCE_LABELS, SUBSCRIPTION_STATUS_LABELS,
} from '../admin.models';

type RowAction = 'extend' | 'revoke';

@Component({
  selector: 'app-admin-subscriptions',
  standalone: true,
  imports: [RouterLink, SkeletonComponent],
  templateUrl: './admin-subscriptions.component.html',
  styleUrl: '../admin-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSubscriptionsComponent implements OnInit {
  private readonly admin = inject(AdminService);

  readonly loading = signal(true);
  readonly error   = signal('');
  readonly subs    = signal<AdminSubscription[]>([]);

  readonly statusFilter = signal<string>('');
  readonly planFilter   = signal<string>('');

  // grant form (page-level, needs a userId)
  readonly grantOpen   = signal(false);
  readonly grantUserId = signal('');
  readonly grantDays   = signal('30');
  readonly grantReason = signal('');

  // per-row extend/revoke
  readonly rowAction = signal<{ id: string; action: RowAction } | null>(null);
  readonly extendDays = signal('30');
  readonly reason     = signal('');

  readonly busy        = signal(false);
  readonly actionError = signal('');

  // SC-42: статус годового лимита дохода НПД
  readonly npd        = signal<NpdIncomeStatus | null>(null);
  readonly npdLoading = signal(true);
  readonly npdError   = signal('');

  ngOnInit(): void {
    this.load();
    this.loadNpd();
  }

  loadNpd(): void {
    this.npdLoading.set(true);
    this.npdError.set('');

    this.admin.getNpdIncomeStatus().pipe(
      catchError(() => {
        this.npdError.set('Не удалось загрузить статус лимита НПД.');
        return of(null);
      })
    ).subscribe(status => {
      this.npd.set(status);
      this.npdLoading.set(false);
    });
  }

  /** Доля лимита, выбранная доходом, в процентах — для шкалы. Ограничена сотней. */
  npdPercent(status: NpdIncomeStatus): number {
    if (status.limit <= 0) return 0;
    return Math.min(100, Math.round((status.incomeToDate / status.limit) * 100));
  }

  formatRub(amount: number): string {
    return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount)} ₽`;
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.admin.getSubscriptions({
      status: this.statusFilter() === '' ? undefined : +this.statusFilter(),
      plan:   this.planFilter()   === '' ? undefined : +this.planFilter(),
      pageSize: 100,
    }).pipe(
      catchError(() => {
        this.error.set('Не удалось загрузить подписки.');
        return of([] as AdminSubscription[]);
      })
    ).subscribe(list => {
      this.subs.set(list);
      this.loading.set(false);
    });
  }

  openRowAction(sub: AdminSubscription, action: RowAction): void {
    this.rowAction.set({ id: sub.id, action });
    this.extendDays.set('30');
    this.reason.set('');
    this.actionError.set('');
  }

  submitRowAction(sub: AdminSubscription): void {
    const action = this.rowAction();
    const reason = this.reason().trim();
    if (!action || !reason || this.busy()) return;

    this.busy.set(true);
    this.actionError.set('');

    const done = () => {
      this.busy.set(false);
      this.rowAction.set(null);
      this.load();
    };
    const fail = (msg: string) => () => {
      this.busy.set(false);
      this.actionError.set(msg);
    };

    if (action.action === 'extend') {
      const days = parseInt(this.extendDays(), 10);
      if (!days || days <= 0) {
        this.busy.set(false);
        this.actionError.set('Количество дней должно быть положительным.');
        return;
      }
      this.admin.extendSubscription(sub.id, days, reason)
        .subscribe({ next: done, error: fail('Не удалось продлить подписку.') });
    } else {
      this.admin.revokeSubscription(sub.id, reason)
        .subscribe({ next: done, error: fail('Не удалось отозвать подписку.') });
    }
  }

  submitGrant(): void {
    const userId = this.grantUserId().trim();
    const reason = this.grantReason().trim();
    if (!userId || !reason || this.busy()) return;

    const daysRaw = this.grantDays().trim();
    const days = daysRaw ? parseInt(daysRaw, 10) : null;

    this.busy.set(true);
    this.actionError.set('');

    this.admin.grantSubscription(userId, days && !isNaN(days) ? days : null, reason).subscribe({
      next: () => {
        this.busy.set(false);
        this.grantOpen.set(false);
        this.grantUserId.set('');
        this.grantReason.set('');
        this.load();
      },
      error: () => {
        this.busy.set(false);
        this.actionError.set('Не удалось выдать подписку. Проверьте ID пользователя.');
      },
    });
  }

  planLabel(v: number): string   { return PLAN_LABELS[v] ?? String(v); }
  statusLabel(v: number): string { return SUBSCRIPTION_STATUS_LABELS[v] ?? String(v); }
  sourceLabel(v: number): string { return SUBSCRIPTION_SOURCE_LABELS[v] ?? String(v); }

  formatDate(value: string | null): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(new Date(value));
  }
}
