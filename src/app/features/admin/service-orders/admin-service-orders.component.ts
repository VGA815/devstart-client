import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { catchError, of } from 'rxjs';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { AdminService } from '../admin.service';
import {
  AdminServiceOrder,
  SERVICE_ORDER_STATUS_LABELS,
  SERVICE_TARGET_KIND_LABELS,
  SERVICE_TYPE_LABELS,
} from '../admin.models';

@Component({
  selector: 'app-admin-service-orders',
  standalone: true,
  imports: [SkeletonComponent],
  templateUrl: './admin-service-orders.component.html',
  styleUrl: '../admin-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminServiceOrdersComponent implements OnInit {
  private readonly admin = inject(AdminService);

  readonly loading = signal(true);
  readonly error   = signal('');
  readonly orders  = signal<AdminServiceOrder[]>([]);

  // filters ('' = без фильтра)
  readonly statusFilter      = signal('');
  readonly serviceTypeFilter = signal('');

  // row action
  readonly cancelOpen  = signal<string | null>(null);
  readonly cancelReason = signal('');
  readonly busy        = signal(false);
  readonly actionError = signal('');

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.admin.getServiceOrders({
      status:      this.statusFilter()      === '' ? undefined : +this.statusFilter(),
      serviceType: this.serviceTypeFilter() === '' ? undefined : +this.serviceTypeFilter(),
    }).pipe(
      catchError(() => {
        this.error.set('Не удалось загрузить заказы.');
        return of([] as AdminServiceOrder[]);
      })
    ).subscribe(list => {
      this.orders.set(list);
      this.loading.set(false);
    });
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.load();
  }

  onServiceTypeChange(value: string): void {
    this.serviceTypeFilter.set(value);
    this.load();
  }

  openCancel(order: AdminServiceOrder): void {
    this.cancelOpen.set(order.id);
    this.cancelReason.set('');
    this.actionError.set('');
  }

  closeCancel(): void {
    this.cancelOpen.set(null);
    this.cancelReason.set('');
  }

  /** Отменять уже возвращённый заказ нечего — деньги вернулись, доступ снят. */
  canCancel(order: AdminServiceOrder): boolean {
    return order.status !== 3 && order.status !== 4;
  }

  submitCancel(order: AdminServiceOrder): void {
    const reason = this.cancelReason().trim();
    if (!reason || this.busy()) {
      this.actionError.set('Укажите причину — она попадёт в аудит-лог.');
      return;
    }

    this.busy.set(true);
    this.actionError.set('');

    this.admin.cancelServiceOrder(order.id, reason).subscribe({
      next: () => {
        this.busy.set(false);
        this.closeCancel();
        this.load();
      },
      error: err => {
        this.busy.set(false);
        this.actionError.set(err?.error?.detail ?? 'Не удалось отменить заказ.');
      },
    });
  }

  serviceLabel(order: AdminServiceOrder): string {
    return SERVICE_TYPE_LABELS[order.serviceType] ?? `#${order.serviceType}`;
  }

  statusLabel(order: AdminServiceOrder): string {
    return SERVICE_ORDER_STATUS_LABELS[order.status] ?? `#${order.status}`;
  }

  targetKindLabel(order: AdminServiceOrder): string {
    return SERVICE_TARGET_KIND_LABELS[order.targetKind] ?? '—';
  }

  formatAmount(order: AdminServiceOrder): string {
    const amount = new Intl.NumberFormat('ru-RU').format(order.amount);
    return `${amount} ${order.currency === 'RUB' ? '₽' : order.currency}`;
  }

  formatDate(value: string | null): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date(value));
  }
}
